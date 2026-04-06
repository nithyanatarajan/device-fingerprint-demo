package com.example.deviceid.service;

import com.example.deviceid.domain.DeviceFingerprint;
import com.example.deviceid.domain.MatchResult;
import com.example.deviceid.dto.ScoringResult;
import com.example.deviceid.dto.SignalComparisonResult;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

/** Scores the similarity between two device fingerprints using weighted signals. */
@Service
public class ScoringEngine {

  static final List<String> SIGNAL_NAMES =
      List.of(
          "canvas_hash",
          "webgl_renderer",
          "screen_resolution",
          "color_depth",
          "pixel_ratio",
          "timezone",
          "locale",
          "platform",
          "user_agent",
          "hardware_concurrency",
          "device_memory",
          "touch_support",
          "codec_support",
          "dnt_enabled",
          "cookie_enabled");

  private final SignalComparator signalComparator;

  /** Creates a scoring engine with the given signal comparator. */
  public ScoringEngine(SignalComparator signalComparator) {
    this.signalComparator = signalComparator;
  }

  /** Scores two fingerprints, returning a composite score and match classification. */
  public ScoringResult score(
      DeviceFingerprint fp1,
      DeviceFingerprint fp2,
      Map<String, Double> weights,
      double sameDeviceThreshold,
      double driftThreshold) {

    List<SignalComparisonResult> comparisons = new ArrayList<>();
    double weightedSum = 0.0;
    double totalWeight = 0.0;

    for (String signalName : SIGNAL_NAMES) {
      Double weight = weights.get(signalName);
      if (weight == null || weight <= 0) {
        continue;
      }

      Object val1 = getSignalValue(fp1, signalName);
      Object val2 = getSignalValue(fp2, signalName);

      // Skip signals where either value is null
      if (val1 == null || val2 == null) {
        continue;
      }

      double signalScore = signalComparator.compare(signalName, val1, val2);
      comparisons.add(new SignalComparisonResult(signalName, signalScore, val1, val2));
      weightedSum += signalScore * weight;
      totalWeight += weight;
    }

    double compositeScore = totalWeight > 0 ? (weightedSum / totalWeight) * 100.0 : 0.0;

    MatchResult matchResult;
    if (compositeScore >= sameDeviceThreshold) {
      matchResult = MatchResult.SAME_DEVICE;
    } else if (compositeScore >= driftThreshold) {
      matchResult = MatchResult.DRIFT_DETECTED;
    } else {
      matchResult = MatchResult.NEW_DEVICE;
    }

    return new ScoringResult(compositeScore, matchResult, comparisons);
  }

  @SuppressWarnings("CyclomaticComplexity")
  private Object getSignalValue(DeviceFingerprint fp, String signalName) {
    return switch (signalName) {
      case "canvas_hash" -> fp.getCanvasHash();
      case "webgl_renderer" -> fp.getWebglRenderer();
      case "screen_resolution" -> fp.getScreenResolution();
      case "color_depth" -> fp.getColorDepth();
      case "pixel_ratio" -> fp.getPixelRatio();
      case "timezone" -> fp.getTimezone();
      case "locale" -> fp.getLocale();
      case "platform" -> fp.getPlatform();
      case "user_agent" -> fp.getUserAgent();
      case "hardware_concurrency" -> fp.getHardwareConcurrency();
      case "device_memory" -> fp.getDeviceMemory();
      case "touch_support" -> fp.getTouchSupport();
      case "codec_support" -> fp.getCodecSupport();
      case "dnt_enabled" -> fp.getDntEnabled();
      case "cookie_enabled" -> fp.getCookieEnabled();
      default -> null;
    };
  }
}
