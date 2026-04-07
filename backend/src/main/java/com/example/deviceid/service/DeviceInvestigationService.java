package com.example.deviceid.service;

import com.example.deviceid.domain.Device;
import com.example.deviceid.domain.DeviceFingerprint;
import com.example.deviceid.domain.User;
import com.example.deviceid.dto.DeviceInvestigation;
import com.example.deviceid.dto.DeviceInvestigation.MatchExplanation;
import com.example.deviceid.dto.ScoringResult;
import com.example.deviceid.dto.SignalContribution;
import com.example.deviceid.dto.VisitEntry;
import com.example.deviceid.repository.DeviceFingerprintRepository;
import com.example.deviceid.repository.DeviceRepository;
import com.example.deviceid.repository.UserRepository;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Builds the read-only investigation payload for one device — every fingerprint in its history, and
 * a per-signal breakdown of why the latest visit matched (or didn't match) the previous visit under
 * the currently saved scoring config.
 *
 * <p>This service does not persist anything. It is a pure projection over the data the scoring
 * engine already has, exposed in a shape the Tuning Console's investigation modal can render
 * without recomputing scores on the frontend.
 */
@Service
@Transactional(readOnly = true)
public class DeviceInvestigationService {

  private final UserRepository userRepository;
  private final DeviceRepository deviceRepository;
  private final DeviceFingerprintRepository fingerprintRepository;
  private final ScoringEngine scoringEngine;
  private final SignalComparator signalComparator;
  private final ScoringConfigService scoringConfigService;

  /** Creates the service with all of its read-only dependencies. */
  public DeviceInvestigationService(
      UserRepository userRepository,
      DeviceRepository deviceRepository,
      DeviceFingerprintRepository fingerprintRepository,
      ScoringEngine scoringEngine,
      SignalComparator signalComparator,
      ScoringConfigService scoringConfigService) {
    this.userRepository = userRepository;
    this.deviceRepository = deviceRepository;
    this.fingerprintRepository = fingerprintRepository;
    this.scoringEngine = scoringEngine;
    this.signalComparator = signalComparator;
    this.scoringConfigService = scoringConfigService;
  }

  /**
   * Builds the investigation payload for one device. Throws 404 if the user or device does not
   * exist, or if the device does not belong to the given user.
   */
  public DeviceInvestigation investigate(UUID userId, UUID deviceId) {
    User user =
        userRepository
            .findById(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    Device device =
        deviceRepository
            .findById(deviceId)
            .orElseThrow(
                () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Device not found"));
    if (!device.getUser().getId().equals(user.getId())) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Device does not belong to user");
    }

    List<DeviceFingerprint> fingerprints =
        fingerprintRepository.findByDeviceOrderByCollectedAtDesc(device);

    List<VisitEntry> visits = new ArrayList<>();
    for (DeviceFingerprint fp : fingerprints) {
      visits.add(toVisitEntry(fp));
    }

    MatchExplanation explanation = null;
    if (fingerprints.size() >= 2) {
      DeviceFingerprint latest = fingerprints.get(0);
      DeviceFingerprint previous = fingerprints.get(1);
      explanation = buildMatchExplanation(latest, previous);
    }

    return new DeviceInvestigation(
        device.getId(),
        device.getLabel(),
        device.getCreatedAt(),
        device.getLastSeenAt(),
        device.getVisitCount(),
        visits,
        explanation);
  }

  private VisitEntry toVisitEntry(DeviceFingerprint fp) {
    Map<String, Object> signals = new LinkedHashMap<>();
    for (String signalName : ScoringEngine.SIGNAL_NAMES) {
      signals.put(signalName, scoringEngine.getSignalValue(fp, signalName));
    }
    return new VisitEntry(
        fp.getId(), fp.getCollectedAt(), fp.getPublicIp(), fp.getMachineSignature(), signals);
  }

  private MatchExplanation buildMatchExplanation(
      DeviceFingerprint latest, DeviceFingerprint previous) {
    Map<String, ScoringConfigService.SignalWeightConfig> allWeights =
        scoringConfigService.getAllWeights();
    double sameDeviceThreshold = scoringConfigService.getSameDeviceThreshold();
    double driftThreshold = scoringConfigService.getDriftThreshold();
    Map<String, Double> enabledWeights = scoringConfigService.getEnabledWeights();

    // Use the engine for the official composite + classification so the explanation always
    // matches what the scoring engine would say. We compute per-signal contributions
    // independently so we can include disabled / null signals in the breakdown.
    ScoringResult result =
        scoringEngine.score(latest, previous, enabledWeights, sameDeviceThreshold, driftThreshold);

    double totalEnabledWeight =
        enabledWeights.values().stream().mapToDouble(Double::doubleValue).sum();

    List<SignalContribution> contributions = new ArrayList<>();
    for (String signalName : ScoringEngine.SIGNAL_NAMES) {
      ScoringConfigService.SignalWeightConfig config = allWeights.get(signalName);
      double weight = config != null ? config.weight() : 0.0;
      boolean enabled = config != null && config.enabled();

      Object latestValue = scoringEngine.getSignalValue(latest, signalName);
      Object previousValue = scoringEngine.getSignalValue(previous, signalName);

      double similarityScore =
          (latestValue != null && previousValue != null)
              ? signalComparator.compare(signalName, latestValue, previousValue)
              : 0.0;

      // Weighted contribution to the composite, expressed as percentage points (0..100).
      // Disabled signals and signals with null values contribute 0 even if their similarity
      // would have been 1.0 — they don't enter the engine's denominator either.
      double weightedContribution = 0.0;
      if (enabled
          && weight > 0
          && totalEnabledWeight > 0
          && latestValue != null
          && previousValue != null) {
        weightedContribution = (similarityScore * weight / totalEnabledWeight) * 100.0;
      }

      contributions.add(
          new SignalContribution(
              signalName,
              weight,
              enabled,
              latestValue,
              previousValue,
              similarityScore,
              weightedContribution));
    }

    return new MatchExplanation(
        result.score(), result.matchResult(), sameDeviceThreshold, driftThreshold, contributions);
  }
}
