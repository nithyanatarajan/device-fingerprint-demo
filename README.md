# Device Identification Management Platform

A full-stack device fingerprinting and identification management platform built with AI-assisted development.

## Documentation

- [`SPEC.md`](SPEC.md) — formal product specification
- [`docs/how-it-works.md`](docs/how-it-works.md) — end-to-end mental model: the "two voices" architecture, what each phase does, why each signal is included or excluded from the hash, scenario reference, and the false positive trade-off

## Tech Stack

- **Backend:** Java 25 + Spring Boot 4 + Gradle
- **Frontend:** React 19.2.4 + Material UI + Vite
- **Database:** H2 (embedded)

## Prerequisites

- Java 25
- Node.js 22+
- Gradle 9.0+

## Getting Started

### Backend

```bash
cd backend
./gradlew bootRun
```

Backend runs on `http://localhost:8080`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173` and proxies API requests to the backend.

### Seed Data

To populate the database with synthetic users and devices:

```bash
cd backend
SEED_DATA=true ./gradlew bootRun
```

### Live demo via ngrok

For a real cross-browser, cross-network demo, the local stack can be exposed via an ngrok tunnel using the bundled orchestration script. This is the only way to exercise Phase 2's IP-tier behaviour from outside `localhost` (loopback traffic doesn't traverse a VPN, so curl-against-localhost can't simulate IP-tier transitions).

**One-time setup:**
1. Sign up for a free ngrok account at <https://dashboard.ngrok.com/signup>.
2. Install and authenticate the CLI as described at <https://dashboard.ngrok.com/get-started/setup/macos> (or your platform). This writes a config file the SDK reads automatically (`~/Library/Application Support/ngrok/ngrok.yml` on macOS, `~/.config/ngrok/ngrok.yml` on Linux).
3. Verify with `ngrok config check` — should print `Valid configuration file`.

**Running the demo:**
```bash
cd frontend
npm install        # one-time, if not already done
npm run demo
```

The script:
1. Resolves the ngrok authtoken from `NGROK_AUTHTOKEN` env var, or falls back to parsing the standalone CLI config file (`~/Library/Application Support/ngrok/ngrok.yml` on macOS, `~/.config/ngrok/ngrok.yml` on Linux)
2. Brings up the backend (`./gradlew bootRun`) and the frontend dev server (`vite`) — **but skips either if it's already running on its port**, so you can keep your existing dev servers and just expose them via the tunnel
3. Starts an ngrok tunnel pointing at the frontend port
4. Prints the public URL — open it in any browser, hand it to anyone, switch VPN on/off between visits to see Phase 2's `SAME_MACHINE` ↔ `MATCHING_HARDWARE` chip transition

Press `Ctrl+C` to tear everything down cleanly. Only processes the script started are killed; existing dev servers you started yourself keep running.

> **Note on the SDK and the CLI config file:** the `@ngrok/ngrok` Node SDK is a separate Rust binary embedded in the Node module — it does *not* automatically read the standalone `ngrok` CLI's config file. The demo script reads the file itself and passes the token explicitly, so `ngrok config add-authtoken <token>` is sufficient and you do not also need to set `NGROK_AUTHTOKEN`.

## Testing

### Backend

```bash
cd backend
./gradlew build    # runs spotless, checkstyle, tests, coverage
```

### Frontend

```bash
cd frontend
npm run check          # lint + format check
npm run fix            # auto-fix lint + format
npm test               # Vitest unit tests
npm run test:coverage  # with coverage
npm run ci             # full CI: check + build + test:coverage
```

#### End-to-end tests (Playwright)

E2E tests exercise the full flow: browser → FingerprintJS → backend. They require the backend to be running:

```bash
# Terminal 1
cd backend && ./gradlew bootRun

# Terminal 2
cd frontend
npx playwright install chromium        # one-time browser install
npm run test:e2e                       # runs against chromium (default)
npm run test:e2e:all                   # runs across chromium + firefox + webkit
npm run test:e2e -- --project=firefox  # single non-default browser
```

##### Debugging E2E failures

```bash
npm run test:e2e -- --headed           # watch the browser run
npm run test:e2e -- --debug            # step through with Playwright Inspector
npm run test:e2e -- --ui               # interactive UI mode (best DX)

npx playwright show-report             # open the HTML report from the last run
npx playwright show-trace test-results/<name>/trace.zip  # view a recorded trace
```

On failure, the config automatically captures: trace (timeline + DOM snapshots + network), screenshot, and video. They land in `test-results/` and `playwright-report/`.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SERVER_PORT` | `8080` | Backend server port |
| `SEED_DATA` | `false` | Enable synthetic data seeding |
| `VITE_API_URL` | `http://localhost:8080` | Backend URL for frontend proxy |
| `VITE_PORT` | `5173` | Frontend dev server port |
| `NGROK_AUTHTOKEN` | *(read from ngrok config file)* | Optional override for the ngrok auth token used by `npm run demo`. The script also accepts the token from the standard ngrok config file written by `ngrok config add-authtoken`. |
