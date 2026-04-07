package com.example.deviceid.dto;

import com.example.deviceid.domain.MatchResult;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Full investigation payload for one device, returned by {@code GET
 * /api/users/{userId}/devices/{deviceId}/investigation}.
 *
 * <p>Combines device metadata, the full visit timeline, and a per-signal match explanation
 * comparing the latest visit against the previous visit (i.e. the same comparison the scoring
 * engine runs to classify the device). For devices with only one fingerprint there is no comparison
 * to make: {@code matchExplanation} is null and {@code visits} contains the lone entry.
 */
public record DeviceInvestigation(
    UUID deviceId,
    String deviceLabel,
    Instant createdAt,
    Instant lastSeenAt,
    int visitCount,
    List<VisitEntry> visits,
    MatchExplanation matchExplanation) {

  /**
   * Score breakdown for the latest visit compared against the previous visit. Null when the device
   * has fewer than two fingerprints.
   */
  public record MatchExplanation(
      double compositeScore,
      MatchResult classification,
      double sameDeviceThreshold,
      double driftThreshold,
      List<SignalContribution> contributions) {}
}
