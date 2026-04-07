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

const FONT_PROBE_LIST = [
  // Common system fonts (cross-OS)
  'Arial',
  'Arial Black',
  'Arial Narrow',
  'Arial Rounded MT Bold',
  'Helvetica',
  'Helvetica Neue',
  'Times',
  'Times New Roman',
  'Courier',
  'Courier New',
  'Verdana',
  'Georgia',
  'Palatino',
  'Garamond',
  'Bookman',
  'Comic Sans MS',
  'Trebuchet MS',
  'Impact',
  'Tahoma',
  'Lucida Console',
  'Lucida Sans Unicode',
  'MS Sans Serif',
  'MS Serif',

  // macOS-specific
  'San Francisco',
  'SF Pro',
  'SF Pro Display',
  'SF Pro Text',
  'SF Mono',
  'Menlo',
  'Monaco',
  'Andale Mono',
  'Apple Chancery',
  'Apple SD Gothic Neo',
  'Avenir',
  'Avenir Next',
  'Baskerville',
  'Big Caslon',
  'Brush Script MT',
  'Chalkboard',
  'Chalkduster',
  'Cochin',
  'Copperplate',
  'Didot',
  'Futura',
  'Geneva',
  'Gill Sans',
  'Hoefler Text',
  'Marker Felt',
  'Optima',
  'Papyrus',
  'Skia',
  'Snell Roundhand',
  'Zapfino',

  // Windows-specific
  'Calibri',
  'Cambria',
  'Candara',
  'Consolas',
  'Constantia',
  'Corbel',
  'Franklin Gothic Medium',
  'Gabriola',
  'Lucida Sans',
  'Microsoft Sans Serif',
  'Segoe UI',
  'Segoe Print',
  'Segoe Script',
  'Sylfaen',
  'Symbol',
  'Webdings',
  'Wingdings',

  // Linux-common
  'DejaVu Sans',
  'DejaVu Serif',
  'DejaVu Sans Mono',
  'Liberation Sans',
  'Liberation Serif',
  'Liberation Mono',
  'Ubuntu',
  'Ubuntu Mono',
  'Cantarell',

  // Often installed by Office / productivity software
  'Calibri Light',
  'Cambria Math',
  'Marlett',

  // Often installed by Adobe / creative tools
  'Adobe Caslon Pro',
  'Adobe Garamond Pro',
  'Adobe Jenson Pro',
  'Birch Std',
  'Blackoak Std',
  'Brush Script Std',
  'Chaparral Pro',
  'Charlemagne Std',
  'Cooper Std',
  'Giddyup Std',
  'Hobo Std',
  'Kozuka Gothic Pr6N',
  'Kozuka Mincho Pr6N',
  'Letter Gothic Std',
  'Lithos Pro',
  'Mesquite Std',
  'Minion Pro',
  'Myriad Pro',
  'Nueva Std',
  'OCR A Std',
  'Orator Std',
  'Poplar Std',
  'Prestige Elite Std',
  'Rosewood Std',
  'Stencil Std',
  'Tekton Pro',
  'Trajan Pro',

  // Programming / monospace fonts
  'Fira Code',
  'Fira Mono',
  'Source Code Pro',
  'Inconsolata',
  'JetBrains Mono',
  'Cascadia Code',
  'IBM Plex Mono',

  // Web-popular display fonts
  'Roboto',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Oswald',
  'Source Sans Pro',
  'Raleway',
  'PT Sans',
  'Merriweather',
];

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

function getFontHash() {
  if (
    typeof document === 'undefined' ||
    !document.fonts ||
    typeof document.fonts.check !== 'function'
  ) {
    return '';
  }
  const installed = [];
  for (const font of FONT_PROBE_LIST) {
    try {
      // Quote the font name to handle multi-word names; size is required by the API.
      if (document.fonts.check(`12px "${font}"`)) {
        installed.push(font);
      }
    } catch {
      // Ignore individual font check errors and continue.
    }
  }
  return hashString(installed.join(','));
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
    fontHash: getFontHash(),
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

export const __test__ = { buildSignals, hashString, getFontHash };
