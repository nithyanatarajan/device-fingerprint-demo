package com.example.deviceid.service;

import com.example.deviceid.domain.Device;
import com.example.deviceid.domain.DeviceFingerprint;
import com.example.deviceid.domain.User;
import com.example.deviceid.dto.MachineMatch;
import com.example.deviceid.dto.MachineMatchResult;
import com.example.deviceid.repository.DeviceFingerprintRepository;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import org.springframework.stereotype.Service;

/**
 * Tiered cross-browser machine matching.
 *
 * <p>Two-tier model:
 *
 * <ul>
 *   <li><b>Strong match</b>: hardware signature + timezone + locale + publicIp all align. Near-zero
 *       false positives outside the household-collision edge case.
 *   <li><b>Possible match</b>: hardware signature + timezone + locale align but publicIp differs
 *       (VPN, café, mobile hotspot, roamed Wi-Fi). Surfaced with an explicit caveat in the UI.
 * </ul>
 *
 * <p>Timezone and locale are hard co-match gates: a mismatch suppresses the candidate from both
 * lists. publicIp is a soft gate that only demotes a candidate from strong to possible.
 *
 * <p>Self-matches (the current device's own prior fingerprints) are excluded. Cross-user matches
 * are intentional — a user re-registering on the same machine should surface the prior identity.
 */
@Service
public class MachineMatchService {

  private final DeviceFingerprintRepository fingerprintRepository;

  /** Creates the match service with the fingerprint repository. */
  public MachineMatchService(DeviceFingerprintRepository fingerprintRepository) {
    this.fingerprintRepository = fingerprintRepository;
  }

  /** Returns tiered matches for the given fingerprint. */
  public MachineMatchResult findMatches(DeviceFingerprint current) {
    if (current.getMachineSignature() == null) {
      return new MachineMatchResult(List.of(), List.of());
    }

    List<DeviceFingerprint> candidates =
        fingerprintRepository.findByMachineSignature(current.getMachineSignature());

    UUID currentDeviceId = current.getDevice() == null ? null : current.getDevice().getId();

    Map<UUID, DeviceFingerprint> latestPerDevice = new HashMap<>();
    for (DeviceFingerprint fp : candidates) {
      Device device = fp.getDevice();
      if (device == null) {
        continue;
      }
      UUID deviceId = device.getId();
      if (currentDeviceId != null && currentDeviceId.equals(deviceId)) {
        continue;
      }
      // Hard gates: timezone and locale must co-match (null == null counts as a match).
      if (!Objects.equals(fp.getTimezone(), current.getTimezone())) {
        continue;
      }
      if (!Objects.equals(fp.getLocale(), current.getLocale())) {
        continue;
      }
      DeviceFingerprint existing = latestPerDevice.get(deviceId);
      if (existing == null || fp.getCollectedAt().isAfter(existing.getCollectedAt())) {
        latestPerDevice.put(deviceId, fp);
      }
    }

    List<MachineMatch> strong = new ArrayList<>();
    List<MachineMatch> possible = new ArrayList<>();
    for (DeviceFingerprint fp : latestPerDevice.values()) {
      Device device = fp.getDevice();
      User user = device.getUser();
      MachineMatch match =
          new MachineMatch(
              user.getId(), user.getName(), device.getId(), device.getLabel(), fp.getCollectedAt());
      if (isStrong(current.getPublicIp(), fp.getPublicIp())) {
        strong.add(match);
      } else {
        possible.add(match);
      }
    }

    Comparator<MachineMatch> byLastSeenDesc =
        Comparator.comparing(MachineMatch::lastSeenAt).reversed();
    strong.sort(byLastSeenDesc);
    possible.sort(byLastSeenDesc);
    return new MachineMatchResult(strong, possible);
  }

  /**
   * Two IPs are a strong match when they are equal under {@link Objects#equals}. The both-null case
   * is intentionally treated as strong, consistent with how timezone/locale nulls are handled — if
   * neither side carries an IP, there is no evidence of a network mismatch to demote on. Otherwise
   * (one null, or differing values) the result is a possible match.
   */
  private boolean isStrong(String currentIp, String candidateIp) {
    if (currentIp == null && candidateIp == null) {
      return true;
    }
    if (currentIp == null || candidateIp == null) {
      return false;
    }
    return currentIp.equals(candidateIp);
  }
}
