package com.example.deviceid.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.example.deviceid.domain.Device;
import com.example.deviceid.domain.DeviceFingerprint;
import com.example.deviceid.domain.User;
import com.example.deviceid.dto.MachineMatch;
import com.example.deviceid.dto.MachineMatchResult;
import com.example.deviceid.repository.DeviceFingerprintRepository;
import com.example.deviceid.repository.DeviceRepository;
import com.example.deviceid.repository.UserRepository;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class MachineMatchServiceTest {

  private static final String SIG_A = "a".repeat(64);
  private static final String SIG_B = "b".repeat(64);
  private static final String IP_1 = "203.0.113.10";
  private static final String IP_2 = "203.0.113.20";

  @Autowired private MachineMatchService machineMatchService;
  @Autowired private UserRepository userRepository;
  @Autowired private DeviceRepository deviceRepository;
  @Autowired private DeviceFingerprintRepository fingerprintRepository;

  @Test
  void noMatchesWhenSignatureAndIpNotFound() {
    Device current = createDevice("testuser", "Test Device");
    DeviceFingerprint fp = saveFingerprint(current, SIG_A, IP_1);

    MachineMatchResult result = machineMatchService.findMatches(fp);

    assertThat(result.matches()).isEmpty();
  }

  @Test
  void matchFoundWhenSignatureAndIpBothMatch() {
    Device other = createDevice("userA", "Other Device");
    saveFingerprint(other, SIG_A, IP_1);

    Device current = createDevice("userB", "Current Device");
    DeviceFingerprint currentFp = saveFingerprint(current, SIG_A, IP_1);

    MachineMatchResult result = machineMatchService.findMatches(currentFp);

    assertThat(result.matches()).hasSize(1);
    assertThat(result.matches().get(0).deviceId()).isEqualTo(other.getId());
  }

  @Test
  void noMatchWhenSignatureMatchesButIpDiffers() {
    Device other = createDevice("userA", "Other Device");
    saveFingerprint(other, SIG_A, IP_1);

    Device current = createDevice("userB", "Current Device");
    DeviceFingerprint currentFp = saveFingerprint(current, SIG_A, IP_2);

    MachineMatchResult result = machineMatchService.findMatches(currentFp);

    assertThat(result.matches()).isEmpty();
  }

  @Test
  void noMatchWhenIpMatchesButSignatureDiffers() {
    Device other = createDevice("userA", "Other Device");
    saveFingerprint(other, SIG_A, IP_1);

    Device current = createDevice("userB", "Current Device");
    DeviceFingerprint currentFp = saveFingerprint(current, SIG_B, IP_1);

    MachineMatchResult result = machineMatchService.findMatches(currentFp);

    assertThat(result.matches()).isEmpty();
  }

  @Test
  void selfMatchesAreExcluded() {
    Device current = createDevice("testuser", "Current Device");
    saveFingerprint(current, SIG_A, IP_1);
    DeviceFingerprint currentFp = saveFingerprint(current, SIG_A, IP_1);

    MachineMatchResult result = machineMatchService.findMatches(currentFp);

    assertThat(result.matches()).isEmpty();
  }

  @Test
  void multipleDevicesReturnedSortedByLastSeenDesc() throws InterruptedException {
    Device olderDevice = createDevice("userA", "Older Device");
    saveFingerprint(olderDevice, SIG_A, IP_1);

    Thread.sleep(10);

    Device newerDevice = createDevice("userB", "Newer Device");
    saveFingerprint(newerDevice, SIG_A, IP_1);

    Thread.sleep(10);

    Device current = createDevice("userC", "Current Device");
    DeviceFingerprint currentFp = saveFingerprint(current, SIG_A, IP_1);

    MachineMatchResult result = machineMatchService.findMatches(currentFp);

    assertThat(result.matches()).hasSize(2);
    List<MachineMatch> matches = result.matches();
    assertThat(matches.get(0).deviceId()).isEqualTo(newerDevice.getId());
    assertThat(matches.get(1).deviceId()).isEqualTo(olderDevice.getId());
    assertThat(matches.get(0).lastSeenAt()).isAfterOrEqualTo(matches.get(1).lastSeenAt());
  }

  @Test
  void onlyLatestFingerprintPerOtherDeviceIsReturned() throws InterruptedException {
    Device other = createDevice("userA", "Other Device");
    saveFingerprint(other, SIG_A, IP_1);
    Thread.sleep(10);
    DeviceFingerprint latestOther = saveFingerprint(other, SIG_A, IP_1);

    Device current = createDevice("userB", "Current Device");
    DeviceFingerprint currentFp = saveFingerprint(current, SIG_A, IP_1);

    MachineMatchResult result = machineMatchService.findMatches(currentFp);

    assertThat(result.matches()).hasSize(1);
    assertThat(result.matches().get(0).lastSeenAt()).isEqualTo(latestOther.getCollectedAt());
  }

  @Test
  void nullSignatureReturnsEmpty() {
    Device current = createDevice("testuser", "Current Device");
    DeviceFingerprint fp = saveFingerprint(current, null, IP_1);

    MachineMatchResult result = machineMatchService.findMatches(fp);

    assertThat(result.matches()).isEmpty();
  }

  @Test
  void nullIpReturnsEmpty() {
    Device current = createDevice("testuser", "Current Device");
    DeviceFingerprint fp = saveFingerprint(current, SIG_A, null);

    MachineMatchResult result = machineMatchService.findMatches(fp);

    assertThat(result.matches()).isEmpty();
  }

  private Device createDevice(String userName, String label) {
    User user = userRepository.save(new User(userName));
    return deviceRepository.save(new Device(user, label));
  }

  private DeviceFingerprint saveFingerprint(Device device, String signature, String ip) {
    DeviceFingerprint fp = new DeviceFingerprint(device);
    fp.setMachineSignature(signature);
    fp.setPublicIp(ip);
    return fingerprintRepository.save(fp);
  }
}
