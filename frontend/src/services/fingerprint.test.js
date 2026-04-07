import { describe, it, expect, vi, beforeEach } from 'vitest';
import { collectSignals, FingerprintBlockedError, __test__ } from './fingerprint';

const { buildSignals, hashString, getFontHash } = __test__;

vi.mock('@fingerprintjs/fingerprintjs', () => {
  const mockGet = vi.fn();
  return {
    default: {
      load: vi.fn(() => Promise.resolve({ get: mockGet })),
    },
    __mockGet: mockGet,
  };
});

beforeEach(() => {
  vi.stubGlobal('screen', { width: 1920, height: 1080, colorDepth: 24 });
  vi.stubGlobal('navigator', {
    language: 'en-US',
    platform: 'MacIntel',
    userAgent: 'TestAgent/1.0',
    hardwareConcurrency: 8,
    deviceMemory: 16,
    doNotTrack: '1',
    cookieEnabled: true,
    maxTouchPoints: 0,
  });
  vi.stubGlobal('window', { devicePixelRatio: 2 });
});

describe('hashString', () => {
  it('returns empty string for null/undefined', () => {
    expect(hashString(null)).toBe('');
    expect(hashString(undefined)).toBe('');
  });

  it('returns deterministic hash for same input', () => {
    expect(hashString('hello')).toBe(hashString('hello'));
  });

  it('returns different hashes for different inputs', () => {
    expect(hashString('foo')).not.toBe(hashString('bar'));
  });
});

describe('buildSignals', () => {
  it('extracts canvasHash from canvas component value object', () => {
    const components = {
      canvas: {
        value: {
          winding: true,
          geometry: 'data:image/png;base64,abc',
          text: 'data:text;base64,def',
        },
      },
    };
    const signals = buildSignals(components);
    expect(signals.canvasHash).toBeTruthy();
    expect(typeof signals.canvasHash).toBe('string');
    expect(signals.canvasHash).not.toBe('[object Object]');
  });

  it('extracts webglRenderer from webGlBasics component', () => {
    const components = {
      webGlBasics: {
        value: {
          rendererUnmasked: 'ANGLE (Apple, Apple M1)',
          renderer: 'WebKit WebGL',
        },
      },
    };
    expect(buildSignals(components).webglRenderer).toBe('ANGLE (Apple, Apple M1)');
  });

  it('falls back to renderer when rendererUnmasked is missing', () => {
    const components = { webGlBasics: { value: { renderer: 'WebKit WebGL' } } };
    expect(buildSignals(components).webglRenderer).toBe('WebKit WebGL');
  });

  it('returns empty webglRenderer when component is missing', () => {
    expect(buildSignals({}).webglRenderer).toBe('');
  });

  it('extracts touchSupport as integer from object', () => {
    const components = {
      touchSupport: { value: { maxTouchPoints: 5, touchEvent: true, touchStart: true } },
    };
    expect(buildSignals(components).touchSupport).toBe(5);
  });

  it('falls back to navigator.maxTouchPoints when touchSupport component is missing', () => {
    expect(buildSignals({}).touchSupport).toBe(0);
  });

  it('extracts screen resolution from component when valid', () => {
    const components = { screenResolution: { value: [2560, 1440] } };
    expect(buildSignals(components).screenResolution).toBe('2560x1440');
  });

  it('falls back to screen.width/height when screenResolution component is missing', () => {
    expect(buildSignals({}).screenResolution).toBe('1920x1080');
  });

  it('returns object with all 16 expected keys', () => {
    const expectedKeys = [
      'canvasHash',
      'webglRenderer',
      'screenResolution',
      'colorDepth',
      'pixelRatio',
      'timezone',
      'locale',
      'platform',
      'userAgent',
      'hardwareConcurrency',
      'deviceMemory',
      'touchSupport',
      'codecSupport',
      'dntEnabled',
      'cookieEnabled',
      'fontHash',
    ];
    const signals = buildSignals({});
    for (const key of expectedKeys) {
      expect(signals).toHaveProperty(key);
    }
  });

  it('produces backend-compatible types matching CollectRequest contract', () => {
    // Realistic FingerprintJS v4 component shapes — must match backend Java DTO field types.
    // canvasHash:string, webglRenderer:string, screenResolution:string,
    // colorDepth:Integer, pixelRatio:Double, timezone:string, locale:string,
    // platform:string, userAgent:string, hardwareConcurrency:Integer,
    // deviceMemory:Double, touchSupport:Integer, codecSupport:string,
    // dntEnabled:Boolean, cookieEnabled:Boolean
    const components = {
      canvas: {
        value: {
          winding: true,
          geometry: 'data:image/png;base64,abc',
          text: 'data:text;base64,def',
        },
      },
      webGlBasics: {
        value: {
          version: 'WebGL 1.0',
          vendor: 'WebKit',
          vendorUnmasked: 'Apple',
          renderer: 'WebKit WebGL',
          rendererUnmasked: 'ANGLE (Apple, ANGLE Metal Renderer: Apple M1)',
          shadingLanguageVersion: 'WebGL GLSL ES 1.0',
        },
      },
      screenResolution: { value: [1728, 1117] },
      colorDepth: { value: 30 },
      timezone: { value: 'Asia/Calcutta' },
      platform: { value: 'MacIntel' },
      hardwareConcurrency: { value: 12 },
      deviceMemory: { value: 8 },
      touchSupport: { value: { maxTouchPoints: 0, touchEvent: false, touchStart: false } },
    };

    const signals = buildSignals(components);

    // Each field must be a primitive scalar — never an object — so backend Jackson can deserialize.
    const expected = {
      canvasHash: 'string',
      webglRenderer: 'string',
      screenResolution: 'string',
      colorDepth: 'number',
      pixelRatio: 'number',
      timezone: 'string',
      locale: 'string',
      platform: 'string',
      userAgent: 'string',
      hardwareConcurrency: 'number',
      deviceMemory: 'number',
      touchSupport: 'number',
      codecSupport: 'string',
      dntEnabled: 'boolean',
      cookieEnabled: 'boolean',
      fontHash: 'string',
    };

    for (const [field, expectedType] of Object.entries(expected)) {
      const actual = signals[field];
      expect(
        typeof actual,
        `${field} must be ${expectedType}, got ${typeof actual} (${JSON.stringify(actual)})`,
      ).toBe(expectedType);
    }
  });
});

describe('collectSignals', () => {
  it('uses FingerprintJS to gather components and returns signal object', async () => {
    const mod = await import('@fingerprintjs/fingerprintjs');
    mod.__mockGet.mockResolvedValueOnce({
      visitorId: 'abc',
      components: {
        canvas: { value: { winding: true, geometry: 'g', text: 't' } },
        webGlBasics: { value: { rendererUnmasked: 'ANGLE Test' } },
        touchSupport: { value: { maxTouchPoints: 0, touchEvent: false, touchStart: false } },
      },
    });

    const signals = await collectSignals();
    expect(signals.webglRenderer).toBe('ANGLE Test');
    expect(typeof signals.canvasHash).toBe('string');
  });

  it('throws FingerprintBlockedError when FingerprintJS.load() fails', async () => {
    const mod = await import('@fingerprintjs/fingerprintjs');
    mod.default.load.mockRejectedValueOnce(new Error('script blocked'));

    await expect(collectSignals()).rejects.toThrow(FingerprintBlockedError);
  });
});

describe('signal extraction edge cases', () => {
  it('hardwareConcurrency uses component value when present', () => {
    const signals = buildSignals({ hardwareConcurrency: { value: 16 } });
    expect(signals.hardwareConcurrency).toBe(16);
  });

  it('hardwareConcurrency falls back to navigator when component missing', () => {
    const signals = buildSignals({});
    expect(signals.hardwareConcurrency).toBe(8);
  });

  it('deviceMemory uses component value when present', () => {
    const signals = buildSignals({ deviceMemory: { value: 32 } });
    expect(signals.deviceMemory).toBe(32);
  });

  it('deviceMemory falls back to navigator when component missing', () => {
    const signals = buildSignals({});
    expect(signals.deviceMemory).toBe(16);
  });

  it('colorDepth uses component value when present', () => {
    const signals = buildSignals({ colorDepth: { value: 30 } });
    expect(signals.colorDepth).toBe(30);
  });

  it('colorDepth falls back to screen.colorDepth when component missing', () => {
    const signals = buildSignals({});
    expect(signals.colorDepth).toBe(24);
  });

  it('timezone uses component value when present', () => {
    const signals = buildSignals({ timezone: { value: 'Asia/Tokyo' } });
    expect(signals.timezone).toBe('Asia/Tokyo');
  });

  it('timezone falls back to Intl when component missing', () => {
    const signals = buildSignals({});
    expect(typeof signals.timezone).toBe('string');
    expect(signals.timezone.length).toBeGreaterThan(0);
  });

  it('platform uses component value when present', () => {
    const signals = buildSignals({ platform: { value: 'Linux' } });
    expect(signals.platform).toBe('Linux');
  });

  it('platform falls back to navigator.platform when component missing', () => {
    const signals = buildSignals({});
    expect(signals.platform).toBe('MacIntel');
  });

  it('platform returns empty string when no source available', () => {
    vi.stubGlobal('navigator', { ...navigator, platform: undefined, language: 'en' });
    const signals = buildSignals({});
    expect(signals.platform).toBe('');
  });

  it('locale returns empty string when navigator.language is unset', () => {
    vi.stubGlobal('navigator', { ...navigator, language: '' });
    const signals = buildSignals({});
    expect(signals.locale).toBe('');
  });

  it('extracts touchSupport when value is a number', () => {
    const signals = buildSignals({ touchSupport: { value: 10 } });
    expect(signals.touchSupport).toBe(10);
  });

  it('returns 0 touchSupport when navigator.maxTouchPoints is missing', () => {
    vi.stubGlobal('navigator', { ...navigator, maxTouchPoints: undefined });
    const signals = buildSignals({});
    expect(signals.touchSupport).toBe(0);
  });

  it('screenResolution falls back when component value is invalid array', () => {
    const signals = buildSignals({ screenResolution: { value: [null, null] } });
    expect(signals.screenResolution).toBe('1920x1080');
  });

  it('canvasHash returns empty string when canvas component value is missing', () => {
    const signals = buildSignals({ canvas: {} });
    expect(signals.canvasHash).toBe('');
  });

  it('webglRenderer returns empty string when value is not an object', () => {
    const signals = buildSignals({ webGlBasics: { value: 'string-instead' } });
    expect(signals.webglRenderer).toBe('');
  });
});

describe('getFontHash', () => {
  it('returns a non-empty deterministic hash string when document.fonts.check is available', () => {
    const installedSet = new Set(['Arial', 'Helvetica', 'Menlo', 'Fira Code']);
    vi.stubGlobal('document', {
      fonts: {
        check: (spec) => {
          // spec is like: 12px "Arial"
          const match = spec.match(/"([^"]+)"/);
          return match ? installedSet.has(match[1]) : false;
        },
      },
    });
    const first = getFontHash();
    const second = getFontHash();
    expect(typeof first).toBe('string');
    expect(first.length).toBeGreaterThan(0);
    expect(first).toBe(second);
  });

  it('returns empty string when document.fonts is unavailable', () => {
    vi.stubGlobal('document', {});
    expect(getFontHash()).toBe('');
  });

  it('returns empty string when document.fonts.check is not a function', () => {
    vi.stubGlobal('document', { fonts: { check: 'not-a-function' } });
    expect(getFontHash()).toBe('');
  });

  it('returns empty string when document is undefined', () => {
    vi.stubGlobal('document', undefined);
    expect(getFontHash()).toBe('');
  });

  it('returns different hash for different installed sets', () => {
    const makeChecker = (set) => (spec) => {
      const match = spec.match(/"([^"]+)"/);
      return match ? set.has(match[1]) : false;
    };
    vi.stubGlobal('document', {
      fonts: { check: makeChecker(new Set(['Arial', 'Helvetica'])) },
    });
    const hashA = getFontHash();
    vi.stubGlobal('document', {
      fonts: { check: makeChecker(new Set(['Verdana', 'Georgia', 'Tahoma'])) },
    });
    const hashB = getFontHash();
    expect(hashA).not.toBe(hashB);
  });

  it('continues when individual check throws and ignores the failing probe', () => {
    vi.stubGlobal('document', {
      fonts: {
        check: (spec) => {
          if (spec.includes('"Arial"')) {
            throw new Error('boom');
          }
          return spec.includes('"Helvetica"') || spec.includes('"Menlo"');
        },
      },
    });
    const hash = getFontHash();
    expect(typeof hash).toBe('string');
    expect(hash.length).toBeGreaterThan(0);
  });

  it('buildSignals includes fontHash in the output', () => {
    vi.stubGlobal('document', {
      fonts: { check: () => true },
    });
    const signals = buildSignals({});
    expect(signals).toHaveProperty('fontHash');
    expect(typeof signals.fontHash).toBe('string');
    expect(signals.fontHash.length).toBeGreaterThan(0);
  });
});

describe('codec support detection', () => {
  it('returns supported codecs when MediaRecorder is available', () => {
    vi.stubGlobal('MediaRecorder', {
      isTypeSupported: (codec) =>
        codec === 'video/webm;codecs=vp8' || codec === 'audio/webm;codecs=opus',
    });
    const signals = buildSignals({});
    expect(signals.codecSupport).toBe('video/webm;codecs=vp8,audio/webm;codecs=opus');
  });

  it('returns empty string when MediaRecorder is undefined', () => {
    vi.stubGlobal('MediaRecorder', undefined);
    const signals = buildSignals({});
    expect(signals.codecSupport).toBe('');
  });
});
