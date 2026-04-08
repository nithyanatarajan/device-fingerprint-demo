package com.example.deviceid.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.example.deviceid.domain.Device;
import com.example.deviceid.domain.DeviceFingerprint;
import com.example.deviceid.domain.User;
import com.example.deviceid.dto.SignalDistinctivenessEntry;
import com.example.deviceid.dto.SignalDistinctivenessResponse;
import com.example.deviceid.repository.DeviceFingerprintRepository;
import com.example.deviceid.repository.DeviceRepository;
import com.example.deviceid.repository.UserRepository;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@SpringBootTest
@Transactional
class SignalDistinctivenessServiceTest {

  @Autowired private SignalDistinctivenessService distinctivenessService;
  @Autowired private UserRepository userRepository;
  @Autowired private DeviceRepository deviceRepository;
  @Autowired private DeviceFingerprintRepository fingerprintRepository;

  @Test
  void notFoundThrowsWhenFingerprintDoesNotExist() {
    assertThatThrownBy(() -> distinctivenessService.computeFor(UUID.randomUUID()))
        .isInstanceOf(ResponseStatusException.class)
        .hasMessageContaining("fingerprint not found")
        .extracting(e -> ((ResponseStatusException) e).getStatusCode())
        .isEqualTo(HttpStatus.NOT_FOUND);
  }

  @Test
  void soloFingerprintIsUniqueAcrossAllSignals() {
    User user = userRepository.save(new User("solo"));
    Device device = deviceRepository.save(new Device(user, "Laptop"));
    DeviceFingerprint fp = save(device, fpBuilder().platform("MacIntel").canvasHash("HASH_A"));

    SignalDistinctivenessResponse response = distinctivenessService.computeFor(fp.getId());

    assertThat(response.totalFingerprints()).isEqualTo(1);
    assertThat(response.fullFingerprintMatchCount()).isEqualTo(1);
    assertThat(response.signals()).hasSize(15);
    for (SignalDistinctivenessEntry entry : response.signals()) {
      assertThat(entry.matchCount()).as("%s match count", entry.signalName()).isEqualTo(1L);
      assertThat(entry.distinctValues()).as("%s distinct count", entry.signalName()).isEqualTo(1L);
    }
  }

  @Test
  void sharedPlatformValueIncrementsMatchCount() {
    User userA = userRepository.save(new User("alice"));
    User userB = userRepository.save(new User("bob"));
    Device deviceA = deviceRepository.save(new Device(userA, "Mac"));
    Device deviceB = deviceRepository.save(new Device(userB, "Mac"));

    // Two Macs, one Windows — Mac platform value should have matchCount=2.
    save(deviceA, fpBuilder().platform("MacIntel").canvasHash("A"));
    DeviceFingerprint subject = save(deviceB, fpBuilder().platform("MacIntel").canvasHash("B"));
    Device windows = deviceRepository.save(new Device(userA, "PC"));
    save(windows, fpBuilder().platform("Win32").canvasHash("C"));

    SignalDistinctivenessResponse response = distinctivenessService.computeFor(subject.getId());

    assertThat(response.totalFingerprints()).isEqualTo(3);
    SignalDistinctivenessEntry platform = findSignal(response, "platform");
    assertThat(platform.value()).isEqualTo("MacIntel");
    assertThat(platform.matchCount()).isEqualTo(2);
    assertThat(platform.distinctValues()).isEqualTo(2); // MacIntel, Win32

    SignalDistinctivenessEntry canvas = findSignal(response, "canvas_hash");
    assertThat(canvas.matchCount()).isEqualTo(1); // only the subject has canvas=B
    assertThat(canvas.distinctValues()).isEqualTo(3);
  }

  @Test
  void fullFingerprintDuplicatesAreCounted() {
    User user = userRepository.save(new User("twinUser"));
    Device device = deviceRepository.save(new Device(user, "Laptop"));

    // Two fingerprints with identical values across all 15 signals.
    save(device, fpBuilder().platform("MacIntel").canvasHash("SAME"));
    DeviceFingerprint subject = save(device, fpBuilder().platform("MacIntel").canvasHash("SAME"));

    SignalDistinctivenessResponse response = distinctivenessService.computeFor(subject.getId());

    assertThat(response.fullFingerprintMatchCount()).isEqualTo(2);
    assertThat(response.totalFingerprints()).isEqualTo(2);
  }

  @Test
  void nullValuesAreGroupedTogether() {
    User user = userRepository.save(new User("nullUser"));
    Device device = deviceRepository.save(new Device(user, "Laptop"));

    // Two fingerprints with null canvasHash, one with a value.
    save(device, fpBuilder().platform("MacIntel").canvasHash(null));
    DeviceFingerprint subject = save(device, fpBuilder().platform("MacIntel").canvasHash(null));
    save(device, fpBuilder().platform("MacIntel").canvasHash("SET"));

    SignalDistinctivenessResponse response = distinctivenessService.computeFor(subject.getId());

    SignalDistinctivenessEntry canvas = findSignal(response, "canvas_hash");
    assertThat(canvas.value()).isNull();
    assertThat(canvas.matchCount()).isEqualTo(2);
    assertThat(canvas.distinctValues()).isEqualTo(2); // null + "SET"
  }

  private static SignalDistinctivenessEntry findSignal(
      SignalDistinctivenessResponse response, String name) {
    return response.signals().stream()
        .filter(e -> e.signalName().equals(name))
        .findFirst()
        .orElseThrow();
  }

  private DeviceFingerprint save(Device device, FpBuilder builder) {
    DeviceFingerprint fp = new DeviceFingerprint(device);
    builder.applyTo(fp);
    return fingerprintRepository.save(fp);
  }

  private static FpBuilder fpBuilder() {
    return new FpBuilder();
  }

  /**
   * Tiny fluent builder that applies a baseline of fingerprint values so tests only spell out the
   * axes that actually matter for the assertion.
   */
  private static final class FpBuilder {
    private String platform = "MacIntel";
    private String canvasHash = "default_hash";

    FpBuilder platform(String value) {
      this.platform = value;
      return this;
    }

    FpBuilder canvasHash(String value) {
      this.canvasHash = value;
      return this;
    }

    void applyTo(DeviceFingerprint fp) {
      fp.setPlatform(platform);
      fp.setCanvasHash(canvasHash);
      // Leave all other signals null — the service handles nulls as a distinct value.
    }
  }
}
