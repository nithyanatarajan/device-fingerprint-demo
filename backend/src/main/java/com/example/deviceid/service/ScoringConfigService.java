package com.example.deviceid.service;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

/** Manages scoring configuration including signal weights and thresholds. */
@Service
public class ScoringConfigService {

  /** Configuration for a single signal weight. */
  public record SignalWeightConfig(double weight, boolean enabled) {}

  private static final double DEFAULT_SAME_DEVICE_THRESHOLD = 85.0;
  private static final double DEFAULT_DRIFT_THRESHOLD = 60.0;

  private final Map<String, SignalWeightConfig> weights = new LinkedHashMap<>();
  private double sameDeviceThreshold = DEFAULT_SAME_DEVICE_THRESHOLD;
  private double driftThreshold = DEFAULT_DRIFT_THRESHOLD;

  /** Creates the service with default weight configuration. */
  public ScoringConfigService() {
    initDefaultWeights();
  }

  private void initDefaultWeights() {
    weights.put("canvas_hash", new SignalWeightConfig(90, true));
    weights.put("webgl_renderer", new SignalWeightConfig(85, true));
    weights.put("touch_support", new SignalWeightConfig(70, true));
    weights.put("platform", new SignalWeightConfig(60, true));
    weights.put("hardware_concurrency", new SignalWeightConfig(50, true));
    weights.put("device_memory", new SignalWeightConfig(50, true));
    weights.put("pixel_ratio", new SignalWeightConfig(45, true));
    weights.put("screen_resolution", new SignalWeightConfig(40, true));
    weights.put("codec_support", new SignalWeightConfig(35, true));
    weights.put("user_agent", new SignalWeightConfig(30, true));
    weights.put("timezone", new SignalWeightConfig(20, true));
    weights.put("locale", new SignalWeightConfig(15, true));
    weights.put("color_depth", new SignalWeightConfig(15, true));
    weights.put("dnt_enabled", new SignalWeightConfig(10, true));
    weights.put("cookie_enabled", new SignalWeightConfig(5, true));
  }

  /** Returns weights for enabled signals only. */
  public Map<String, Double> getEnabledWeights() {
    return weights.entrySet().stream()
        .filter(e -> e.getValue().enabled())
        .collect(Collectors.toMap(Map.Entry::getKey, e -> e.getValue().weight()));
  }

  /** Returns all weight configurations. */
  public Map<String, SignalWeightConfig> getAllWeights() {
    return new LinkedHashMap<>(weights);
  }

  /** Updates signal weights from the provided map. */
  public void updateWeights(Map<String, SignalWeightConfig> newWeights) {
    for (Map.Entry<String, SignalWeightConfig> entry : newWeights.entrySet()) {
      if (weights.containsKey(entry.getKey())) {
        weights.put(entry.getKey(), entry.getValue());
      }
    }
  }

  /** Returns the same-device threshold. */
  public double getSameDeviceThreshold() {
    return sameDeviceThreshold;
  }

  /** Returns the drift-detection threshold. */
  public double getDriftThreshold() {
    return driftThreshold;
  }

  /** Updates both scoring thresholds. */
  public void updateThresholds(double sameDeviceThreshold, double driftThreshold) {
    this.sameDeviceThreshold = sameDeviceThreshold;
    this.driftThreshold = driftThreshold;
  }
}
