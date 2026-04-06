import { describe, it, expect, vi, beforeEach } from 'vitest';
import { collectSignals } from './fingerprint';

vi.mock('@fingerprintjs/fingerprintjs', () => {
  const mockGet = vi.fn().mockResolvedValue({
    visitorId: 'abc123',
    components: {
      canvas: { value: 'canvas-hash-123' },
      webGlRenderer: { value: 'ANGLE (Intel)' },
      colorDepth: { value: 24 },
      devicePixelRatio: { value: 2 },
      timezone: { value: 'America/New_York' },
      platform: { value: 'MacIntel' },
      hardwareConcurrency: { value: 8 },
      touchSupport: { value: { maxTouchPoints: 0, touchEvent: false, touchStart: false } },
    },
  });
  return {
    default: {
      load: vi.fn().mockResolvedValue({ get: mockGet }),
    },
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
});

describe('fingerprint service', () => {
  it('collectSignals returns object with expected keys', async () => {
    const signals = await collectSignals();

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
    ];

    for (const key of expectedKeys) {
      expect(signals).toHaveProperty(key);
    }
  });

  it('collectSignals extracts correct values from components', async () => {
    const signals = await collectSignals();

    expect(signals.canvasHash).toBe('canvas-hash-123');
    expect(signals.webglRenderer).toBe('ANGLE (Intel)');
    expect(signals.screenResolution).toBe('1920x1080');
    expect(signals.colorDepth).toBe(24);
    expect(signals.pixelRatio).toBe(2);
    expect(signals.timezone).toBe('America/New_York');
    expect(signals.platform).toBe('MacIntel');
    expect(signals.hardwareConcurrency).toBe(8);
    expect(signals.locale).toBe('en-US');
    expect(signals.userAgent).toBe('TestAgent/1.0');
    expect(signals.deviceMemory).toBe(16);
    expect(signals.dntEnabled).toBe(true);
    expect(signals.cookieEnabled).toBe(true);
  });

  it('returns codec support when MediaRecorder is available', async () => {
    vi.stubGlobal('MediaRecorder', {
      isTypeSupported: (codec) =>
        codec === 'video/webm;codecs=vp8' || codec === 'audio/webm;codecs=opus',
    });

    const signals = await collectSignals();

    expect(signals.codecSupport).toBe('video/webm;codecs=vp8,audio/webm;codecs=opus');

    vi.unstubAllGlobals();
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
  });

  it('returns empty codec support when MediaRecorder is undefined', async () => {
    const signals = await collectSignals();
    expect(signals.codecSupport).toBe('');
  });

  it('handles missing components gracefully', async () => {
    const FingerprintJS = (await import('@fingerprintjs/fingerprintjs')).default;
    const fpInstance = await FingerprintJS.load();
    fpInstance.get.mockResolvedValueOnce({
      visitorId: 'xyz',
      components: {},
    });

    const signals = await collectSignals();

    expect(signals.canvasHash).toBe('');
    expect(signals.webglRenderer).toBe('');
    expect(signals.screenResolution).toBe('1920x1080');
  });
});
