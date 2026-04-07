#!/usr/bin/env node
/**
 * Live demo orchestrator.
 *
 * Brings up the full stack (backend + frontend) and exposes the frontend
 * via an ngrok tunnel for live cross-browser, cross-network demos.
 *
 * Smart reuse: if the backend or frontend is already running on its port,
 * the script connects to the existing process instead of trying to start a
 * duplicate. Cleanup only kills processes that this script started — your
 * existing dev servers keep running after Ctrl+C.
 *
 * Authtoken resolution (in order):
 *   1. NGROK_AUTHTOKEN environment variable
 *   2. The standalone ngrok CLI config file:
 *        macOS: ~/Library/Application Support/ngrok/ngrok.yml
 *        Linux: ~/.config/ngrok/ngrok.yml
 *      (the file written by `ngrok config add-authtoken <token>`)
 *
 * Note: the @ngrok/ngrok Node SDK is a separate Rust binary embedded in
 * the Node module. It does NOT automatically read the standalone CLI's
 * config file or the NGROK_AUTHTOKEN env var by default — this script
 * resolves the token explicitly and passes it to ngrok.forward().
 *
 * Usage:
 *   npm run demo
 */

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { readFile } from 'node:fs/promises';
import { homedir, platform } from 'node:os';
import * as ngrok from '@ngrok/ngrok';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FRONTEND_DIR = resolve(__dirname, '..');
const BACKEND_DIR = resolve(FRONTEND_DIR, '..', 'backend');

const BACKEND_PORT = 8080;
const FRONTEND_PORT = parseInt(process.env.VITE_PORT || '5173', 10);
const BACKEND_HEALTH_URL = `http://localhost:${BACKEND_PORT}/api/users`;
const FRONTEND_HEALTH_URL = `http://localhost:${FRONTEND_PORT}/`;

const HEALTH_TIMEOUT_MS = 120_000;
const HEALTH_INTERVAL_MS = 1500;
const CLEANUP_HARD_DEADLINE_MS = 5000;
const SIGTERM_GRACE_MS = 1000;
const NGROK_DISCONNECT_TIMEOUT_MS = 2000;

const children = [];
let tunnelListener = null;
let keepaliveTimer = null;
let cleaningUp = false;
let interruptCount = 0;

function log(prefix, message) {
  process.stdout.write(`${prefix} ${message}\n`);
}

async function isPortInUse(port) {
  try {
    await fetch(`http://localhost:${port}/`, {
      signal: AbortSignal.timeout(1000),
    });
    return true;
  } catch {
    return false;
  }
}

async function waitForUrl(url, label) {
  const deadline = Date.now() + HEALTH_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        log('✓', `${label} is up`);
        return;
      }
    } catch {
      // not ready yet
    }
    await sleep(HEALTH_INTERVAL_MS);
  }
  throw new Error(`${label} did not become ready within ${HEALTH_TIMEOUT_MS / 1000}s`);
}

function spawnChild(label, command, args, options) {
  log('▶', `starting ${label}: ${command} ${args.join(' ')}`);
  const child = spawn(command, args, {
    stdio: ['ignore', 'inherit', 'inherit'],
    detached: true,
    ...options,
  });
  children.push({ label, child });
  child.on('exit', (code, signal) => {
    if (!cleaningUp) {
      log('◼', `${label} exited unexpectedly (code=${code}, signal=${signal})`);
      cleanup(1);
    }
  });
  return child;
}

function ngrokConfigPaths() {
  const home = homedir();
  if (platform() === 'darwin') {
    return [
      join(home, 'Library', 'Application Support', 'ngrok', 'ngrok.yml'),
      join(home, '.config', 'ngrok', 'ngrok.yml'),
    ];
  }
  return [join(home, '.config', 'ngrok', 'ngrok.yml')];
}

async function resolveNgrokAuthtoken() {
  if (process.env.NGROK_AUTHTOKEN) {
    return { token: process.env.NGROK_AUTHTOKEN, source: 'NGROK_AUTHTOKEN env var' };
  }
  for (const path of ngrokConfigPaths()) {
    try {
      const content = await readFile(path, 'utf-8');
      const match = content.match(/^\s*authtoken:\s*["']?([^\s"']+)["']?\s*$/m);
      if (match?.[1]) {
        return { token: match[1], source: path };
      }
    } catch {
      // file does not exist or is unreadable, try the next candidate
    }
  }
  return null;
}

async function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
    ),
  ]);
}

async function cleanup(exitCode = 0) {
  if (cleaningUp) return;
  cleaningUp = true;
  log('🧹', 'shutting down...');

  if (keepaliveTimer) {
    clearInterval(keepaliveTimer);
    keepaliveTimer = null;
  }

  // Hard deadline: no matter what hangs below, force exit after this timeout.
  const hardKillTimer = setTimeout(() => {
    log('⚠', `cleanup exceeded ${CLEANUP_HARD_DEADLINE_MS}ms — forcing exit`);
    process.exit(exitCode || 1);
  }, CLEANUP_HARD_DEADLINE_MS);
  hardKillTimer.unref();

  if (tunnelListener) {
    try {
      await withTimeout(ngrok.disconnect(), NGROK_DISCONNECT_TIMEOUT_MS, 'ngrok.disconnect');
      log('  ·', 'ngrok tunnel closed');
    } catch (err) {
      log('  ·', `failed to close ngrok tunnel: ${err.message}`);
    }
  }

  for (const { label, child } of children) {
    if (child.killed || child.exitCode !== null) continue;
    try {
      // Negative pid kills the entire process group (gradle forks JVMs).
      process.kill(-child.pid, 'SIGTERM');
      log('  ·', `sent SIGTERM to ${label} (pgid ${child.pid})`);
    } catch {
      // Process may already be gone, or no process group exists.
      try {
        child.kill('SIGTERM');
      } catch {
        // give up
      }
    }
  }

  // Give children a brief moment to shut down cleanly.
  await sleep(SIGTERM_GRACE_MS);

  // Force-kill anything that's still alive.
  for (const { label, child } of children) {
    if (child.killed || child.exitCode !== null) continue;
    try {
      process.kill(-child.pid, 'SIGKILL');
      log('  ·', `force-killed ${label}`);
    } catch {
      // gone
    }
  }

  process.exit(exitCode);
}

function handleInterrupt() {
  interruptCount += 1;
  if (interruptCount >= 2) {
    log('⚠', 'second interrupt received — exiting immediately');
    process.exit(130);
  }
  cleanup(0);
}

process.on('SIGINT', handleInterrupt);
process.on('SIGTERM', handleInterrupt);
process.on('uncaughtException', (err) => {
  log('✗', `uncaught error: ${err.message}`);
  cleanup(1);
});

async function ensureBackend() {
  if (await isPortInUse(BACKEND_PORT)) {
    log('•', `backend already running on ${BACKEND_PORT}, reusing existing process`);
    return false;
  }
  // --no-daemon is critical: gradle's daemon runs in its own process group and
  // survives SIGTERM to the wrapper, leaving a zombie JVM holding port 8080.
  // With --no-daemon the JVM is a direct child of the wrapper script and gets
  // cleaned up when we kill the wrapper's process group.
  spawnChild('backend', './gradlew', ['--no-daemon', 'bootRun'], { cwd: BACKEND_DIR });
  await waitForUrl(BACKEND_HEALTH_URL, 'backend');
  return true;
}

async function ensureFrontend() {
  if (await isPortInUse(FRONTEND_PORT)) {
    log('•', `frontend already running on ${FRONTEND_PORT}, reusing existing process`);
    return false;
  }
  spawnChild('frontend', 'npx', ['vite'], { cwd: FRONTEND_DIR });
  await waitForUrl(FRONTEND_HEALTH_URL, 'frontend');
  return true;
}

async function startTunnel(authtoken) {
  log('🌐', `starting ngrok tunnel against http://localhost:${FRONTEND_PORT}...`);
  try {
    return await ngrok.forward({ addr: FRONTEND_PORT, authtoken });
  } catch (err) {
    // ngrok.forward errors are often opaque (e.g. "ERR_NGROK_108: account
    // limited to 1 simultaneous tunnel"). Surface the message and the most
    // common causes so the user can act without grepping ngrok docs.
    const message = err?.message || String(err);
    throw new Error(
      [
        `ngrok.forward failed: ${message}`,
        '',
        'Common causes:',
        '  • A previous tunnel from this account is still open. Visit',
        '    https://dashboard.ngrok.com/agents to revoke stale agents,',
        '    or run `pkill -f ngrok` to clear local agents.',
        '  • Invalid or expired authtoken. Re-run `ngrok config add-authtoken <token>`.',
        '  • Network or firewall blocking outbound connections to ngrok.',
      ].join('\n'),
    );
  }
}

async function main() {
  log('━', 'resolving ngrok authtoken');
  const auth = await resolveNgrokAuthtoken();
  if (!auth) {
    throw new Error(
      [
        'no ngrok authtoken found.',
        'Set one of the following before running npm run demo:',
        '  1. export NGROK_AUTHTOKEN=<your-token>',
        '  2. ngrok config add-authtoken <your-token>',
        'Get your token at https://dashboard.ngrok.com/get-started/your-authtoken',
      ].join('\n     '),
    );
  }
  log('🔑', `authtoken loaded from ${auth.source}`);

  log('━', 'bringing up the stack');
  const startedBackend = await ensureBackend();
  const startedFrontend = await ensureFrontend();

  if (!startedBackend && !startedFrontend) {
    log('•', 'tunnel-only mode — both apps were already running, npm run demo will only manage ngrok');
  }

  tunnelListener = await startTunnel(auth.token);

  const url = tunnelListener.url();
  process.stdout.write('\n');
  process.stdout.write('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  process.stdout.write(`  Demo is live\n`);
  process.stdout.write(`  Public URL:     ${url}\n`);
  process.stdout.write(`  Local frontend: http://localhost:${FRONTEND_PORT}\n`);
  process.stdout.write(`  Backend:        http://localhost:${BACKEND_PORT}\n`);
  process.stdout.write('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  process.stdout.write('\nPress Ctrl+C to stop everything (press twice for immediate exit).\n');
  process.stdout.write(
    '(Reused processes — backend or frontend you started yourself — will be left running.)\n\n',
  );

  // Keep the Node event loop alive while the tunnel runs. The @ngrok/ngrok
  // SDK does not register a libuv handle of its own, and `await new Promise`
  // is just a microtask — neither keeps Node from exiting once spawned
  // children (if any) are gone. A long-period setInterval is the standard
  // idiom for "stay alive until SIGINT". This was the bug behind the earlier
  // "tunnel opens then immediately dies / ERR_NGROK_3200" symptom in
  // tunnel-only mode (no children to keep the loop alive).
  keepaliveTimer = setInterval(() => {}, 1 << 30);
}

main().catch((err) => {
  log('✗', `demo failed to start: ${err.message}`);
  cleanup(1);
});
