package com.example.deviceid.domain;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class DeviceFingerprintTest {

  @Test
  void signalGettersAndSettersShouldWork() {
    User user = new User("testuser");
    Device device = new Device(user, "Test Device");
    DeviceFingerprint fp = new DeviceFingerprint(device);

    fp.setCanvasHash("abc123");
    fp.setWebglRenderer("NVIDIA GeForce");
    fp.setScreenResolution("1920x1080");
    fp.setColorDepth(24);
    fp.setPixelRatio(2.0);
    fp.setTimezone("America/New_York");
    fp.setLocale("en-US");
    fp.setPlatform("MacIntel");
    fp.setUserAgent("Mozilla/5.0 Chrome/120");
    fp.setHardwareConcurrency(8);
    fp.setDeviceMemory(16.0);
    fp.setTouchSupport(0);
    fp.setCodecSupport("video/webm,video/mp4");
    fp.setDntEnabled(false);
    fp.setCookieEnabled(true);
    fp.setRawSignals("{\"raw\":true}");
    fp.setMachineSignature("a".repeat(64));
    fp.setPublicIp("203.0.113.42");

    assertThat(fp.getCanvasHash()).isEqualTo("abc123");
    assertThat(fp.getWebglRenderer()).isEqualTo("NVIDIA GeForce");
    assertThat(fp.getScreenResolution()).isEqualTo("1920x1080");
    assertThat(fp.getColorDepth()).isEqualTo(24);
    assertThat(fp.getPixelRatio()).isEqualTo(2.0);
    assertThat(fp.getTimezone()).isEqualTo("America/New_York");
    assertThat(fp.getLocale()).isEqualTo("en-US");
    assertThat(fp.getPlatform()).isEqualTo("MacIntel");
    assertThat(fp.getUserAgent()).isEqualTo("Mozilla/5.0 Chrome/120");
    assertThat(fp.getHardwareConcurrency()).isEqualTo(8);
    assertThat(fp.getDeviceMemory()).isEqualTo(16.0);
    assertThat(fp.getTouchSupport()).isEqualTo(0);
    assertThat(fp.getCodecSupport()).isEqualTo("video/webm,video/mp4");
    assertThat(fp.getDntEnabled()).isFalse();
    assertThat(fp.getCookieEnabled()).isTrue();
    assertThat(fp.getRawSignals()).isEqualTo("{\"raw\":true}");
    assertThat(fp.getMachineSignature()).isEqualTo("a".repeat(64));
    assertThat(fp.getPublicIp()).isEqualTo("203.0.113.42");
    assertThat(fp.getDevice()).isSameAs(device);
  }

  @Test
  void nullSignalsShouldBeAllowed() {
    User user = new User("testuser");
    Device device = new Device(user, "Test Device");
    DeviceFingerprint fp = new DeviceFingerprint(device);

    assertThat(fp.getCanvasHash()).isNull();
    assertThat(fp.getDeviceMemory()).isNull();
    assertThat(fp.getDntEnabled()).isNull();
    assertThat(fp.getMachineSignature()).isNull();
    assertThat(fp.getPublicIp()).isNull();
    assertThat(fp.getId()).isNull();
    assertThat(fp.getCollectedAt()).isNull();
  }

  @Test
  void prePersistShouldSetCollectedAt() {
    User user = new User("testuser");
    Device device = new Device(user, "Test Device");
    DeviceFingerprint fp = new DeviceFingerprint(device);
    fp.onPrePersist();

    assertThat(fp.getCollectedAt()).isNotNull();
  }
}
