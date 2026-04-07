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
    b.setPixelRatio(3.0);
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
