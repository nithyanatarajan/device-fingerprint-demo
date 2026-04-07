import FingerprintJS from '@fingerprintjs/fingerprintjs';

export class FingerprintBlockedError extends Error {
  constructor(cause) {
    super(
      'Device fingerprinting library could not be loaded. It may be blocked by a privacy extension.',
    );
    this.name = 'FingerprintBlockedError';
    this.cause = cause;
  }
}

const SUPPORTED_CODECS = [
  'video/webm;codecs=vp8',
  'video/webm;codecs=vp9',
  'video/webm;codecs=h264',
  'audio/webm;codecs=opus',
  'video/mp4;codecs=h264',
];

function getCodecSupport() {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) {
    return '';
  }
  return SUPPORTED_CODECS.filter((codec) => MediaRecorder.isTypeSupported(codec)).join(',');
}

function hashString(input) {
  if (input == null) return '';
  const str = String(input);
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function extractCanvasHash(component) {
  if (!component?.value) return '';
  const { winding, geometry, text } = component.value;
  return hashString(`${winding}|${geometry}|${text}`);
}

function extractWebglRenderer(component) {
  const value = component?.value;
  if (!value || typeof value !== 'object') return '';
  return value.rendererUnmasked || value.renderer || '';
}

function extractTouchSupport(component) {
  const value = component?.value;
  if (typeof value === 'number') return value;
  if (value && typeof value === 'object' && typeof value.maxTouchPoints === 'number') {
    return value.maxTouchPoints;
  }
  return navigator.maxTouchPoints ?? 0;
}

function extractScreenResolution(component) {
  const value = component?.value;
  if (Array.isArray(value) && value.length === 2 && value[0] && value[1]) {
    return `${value[0]}x${value[1]}`;
  }
  return `${screen.width}x${screen.height}`;
}

function extractNumber(component, fallback) {
  const value = component?.value;
  return typeof value === 'number' ? value : (fallback ?? null);
}

function extractString(component, fallback) {
  const value = component?.value;
  return typeof value === 'string' && value ? value : (fallback ?? '');
}

function buildSignals(components) {
  return {
    canvasHash: extractCanvasHash(components.canvas),
    webglRenderer: extractWebglRenderer(components.webGlBasics),
    screenResolution: extractScreenResolution(components.screenResolution),
    colorDepth: extractNumber(components.colorDepth, screen.colorDepth),
    pixelRatio: window.devicePixelRatio ?? null,
    timezone: extractString(components.timezone, Intl.DateTimeFormat().resolvedOptions().timeZone),
    locale: navigator.language || '',
    platform: extractString(components.platform, navigator.platform || ''),
    userAgent: navigator.userAgent,
    hardwareConcurrency: extractNumber(
      components.hardwareConcurrency,
      navigator.hardwareConcurrency ?? null,
    ),
    deviceMemory: extractNumber(components.deviceMemory, navigator.deviceMemory ?? null),
    touchSupport: extractTouchSupport(components.touchSupport),
    codecSupport: getCodecSupport(),
    dntEnabled: navigator.doNotTrack === '1',
    cookieEnabled: navigator.cookieEnabled,
  };
}

export async function collectSignals() {
  let agent;
  try {
    agent = await FingerprintJS.load();
  } catch (err) {
    throw new FingerprintBlockedError(err);
  }
  const result = await agent.get();
  return buildSignals(result.components);
}

export const __test__ = { buildSignals, hashString };
