package com.example.deviceid.controller;

import com.example.deviceid.dto.ScoringThresholds;
import com.example.deviceid.service.ScoringConfigService;
import com.example.deviceid.service.ScoringConfigService.SignalWeightConfig;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** REST endpoints for managing scoring configuration. */
@RestController
@RequestMapping("/api/scoring")
public class ScoringController {

  private final ScoringConfigService scoringConfigService;

  /** Creates the controller with the scoring config service. */
  public ScoringController(ScoringConfigService scoringConfigService) {
    this.scoringConfigService = scoringConfigService;
  }

  /** Returns all signal weight configurations. */
  @GetMapping("/weights")
  public Map<String, SignalWeightConfig> getWeights() {
    return scoringConfigService.getAllWeights();
  }

  /** Updates signal weight configurations. */
  @PutMapping("/weights")
  public Map<String, SignalWeightConfig> updateWeights(
      @RequestBody Map<String, SignalWeightConfig> weights) {
    scoringConfigService.updateWeights(weights);
    return scoringConfigService.getAllWeights();
  }

  /** Returns the current scoring thresholds. */
  @GetMapping("/config")
  public ScoringThresholds getConfig() {
    return new ScoringThresholds(
        scoringConfigService.getSameDeviceThreshold(), scoringConfigService.getDriftThreshold());
  }

  /** Updates the scoring thresholds. */
  @PutMapping("/config")
  public ScoringThresholds updateConfig(@RequestBody ScoringThresholds thresholds) {
    scoringConfigService.updateThresholds(
        thresholds.sameDeviceThreshold(), thresholds.driftThreshold());
    return new ScoringThresholds(
        scoringConfigService.getSameDeviceThreshold(), scoringConfigService.getDriftThreshold());
  }
}
