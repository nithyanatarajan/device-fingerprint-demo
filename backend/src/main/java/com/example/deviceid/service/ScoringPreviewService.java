package com.example.deviceid.service;

import com.example.deviceid.domain.Device;
import com.example.deviceid.domain.DeviceFingerprint;
import com.example.deviceid.domain.MatchResult;
import com.example.deviceid.domain.User;
import com.example.deviceid.dto.DevicePreview;
import com.example.deviceid.dto.PreviewSummary;
import com.example.deviceid.dto.ScoringPreviewRequest;
import com.example.deviceid.dto.ScoringPreviewResponse;
import com.example.deviceid.dto.ScoringResult;
import com.example.deviceid.dto.UserPreview;
import com.example.deviceid.repository.DeviceFingerprintRepository;
import com.example.deviceid.repository.DeviceRepository;
import com.example.deviceid.repository.UserRepository;
import com.example.deviceid.service.ScoringConfigService.SignalWeightConfig;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Read-only service that re-runs Phase 1 scoring for every stored fingerprint per user with a
 * proposed config and computes a per-device classification diff. Never modifies state.
 */
@Service
public class ScoringPreviewService {

  static final String TRANSITION_UNCHANGED = "UNCHANGED";
  static final String TRANSITION_PROMOTED = "PROMOTED";
  static final String TRANSITION_DEMOTED = "DEMOTED";

  private final UserRepository userRepository;
  private final DeviceRepository deviceRepository;
  private final DeviceFingerprintRepository fingerprintRepository;
  private final ScoringEngine scoringEngine;
  private final ScoringConfigService scoringConfigService;

  /** Creates the preview service with required dependencies. */
  public ScoringPreviewService(
      UserRepository userRepository,
      DeviceRepository deviceRepository,
      DeviceFingerprintRepository fingerprintRepository,
      ScoringEngine scoringEngine,
      ScoringConfigService scoringConfigService) {
    this.userRepository = userRepository;
    this.deviceRepository = deviceRepository;
    this.fingerprintRepository = fingerprintRepository;
    this.scoringEngine = scoringEngine;
    this.scoringConfigService = scoringConfigService;
  }

  /** Computes the ripple-effect preview without persisting anything. */
  @Transactional(readOnly = true)
  public ScoringPreviewResponse preview(ScoringPreviewRequest request) {
    Map<String, Double> currentWeights = scoringConfigService.getEnabledWeights();
    double currentSameThreshold = scoringConfigService.getSameDeviceThreshold();
    double currentDriftThreshold = scoringConfigService.getDriftThreshold();

    Map<String, Double> proposedWeights = enabledWeightsFrom(request.weights());
    double proposedSameThreshold = request.sameDeviceThreshold();
    double proposedDriftThreshold = request.driftThreshold();

    List<UserPreview> userPreviews = new ArrayList<>();
    int totalDevices = 0;
    int totalFingerprints = 0;
    int affectedDevices = 0;
    int promotedCount = 0;
    int demotedCount = 0;
    int unchangedCount = 0;

    List<User> users = userRepository.findAll();
    for (User user : users) {
      List<Device> devices = deviceRepository.findByUser(user);
      List<DevicePreview> devicePreviews = new ArrayList<>();
      for (Device device : devices) {
        List<DeviceFingerprint> history =
            fingerprintRepository.findByDeviceOrderByCollectedAtDesc(device);
        totalDevices++;
        totalFingerprints += history.size();

        DevicePreview dp =
            buildDevicePreview(
                device,
                history,
                currentWeights,
                currentSameThreshold,
                currentDriftThreshold,
                proposedWeights,
                proposedSameThreshold,
                proposedDriftThreshold);
        devicePreviews.add(dp);

        switch (dp.transition()) {
          case TRANSITION_PROMOTED -> {
            promotedCount++;
            affectedDevices++;
          }
          case TRANSITION_DEMOTED -> {
            demotedCount++;
            affectedDevices++;
          }
          default -> unchangedCount++;
        }
      }
      userPreviews.add(new UserPreview(user.getId(), user.getName(), devicePreviews));
    }

    PreviewSummary summary =
        new PreviewSummary(
            users.size(),
            totalDevices,
            totalFingerprints,
            affectedDevices,
            promotedCount,
            demotedCount,
            unchangedCount);
    return new ScoringPreviewResponse(userPreviews, summary);
  }

  private DevicePreview buildDevicePreview(
      Device device,
      List<DeviceFingerprint> historyDesc,
      Map<String, Double> currentWeights,
      double currentSameThreshold,
      double currentDriftThreshold,
      Map<String, Double> proposedWeights,
      double proposedSameThreshold,
      double proposedDriftThreshold) {
    int fpCount = historyDesc.size();
    if (fpCount < 2) {
      return new DevicePreview(
          device.getId(),
          device.getLabel(),
          fpCount,
          MatchResult.NEW_DEVICE,
          MatchResult.NEW_DEVICE,
          0.0,
          0.0,
          TRANSITION_UNCHANGED);
    }
    DeviceFingerprint latest = historyDesc.get(0);
    DeviceFingerprint previous = historyDesc.get(1);

    ScoringResult currentResult =
        scoringEngine.score(
            previous, latest, currentWeights, currentSameThreshold, currentDriftThreshold);
    ScoringResult proposedResult =
        scoringEngine.score(
            previous, latest, proposedWeights, proposedSameThreshold, proposedDriftThreshold);

    String transition =
        classifyTransition(currentResult.matchResult(), proposedResult.matchResult());

    return new DevicePreview(
        device.getId(),
        device.getLabel(),
        fpCount,
        currentResult.matchResult(),
        proposedResult.matchResult(),
        currentResult.score(),
        proposedResult.score(),
        transition);
  }

  static String classifyTransition(MatchResult current, MatchResult proposed) {
    if (current == proposed) {
      return TRANSITION_UNCHANGED;
    }
    int currentRank = rank(current);
    int proposedRank = rank(proposed);
    return proposedRank > currentRank ? TRANSITION_PROMOTED : TRANSITION_DEMOTED;
  }

  private static int rank(MatchResult result) {
    return switch (result) {
      case NEW_DEVICE -> 0;
      case DRIFT_DETECTED -> 1;
      case SAME_DEVICE -> 2;
    };
  }

  private static Map<String, Double> enabledWeightsFrom(Map<String, SignalWeightConfig> weights) {
    if (weights == null) {
      return Map.of();
    }
    return weights.entrySet().stream()
        .filter(e -> e.getValue() != null && e.getValue().enabled())
        .collect(Collectors.toMap(Map.Entry::getKey, e -> e.getValue().weight()));
  }
}
