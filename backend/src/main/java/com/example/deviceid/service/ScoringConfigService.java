package com.example.deviceid.service;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

/** Manages scoring configuration including signal weights and thresholds. */
@Service
public class ScoringConfigService {

  /** Configuration for a single signal weight. */
  public record SignalWeightConfig(double weight, boolean enabled) {}

  /** Canonical default same-device threshold. */
  public static final double DEFAULT_SAME_DEVICE_THRESHOLD = 85.0;

  /** Canonical default drift-detection threshold. */
  public static final double DEFAULT_DRIFT_THRESHOLD = 60.0;

  /**
   * Canonical default signal weights — single source of truth used by both the constructor and
   * {@link #resetToDefaults}. Insertion order is preserved by the {@link LinkedHashMap} so the
   * Tuning Console renders sliders in weight-descending order.
   */
  public static final Map<String, SignalWeightConfig> DEFAULT_WEIGHTS = buildDefaultWeights();

  private static Map<String, SignalWeightConfig> buildDefaultWeights() {
    Map<String, SignalWeightConfig> defaults = new LinkedHashMap<>();
    defaults.put("canvas_hash", new SignalWeightConfig(90, true));
    defaults.put("webgl_renderer", new SignalWeightConfig(85, true));
    defaults.put("touch_support", new SignalWeightConfig(70, true));
    defaults.put("platform", new SignalWeightConfig(60, true));
    defaults.put("hardware_concurrency", new SignalWeightConfig(50, true));
    defaults.put("device_memory", new SignalWeightConfig(50, true));
    defaults.put("pixel_ratio", new SignalWeightConfig(45, true));
    defaults.put("screen_resolution", new SignalWeightConfig(40, true));
    defaults.put("codec_support", new SignalWeightConfig(35, true));
    defaults.put("user_agent", new SignalWeightConfig(30, true));
    defaults.put("timezone", new SignalWeightConfig(20, true));
    defaults.put("locale", new SignalWeightConfig(15, true));
    defaults.put("color_depth", new SignalWeightConfig(15, true));
    defaults.put("dnt_enabled", new SignalWeightConfig(10, true));
    defaults.put("cookie_enabled", new SignalWeightConfig(5, true));
    return Collections.unmodifiableMap(defaults);
  }

  private final Map<String, SignalWeightConfig> weights = new LinkedHashMap<>();
  private double sameDeviceThreshold = DEFAULT_SAME_DEVICE_THRESHOLD;
  private double driftThreshold = DEFAULT_DRIFT_THRESHOLD;

  /** Creates the service with default weight configuration. */
  public ScoringConfigService() {
    weights.putAll(DEFAULT_WEIGHTS);
  }

  /**
   * Resets all weights and thresholds to the canonical defaults defined in {@link
   * #DEFAULT_WEIGHTS}, {@link #DEFAULT_SAME_DEVICE_THRESHOLD}, and {@link
   * #DEFAULT_DRIFT_THRESHOLD}. Backs the Tuning Console's "Reset to defaults" buttons.
   */
  public void resetToDefaults() {
    weights.clear();
    weights.putAll(DEFAULT_WEIGHTS);
    sameDeviceThreshold = DEFAULT_SAME_DEVICE_THRESHOLD;
    driftThreshold = DEFAULT_DRIFT_THRESHOLD;
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
