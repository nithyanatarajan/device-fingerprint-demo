package com.example.deviceid.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.example.deviceid.service.ScoringConfigService.SignalWeightConfig;
import java.util.Map;
import org.junit.jupiter.api.Test;

class ScoringConfigServiceTest {

  @Test
  void defaultWeightsShouldExist() {
    ScoringConfigService service = new ScoringConfigService();
    Map<String, SignalWeightConfig> weights = service.getAllWeights();

    assertThat(weights).hasSize(15);
    assertThat(weights.get("canvas_hash").weight()).isEqualTo(90.0);
    assertThat(weights.get("cookie_enabled").weight()).isEqualTo(5.0);
  }

  @Test
  void getEnabledWeightsShouldFilterDisabled() {
    ScoringConfigService service = new ScoringConfigService();
    service.updateWeights(Map.of("canvas_hash", new SignalWeightConfig(90, false)));

    Map<String, Double> enabled = service.getEnabledWeights();

    assertThat(enabled).doesNotContainKey("canvas_hash");
    assertThat(enabled).hasSize(14);
  }

  @Test
  void updateThresholdsShouldPersist() {
    ScoringConfigService service = new ScoringConfigService();
    service.updateThresholds(90.0, 70.0);

    assertThat(service.getSameDeviceThreshold()).isEqualTo(90.0);
    assertThat(service.getDriftThreshold()).isEqualTo(70.0);
  }

  @Test
  void defaultThresholdsShouldBeCorrect() {
    ScoringConfigService service = new ScoringConfigService();

    assertThat(service.getSameDeviceThreshold()).isEqualTo(85.0);
    assertThat(service.getDriftThreshold()).isEqualTo(60.0);
  }

  @Test
  void updateWeightsShouldOnlyUpdateKnownSignals() {
    ScoringConfigService service = new ScoringConfigService();
    service.updateWeights(Map.of("unknown_signal", new SignalWeightConfig(100, true)));

    assertThat(service.getAllWeights()).doesNotContainKey("unknown_signal");
    assertThat(service.getAllWeights()).hasSize(15);
  }

  @Test
  void updateWeightsShouldChangeExistingValues() {
    ScoringConfigService service = new ScoringConfigService();
    service.updateWeights(Map.of("canvas_hash", new SignalWeightConfig(50, true)));

    assertThat(service.getAllWeights().get("canvas_hash").weight()).isEqualTo(50.0);
  }
}
