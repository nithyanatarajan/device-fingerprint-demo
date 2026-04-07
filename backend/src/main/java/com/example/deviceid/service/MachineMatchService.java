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
import java.util.UUID;
import org.springframework.stereotype.Service;

/**
 * Finds other devices sharing both the hardware machine signature and the public IP address.
 *
 * <p>This is a hard co-match: both signature AND IP must match. False negatives are preferred over
 * false positives. Self-matches (the current device) are excluded. Cross-user matches are
 * intentional — a user re-registering on the same machine should surface the prior identity.
 */
@Service
public class MachineMatchService {

  private final DeviceFingerprintRepository fingerprintRepository;

  /** Creates the match service with the fingerprint repository. */
  public MachineMatchService(DeviceFingerprintRepository fingerprintRepository) {
    this.fingerprintRepository = fingerprintRepository;
  }

  /** Returns matches for the given fingerprint, or an empty result if signature/IP missing. */
  public MachineMatchResult findMatches(DeviceFingerprint current) {
    if (current.getMachineSignature() == null || current.getPublicIp() == null) {
      return new MachineMatchResult(List.of());
    }

    List<DeviceFingerprint> candidates =
        fingerprintRepository.findByMachineSignatureAndPublicIp(
            current.getMachineSignature(), current.getPublicIp());

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
      DeviceFingerprint existing = latestPerDevice.get(deviceId);
      if (existing == null || fp.getCollectedAt().isAfter(existing.getCollectedAt())) {
        latestPerDevice.put(deviceId, fp);
      }
    }

    List<MachineMatch> matches = new ArrayList<>();
    for (DeviceFingerprint fp : latestPerDevice.values()) {
      Device device = fp.getDevice();
      User user = device.getUser();
      matches.add(
          new MachineMatch(
              user.getId(),
              user.getName(),
              device.getId(),
              device.getLabel(),
              fp.getCollectedAt()));
    }

    matches.sort(Comparator.comparing(MachineMatch::lastSeenAt).reversed());
    return new MachineMatchResult(matches);
  }
}
