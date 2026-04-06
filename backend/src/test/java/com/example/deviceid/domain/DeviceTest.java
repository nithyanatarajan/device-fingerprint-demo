package com.example.deviceid.domain;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class DeviceTest {

  @Test
  void newDeviceShouldHaveVisitCountOfOne() {
    User user = new User("testuser");
    Device device = new Device(user, "Chrome on MacOS");

    assertThat(device.getVisitCount()).isEqualTo(1);
    assertThat(device.getLabel()).isEqualTo("Chrome on MacOS");
    assertThat(device.getUser()).isSameAs(user);
    assertThat(device.getId()).isNull();
    assertThat(device.getCreatedAt()).isNull();
  }

  @Test
  void recordVisitShouldIncrementCountAndUpdateLastSeen() throws InterruptedException {
    User user = new User("testuser");
    Device device = new Device(user, "Firefox on Linux");

    assertThat(device.getVisitCount()).isEqualTo(1);

    device.recordVisit();
    assertThat(device.getVisitCount()).isEqualTo(2);
    assertThat(device.getLastSeenAt()).isNotNull();

    device.recordVisit();
    assertThat(device.getVisitCount()).isEqualTo(3);
  }

  @Test
  void prePersistShouldSetTimestamps() {
    User user = new User("testuser");
    Device device = new Device(user, "Test Device");
    device.onPrePersist();

    assertThat(device.getCreatedAt()).isNotNull();
    assertThat(device.getLastSeenAt()).isNotNull();
  }
}
