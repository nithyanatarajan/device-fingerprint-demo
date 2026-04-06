package com.example.deviceid.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.example.deviceid.domain.Device;
import com.example.deviceid.domain.DeviceFingerprint;
import com.example.deviceid.domain.User;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class DeviceFingerprintRepositoryTest {

  @Autowired private UserRepository userRepository;

  @Autowired private DeviceRepository deviceRepository;

  @Autowired private DeviceFingerprintRepository fingerprintRepository;

  @Test
  void findByDeviceOrderedShouldReturnNewestFirst() throws InterruptedException {
    User user = new User("testuser");
    userRepository.saveAndFlush(user);
    Device device = new Device(user, "Test Device");
    deviceRepository.saveAndFlush(device);

    DeviceFingerprint fp1 = new DeviceFingerprint(device);
    fp1.setCanvasHash("hash1");
    fingerprintRepository.saveAndFlush(fp1);

    // Small delay to ensure different timestamps
    Thread.sleep(50);

    DeviceFingerprint fp2 = new DeviceFingerprint(device);
    fp2.setCanvasHash("hash2");
    fingerprintRepository.saveAndFlush(fp2);

    List<DeviceFingerprint> fingerprints =
        fingerprintRepository.findByDeviceOrderByCollectedAtDesc(device);

    assertThat(fingerprints).hasSize(2);
    assertThat(fingerprints.getFirst().getCanvasHash()).isEqualTo("hash2");
    assertThat(fingerprints.get(1).getCanvasHash()).isEqualTo("hash1");
  }

  @Test
  void findTopShouldReturnLatestFingerprint() throws InterruptedException {
    User user = new User("testuser");
    userRepository.saveAndFlush(user);
    Device device = new Device(user, "Test Device");
    deviceRepository.saveAndFlush(device);

    DeviceFingerprint fp1 = new DeviceFingerprint(device);
    fp1.setCanvasHash("older");
    fingerprintRepository.saveAndFlush(fp1);

    Thread.sleep(50);

    DeviceFingerprint fp2 = new DeviceFingerprint(device);
    fp2.setCanvasHash("newer");
    fingerprintRepository.saveAndFlush(fp2);

    Optional<DeviceFingerprint> latest =
        fingerprintRepository.findTopByDeviceOrderByCollectedAtDesc(device);

    assertThat(latest).isPresent();
    assertThat(latest.get().getCanvasHash()).isEqualTo("newer");
  }

  @Test
  void findByDeviceShouldReturnEmptyWhenNoFingerprints() {
    User user = new User("testuser");
    userRepository.saveAndFlush(user);
    Device device = new Device(user, "Test Device");
    deviceRepository.saveAndFlush(device);

    List<DeviceFingerprint> fingerprints =
        fingerprintRepository.findByDeviceOrderByCollectedAtDesc(device);

    assertThat(fingerprints).isEmpty();
  }

  @Test
  void findTopShouldReturnEmptyWhenNoFingerprints() {
    User user = new User("testuser");
    userRepository.saveAndFlush(user);
    Device device = new Device(user, "Test Device");
    deviceRepository.saveAndFlush(device);

    Optional<DeviceFingerprint> latest =
        fingerprintRepository.findTopByDeviceOrderByCollectedAtDesc(device);

    assertThat(latest).isEmpty();
  }
}
