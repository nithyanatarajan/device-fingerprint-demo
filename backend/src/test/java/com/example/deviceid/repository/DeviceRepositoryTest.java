package com.example.deviceid.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.example.deviceid.domain.Device;
import com.example.deviceid.domain.User;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class DeviceRepositoryTest {

  @Autowired private UserRepository userRepository;

  @Autowired private DeviceRepository deviceRepository;

  @Test
  void findByUserShouldReturnDevicesForUser() {
    User user = new User("testuser");
    userRepository.saveAndFlush(user);

    Device device1 = new Device(user, "Chrome on MacOS");
    Device device2 = new Device(user, "Firefox on Linux");
    deviceRepository.saveAndFlush(device1);
    deviceRepository.saveAndFlush(device2);

    List<Device> devices = deviceRepository.findByUser(user);

    assertThat(devices).hasSize(2);
    assertThat(devices)
        .extracting(Device::getLabel)
        .containsExactlyInAnyOrder("Chrome on MacOS", "Firefox on Linux");
  }

  @Test
  void findByUserShouldReturnEmptyForUserWithNoDevices() {
    User user = new User("testuser");
    userRepository.saveAndFlush(user);

    List<Device> devices = deviceRepository.findByUser(user);

    assertThat(devices).isEmpty();
  }

  @Test
  void findByUserShouldNotReturnOtherUsersDevices() {
    User userA = new User("usera");
    User userB = new User("userb");
    userRepository.saveAndFlush(userA);
    userRepository.saveAndFlush(userB);

    Device deviceA = new Device(userA, "Device A");
    Device deviceB = new Device(userB, "Device B");
    deviceRepository.saveAndFlush(deviceA);
    deviceRepository.saveAndFlush(deviceB);

    List<Device> devicesA = deviceRepository.findByUser(userA);

    assertThat(devicesA).hasSize(1);
    assertThat(devicesA.getFirst().getLabel()).isEqualTo("Device A");
  }
}
