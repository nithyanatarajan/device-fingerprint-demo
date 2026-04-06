import FingerprintJS from '@fingerprintjs/fingerprintjs';

function getCodecSupport() {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) {
    return '';
  }
  const codecs = [
    'video/webm;codecs=vp8',
    'video/webm;codecs=vp9',
    'video/webm;codecs=h264',
    'audio/webm;codecs=opus',
    'video/mp4;codecs=h264',
  ];
  return codecs.filter((c) => MediaRecorder.isTypeSupported(c)).join(',');
}

export async function collectSignals() {
  const fp = await FingerprintJS.load();
  const result = await fp.get();
  const components = result.components;

  return {
    canvasHash: components.canvas?.value?.toString() || '',
    webglRenderer: components.webGlRenderer?.value || '',
    screenResolution: `${screen.width}x${screen.height}`,
    colorDepth: components.colorDepth?.value ?? screen.colorDepth,
    pixelRatio: components.devicePixelRatio?.value ?? window.devicePixelRatio,
    timezone: components.timezone?.value || Intl.DateTimeFormat().resolvedOptions().timeZone,
    locale: navigator.language || '',
    platform: components.platform?.value || navigator.platform || '',
    userAgent: navigator.userAgent,
    hardwareConcurrency: components.hardwareConcurrency?.value ?? navigator.hardwareConcurrency,
    deviceMemory: navigator.deviceMemory ?? 0,
    touchSupport: components.touchSupport?.value
      ? JSON.stringify(components.touchSupport.value)
      : String(navigator.maxTouchPoints > 0),
    codecSupport: getCodecSupport(),
    dntEnabled: navigator.doNotTrack === '1',
    cookieEnabled: navigator.cookieEnabled,
  };
}
