package com.example.deviceid.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.example.deviceid.domain.Device;
import com.example.deviceid.domain.DeviceFingerprint;
import com.example.deviceid.domain.User;
import org.junit.jupiter.api.Test;

class MachineSignatureServiceTest {

  private final MachineSignatureService service = new MachineSignatureService();

  @Test
  void sameInputProducesSameHash() {
    DeviceFingerprint a = sampleFingerprint();
    DeviceFingerprint b = sampleFingerprint();

    assertThat(service.computeSignature(a)).isEqualTo(service.computeSignature(b));
  }

  @Test
  void browserSpecificSignalsDoNotAffectHash() {
    DeviceFingerprint b = sampleFingerprint();
    b.setCanvasHash("totally-different-canvas");
    b.setWebglRenderer("Different WebGL Renderer");
    b.setUserAgent("Mozilla/5.0 Firefox/120");
    b.setCodecSupport("audio/wav");
    b.setLocale("fr-FR");
    b.setDntEnabled(true);
    b.setCookieEnabled(false);

    DeviceFingerprint a = sampleFingerprint();
    assertThat(service.computeSignature(a)).isEqualTo(service.computeSignature(b));
  }

  @Test
  void timezoneDoesNotAffectHash() {
    DeviceFingerprint a = sampleFingerprint();
    DeviceFingerprint b = sampleFingerprint();
    b.setTimezone("Europe/London");

    assertThat(service.computeSignature(a)).isEqualTo(service.computeSignature(b));
  }

  @Test
  void deviceMemoryDoesNotAffectHash() {
    // The Device Memory API is Chrome-only. Firefox and Safari send null.
    // Same hardware viewed from different browsers must still produce the same hash.
    DeviceFingerprint chrome = sampleFingerprint();
    chrome.setDeviceMemory(8.0);

    DeviceFingerprint firefox = sampleFingerprint();
    firefox.setDeviceMemory(null);

    assertThat(service.computeSignature(chrome)).isEqualTo(service.computeSignature(firefox));
  }

  @Test
  void colorDepthDoesNotAffectHash() {
    // Safari deliberately reports 24 on Display P3 panels even when the hardware supports 30,
    // as anti-fingerprinting. Chrome and Firefox report 30. Same machine, different hash if
    // colorDepth were in the hash.
    DeviceFingerprint chrome = sampleFingerprint();
    chrome.setColorDepth(30);

    DeviceFingerprint safari = sampleFingerprint();
    safari.setColorDepth(24);

    assertThat(service.computeSignature(chrome)).isEqualTo(service.computeSignature(safari));
  }

  @Test
  void hardwareConcurrencyDoesNotAffectHash() {
    // WebKit caps navigator.hardwareConcurrency at 8 regardless of actual cores. A 12-core
    // MacBook reports 12 in Chrome and Firefox but 8 in Safari. Same machine, different hash
    // if hardwareConcurrency were in the hash.
    DeviceFingerprint chrome = sampleFingerprint();
    chrome.setHardwareConcurrency(12);

    DeviceFingerprint safari = sampleFingerprint();
    safari.setHardwareConcurrency(8);

    assertThat(service.computeSignature(chrome)).isEqualTo(service.computeSignature(safari));
  }

  @Test
  void differentPixelRatioProducesDifferentHash() {
    // pixelRatio IS in the hash — it's a stable display property reported consistently across
    // major browsers. A Retina (2.0) and non-Retina (1.0) machine should not collide.
    DeviceFingerprint retina = sampleFingerprint();
    retina.setPixelRatio(2.0);

    DeviceFingerprint nonRetina = sampleFingerprint();
    nonRetina.setPixelRatio(1.0);

    assertThat(service.computeSignature(retina)).isNotEqualTo(service.computeSignature(nonRetina));
  }

  @Test
  void chromeFirefoxSafariOnSameMachineProduceIdenticalHash() {
    // End-to-end exercise of the hash composition. Three fingerprints captured from Chrome,
    // Firefox and Safari running on the same MacBook Pro 14" with Apple M3 Pro. They differ on
    // every browser-specific signal AND on the three signals known to vary by browser-privacy
    // mitigations (colorDepth, hardwareConcurrency, deviceMemory). The hash must be identical.

    DeviceFingerprint chrome = realWorldBaseline();
    chrome.setCanvasHash("6qyv9m");
    chrome.setWebglRenderer(
        "ANGLE (Apple, ANGLE Metal Renderer: Apple M3 Pro, Unspecified Version)");
    chrome.setColorDepth(30);
    chrome.setHardwareConcurrency(12);
    chrome.setDeviceMemory(8.0);
    chrome.setUserAgent("Mozilla/5.0 ... Chrome/146");
    chrome.setLocale("en-GB");
    chrome.setTimezone("Asia/Calcutta");

    DeviceFingerprint firefox = realWorldBaseline();
    firefox.setCanvasHash("bjom3h");
    firefox.setWebglRenderer("Apple M1, or similar");
    firefox.setColorDepth(30);
    firefox.setHardwareConcurrency(12);
    firefox.setDeviceMemory(null);
    firefox.setUserAgent("Mozilla/5.0 ... Firefox/151");
    firefox.setLocale("en-US");
    firefox.setTimezone("Asia/Kolkata");

    DeviceFingerprint safari = realWorldBaseline();
    safari.setCanvasHash("mg0lca");
    safari.setWebglRenderer("Apple GPU");
    safari.setColorDepth(24);
    safari.setHardwareConcurrency(8);
    safari.setDeviceMemory(null);
    safari.setUserAgent("Mozilla/5.0 ... Safari/26.3.1");
    safari.setLocale("en-IN");
    safari.setTimezone("Asia/Calcutta");

    String chromeHash = service.computeSignature(chrome);
    String firefoxHash = service.computeSignature(firefox);
    String safariHash = service.computeSignature(safari);

    assertThat(chromeHash).isEqualTo(firefoxHash);
    assertThat(firefoxHash).isEqualTo(safariHash);
  }

  private DeviceFingerprint realWorldBaseline() {
    User user = new User("nithya");
    Device device = new Device(user, "Real Device");
    DeviceFingerprint fp = new DeviceFingerprint(device);
    fp.setPlatform("MacIntel");
    fp.setScreenResolution("1728x1117");
    fp.setPixelRatio(2.0);
    fp.setTouchSupport(0);
    return fp;
  }

  @Test
  void differentHardwareProducesDifferentHash() {
    DeviceFingerprint a = sampleFingerprint();
    DeviceFingerprint b = sampleFingerprint();
    b.setPlatform("Win32");

    assertThat(service.computeSignature(a)).isNotEqualTo(service.computeSignature(b));
  }

  @Test
  void differentScreenResolutionProducesDifferentHash() {
    DeviceFingerprint a = sampleFingerprint();
    DeviceFingerprint b = sampleFingerprint();
    b.setScreenResolution("2560x1440");

    assertThat(service.computeSignature(a)).isNotEqualTo(service.computeSignature(b));
  }

  @Test
  void allNullSignalsProduceValidHash() {
    User user = new User("testuser");
    Device device = new Device(user, "Test Device");
    DeviceFingerprint fp = new DeviceFingerprint(device);

    String hash = service.computeSignature(fp);

    assertThat(hash).matches("[0-9a-f]{64}");
  }

  @Test
  void hashIsExactly64LowercaseHexChars() {
    String hash = service.computeSignature(sampleFingerprint());

    assertThat(hash).matches("[0-9a-f]{64}");
  }

  private DeviceFingerprint sampleFingerprint() {
    User user = new User("testuser");
    Device device = new Device(user, "Test Device");
    DeviceFingerprint fp = new DeviceFingerprint(device);
    fp.setTimezone("America/New_York");
    fp.setPlatform("MacIntel");
    fp.setScreenResolution("1920x1080");
    fp.setColorDepth(24);
    fp.setHardwareConcurrency(8);
    fp.setDeviceMemory(16.0);
    fp.setTouchSupport(0);
    // Browser-specific signals (should not affect hash)
    fp.setCanvasHash("abc123");
    fp.setWebglRenderer("NVIDIA GeForce");
    fp.setUserAgent("Mozilla/5.0 Chrome/120");
    fp.setCodecSupport("video/webm");
    fp.setLocale("en-US");
    fp.setPixelRatio(2.0);
    fp.setDntEnabled(false);
    fp.setCookieEnabled(true);
    return fp;
  }
}
