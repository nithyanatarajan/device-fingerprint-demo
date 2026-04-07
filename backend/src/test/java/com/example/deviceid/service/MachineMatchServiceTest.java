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
  private static final String TZ_NY = "America/New_York";
  private static final String TZ_LONDON = "Europe/London";
  private static final String LOCALE_EN_US = "en-US";
  private static final String LOCALE_EN_GB = "en-GB";

  @Autowired private MachineMatchService machineMatchService;
  @Autowired private UserRepository userRepository;
  @Autowired private DeviceRepository deviceRepository;
  @Autowired private DeviceFingerprintRepository fingerprintRepository;

  @Test
  void noMatchesWhenSignatureNotFound() {
    Device current = createDevice("testuser", "Test Device");
    DeviceFingerprint fp = saveFingerprint(current, SIG_A, IP_1, TZ_NY, LOCALE_EN_US);

    MachineMatchResult result = machineMatchService.findMatches(fp);

    assertThat(result.strongMatches()).isEmpty();
    assertThat(result.possibleMatches()).isEmpty();
  }

  @Test
  void strongMatchWhenAllFourSignalsAlign() {
    Device other = createDevice("userA", "Other Device");
    saveFingerprint(other, SIG_A, IP_1, TZ_NY, LOCALE_EN_US);

    Device current = createDevice("userB", "Current Device");
    DeviceFingerprint currentFp = saveFingerprint(current, SIG_A, IP_1, TZ_NY, LOCALE_EN_US);

    MachineMatchResult result = machineMatchService.findMatches(currentFp);

    assertThat(result.strongMatches()).hasSize(1);
    assertThat(result.possibleMatches()).isEmpty();
    assertThat(result.strongMatches().get(0).deviceId()).isEqualTo(other.getId());
  }

  @Test
  void possibleMatchWhenIpDiffersButTimezoneAndLocaleAlign() {
    Device other = createDevice("userA", "Other Device");
    saveFingerprint(other, SIG_A, IP_1, TZ_NY, LOCALE_EN_US);

    Device current = createDevice("userB", "Current Device");
    DeviceFingerprint currentFp = saveFingerprint(current, SIG_A, IP_2, TZ_NY, LOCALE_EN_US);

    MachineMatchResult result = machineMatchService.findMatches(currentFp);

    assertThat(result.strongMatches()).isEmpty();
    assertThat(result.possibleMatches()).hasSize(1);
    assertThat(result.possibleMatches().get(0).deviceId()).isEqualTo(other.getId());
  }

  @Test
  void noMatchWhenSignatureMatchesButTimezoneDiffers() {
    Device other = createDevice("userA", "Other Device");
    saveFingerprint(other, SIG_A, IP_1, TZ_LONDON, LOCALE_EN_US);

    Device current = createDevice("userB", "Current Device");
    DeviceFingerprint currentFp = saveFingerprint(current, SIG_A, IP_1, TZ_NY, LOCALE_EN_US);

    MachineMatchResult result = machineMatchService.findMatches(currentFp);

    assertThat(result.strongMatches()).isEmpty();
    assertThat(result.possibleMatches()).isEmpty();
  }

  @Test
  void noMatchWhenSignatureMatchesButLocaleDiffers() {
    Device other = createDevice("userA", "Other Device");
    saveFingerprint(other, SIG_A, IP_1, TZ_NY, LOCALE_EN_GB);

    Device current = createDevice("userB", "Current Device");
    DeviceFingerprint currentFp = saveFingerprint(current, SIG_A, IP_1, TZ_NY, LOCALE_EN_US);

    MachineMatchResult result = machineMatchService.findMatches(currentFp);

    assertThat(result.strongMatches()).isEmpty();
    assertThat(result.possibleMatches()).isEmpty();
  }

  @Test
  void noMatchWhenTimezoneAlignsButLocaleDiffers() {
    Device other = createDevice("userA", "Other Device");
    saveFingerprint(other, SIG_A, IP_1, TZ_NY, LOCALE_EN_GB);

    Device current = createDevice("userB", "Current Device");
    DeviceFingerprint currentFp = saveFingerprint(current, SIG_A, IP_1, TZ_NY, LOCALE_EN_US);

    MachineMatchResult result = machineMatchService.findMatches(currentFp);

    assertThat(result.strongMatches()).isEmpty();
    assertThat(result.possibleMatches()).isEmpty();
  }

  @Test
  void noMatchWhenIpMatchesButSignatureDiffers() {
    Device other = createDevice("userA", "Other Device");
    saveFingerprint(other, SIG_A, IP_1, TZ_NY, LOCALE_EN_US);

    Device current = createDevice("userB", "Current Device");
    DeviceFingerprint currentFp = saveFingerprint(current, SIG_B, IP_1, TZ_NY, LOCALE_EN_US);

    MachineMatchResult result = machineMatchService.findMatches(currentFp);

    assertThat(result.strongMatches()).isEmpty();
    assertThat(result.possibleMatches()).isEmpty();
  }

  @Test
  void selfMatchesAreExcluded() {
    Device current = createDevice("testuser", "Current Device");
    saveFingerprint(current, SIG_A, IP_1, TZ_NY, LOCALE_EN_US);
    DeviceFingerprint currentFp = saveFingerprint(current, SIG_A, IP_1, TZ_NY, LOCALE_EN_US);

    MachineMatchResult result = machineMatchService.findMatches(currentFp);

    assertThat(result.strongMatches()).isEmpty();
    assertThat(result.possibleMatches()).isEmpty();
  }

  @Test
  void multipleStrongMatchesSortedByLastSeenDesc() throws InterruptedException {
    Device olderDevice = createDevice("userA", "Older Device");
    saveFingerprint(olderDevice, SIG_A, IP_1, TZ_NY, LOCALE_EN_US);

    Thread.sleep(10);

    Device newerDevice = createDevice("userB", "Newer Device");
    saveFingerprint(newerDevice, SIG_A, IP_1, TZ_NY, LOCALE_EN_US);

    Thread.sleep(10);

    Device current = createDevice("userC", "Current Device");
    DeviceFingerprint currentFp = saveFingerprint(current, SIG_A, IP_1, TZ_NY, LOCALE_EN_US);

    MachineMatchResult result = machineMatchService.findMatches(currentFp);

    assertThat(result.possibleMatches()).isEmpty();
    assertThat(result.strongMatches()).hasSize(2);
    List<MachineMatch> matches = result.strongMatches();
    assertThat(matches.get(0).deviceId()).isEqualTo(newerDevice.getId());
    assertThat(matches.get(1).deviceId()).isEqualTo(olderDevice.getId());
    assertThat(matches.get(0).lastSeenAt()).isAfterOrEqualTo(matches.get(1).lastSeenAt());
  }

  @Test
  void mixedStrongAndPossibleMatchesAreClassifiedAndSortedIndependently()
      throws InterruptedException {
    Device strongOlder = createDevice("userA", "Strong Older");
    saveFingerprint(strongOlder, SIG_A, IP_1, TZ_NY, LOCALE_EN_US);
    Thread.sleep(10);
    Device possibleOlder = createDevice("userB", "Possible Older");
    saveFingerprint(possibleOlder, SIG_A, IP_2, TZ_NY, LOCALE_EN_US);
    Thread.sleep(10);
    Device strongNewer = createDevice("userC", "Strong Newer");
    saveFingerprint(strongNewer, SIG_A, IP_1, TZ_NY, LOCALE_EN_US);
    Thread.sleep(10);
    Device possibleNewer = createDevice("userD", "Possible Newer");
    saveFingerprint(possibleNewer, SIG_A, IP_2, TZ_NY, LOCALE_EN_US);
    Thread.sleep(10);

    Device current = createDevice("testuser", "Current Device");
    DeviceFingerprint currentFp = saveFingerprint(current, SIG_A, IP_1, TZ_NY, LOCALE_EN_US);

    MachineMatchResult result = machineMatchService.findMatches(currentFp);

    assertThat(result.strongMatches()).hasSize(2);
    assertThat(result.strongMatches().get(0).deviceId()).isEqualTo(strongNewer.getId());
    assertThat(result.strongMatches().get(1).deviceId()).isEqualTo(strongOlder.getId());

    assertThat(result.possibleMatches()).hasSize(2);
    assertThat(result.possibleMatches().get(0).deviceId()).isEqualTo(possibleNewer.getId());
    assertThat(result.possibleMatches().get(1).deviceId()).isEqualTo(possibleOlder.getId());
  }

  @Test
  void onlyLatestFingerprintPerOtherDeviceIsReturned() throws InterruptedException {
    Device other = createDevice("userA", "Other Device");
    saveFingerprint(other, SIG_A, IP_1, TZ_NY, LOCALE_EN_US);
    Thread.sleep(10);
    DeviceFingerprint latestOther = saveFingerprint(other, SIG_A, IP_1, TZ_NY, LOCALE_EN_US);

    Device current = createDevice("userB", "Current Device");
    DeviceFingerprint currentFp = saveFingerprint(current, SIG_A, IP_1, TZ_NY, LOCALE_EN_US);

    MachineMatchResult result = machineMatchService.findMatches(currentFp);

    assertThat(result.strongMatches()).hasSize(1);
    assertThat(result.strongMatches().get(0).lastSeenAt()).isEqualTo(latestOther.getCollectedAt());
  }

  @Test
  void nullSignatureReturnsEmpty() {
    Device current = createDevice("testuser", "Current Device");
    DeviceFingerprint fp = saveFingerprint(current, null, IP_1, TZ_NY, LOCALE_EN_US);

    MachineMatchResult result = machineMatchService.findMatches(fp);

    assertThat(result.strongMatches()).isEmpty();
    assertThat(result.possibleMatches()).isEmpty();
  }

  @Test
  void bothNullPublicIpsAreTreatedAsStrong() {
    Device other = createDevice("userA", "Other Device");
    saveFingerprint(other, SIG_A, null, TZ_NY, LOCALE_EN_US);

    Device current = createDevice("userB", "Current Device");
    DeviceFingerprint currentFp = saveFingerprint(current, SIG_A, null, TZ_NY, LOCALE_EN_US);

    MachineMatchResult result = machineMatchService.findMatches(currentFp);

    assertThat(result.strongMatches()).hasSize(1);
    assertThat(result.possibleMatches()).isEmpty();
    assertThat(result.strongMatches().get(0).deviceId()).isEqualTo(other.getId());
  }

  @Test
  void oneNullPublicIpIsClassifiedAsPossible() {
    Device other = createDevice("userA", "Other Device");
    saveFingerprint(other, SIG_A, null, TZ_NY, LOCALE_EN_US);

    Device current = createDevice("userB", "Current Device");
    DeviceFingerprint currentFp = saveFingerprint(current, SIG_A, IP_1, TZ_NY, LOCALE_EN_US);

    MachineMatchResult result = machineMatchService.findMatches(currentFp);

    assertThat(result.strongMatches()).isEmpty();
    assertThat(result.possibleMatches()).hasSize(1);
    assertThat(result.possibleMatches().get(0).deviceId()).isEqualTo(other.getId());
  }

  private Device createDevice(String userName, String label) {
    User user = userRepository.save(new User(userName));
    return deviceRepository.save(new Device(user, label));
  }

  private DeviceFingerprint saveFingerprint(
      Device device, String signature, String ip, String timezone, String locale) {
    DeviceFingerprint fp = new DeviceFingerprint(device);
    fp.setMachineSignature(signature);
    fp.setPublicIp(ip);
    fp.setTimezone(timezone);
    fp.setLocale(locale);
    return fingerprintRepository.save(fp);
  }
}
