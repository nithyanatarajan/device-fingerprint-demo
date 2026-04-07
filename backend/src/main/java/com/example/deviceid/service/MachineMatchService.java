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
 * Tiered, per-user, cross-browser machine matching.
 *
 * <p>Two-tier model:
 *
 * <ul>
 *   <li><b>Strong match</b>: hardware signature + timezone + locale + publicIp all align.
 *   <li><b>Possible match</b>: hardware signature + timezone + locale align but publicIp differs
 *       (VPN, café, mobile hotspot, roamed Wi-Fi). Surfaced with an explicit caveat in the UI.
 * </ul>
 *
 * <p>Timezone and locale are hard co-match gates: a mismatch suppresses the candidate from both
 * lists. publicIp is a soft gate that only demotes a candidate from strong to possible.
 *
 * <p><b>Per-user scoping (privacy-first):</b> only fingerprints belonging to the same user as the
 * current visit are considered. Cross-user matching is never performed — we never surface another
 * user's data, even if their hardware happens to match.
 *
 * <p><b>Self-exclusion is per-fingerprint, not per-device.</b> Only the just-saved fingerprint is
 * excluded from the match list. Other fingerprints on the same device row as the current visit
 * (e.g., the user's prior visits before Phase 1's drift logic merged them into a single device) are
 * included — Phase 2 speaks regardless of how Phase 1 categorized them.
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

    if (current.getDevice() == null || current.getDevice().getUser() == null) {
      return new MachineMatchResult(List.of(), List.of());
    }
    UUID currentUserId = current.getDevice().getUser().getId();
    UUID currentFingerprintId = current.getId();

    List<DeviceFingerprint> candidates =
        fingerprintRepository.findByMachineSignature(current.getMachineSignature());

    Map<UUID, DeviceFingerprint> latestPerDevice = new HashMap<>();
    for (DeviceFingerprint fp : candidates) {
      // Per-fingerprint self-exclusion: skip only the just-saved fingerprint by id.
      if (currentFingerprintId != null && currentFingerprintId.equals(fp.getId())) {
        continue;
      }
      Device device = fp.getDevice();
      if (device == null || device.getUser() == null) {
        continue;
      }
      // Per-user scoping: must belong to the same user as the current visit.
      if (!currentUserId.equals(device.getUser().getId())) {
        continue;
      }
      // Hard gates: timezone and locale must co-match (null == null counts as a match).
      if (!Objects.equals(fp.getTimezone(), current.getTimezone())) {
        continue;
      }
      if (!Objects.equals(fp.getLocale(), current.getLocale())) {
        continue;
      }
      UUID deviceId = device.getId();
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
