package com.example.deviceid.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.example.deviceid.dto.CollectRequest;
import com.example.deviceid.dto.ScoringPreviewRequest;
import com.example.deviceid.dto.ScoringPreviewResponse;
import com.example.deviceid.service.ScoringConfigService.SignalWeightConfig;
import java.util.LinkedHashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class ScoringPreviewServiceTest {

  @Autowired private ScoringPreviewService scoringPreviewService;
  @Autowired private CollectionService collectionService;
  @Autowired private ScoringConfigService scoringConfigService;

  @Test
  void emptyDatabaseReturnsEmptyUserListAndZeroCounts() {
    ScoringPreviewResponse response = scoringPreviewService.preview(currentConfigRequest());

    assertThat(response.users()).isEmpty();
    assertThat(response.summary().totalUsers()).isZero();
    assertThat(response.summary().totalDevices()).isZero();
    assertThat(response.summary().totalFingerprints()).isZero();
    assertThat(response.summary().affectedDevices()).isZero();
    assertThat(response.summary().promotedCount()).isZero();
    assertThat(response.summary().demotedCount()).isZero();
    assertThat(response.summary().unchangedCount()).isZero();
  }

  @Test
  void singleFingerprintDeviceClassifiesAsNewDeviceUnchanged() {
    collectionService.collect(baselineRequest("testuser"), "203.0.113.10");

    ScoringPreviewResponse response = scoringPreviewService.preview(currentConfigRequest());

    assertThat(response.users()).hasSize(1);
    assertThat(response.users().get(0).devices()).hasSize(1);
    assertThat(response.users().get(0).devices().get(0).currentClassification())
        .isEqualTo(com.example.deviceid.domain.MatchResult.NEW_DEVICE);
    assertThat(response.users().get(0).devices().get(0).proposedClassification())
        .isEqualTo(com.example.deviceid.domain.MatchResult.NEW_DEVICE);
    assertThat(response.users().get(0).devices().get(0).transition()).isEqualTo("UNCHANGED");
    assertThat(response.summary().totalFingerprints()).isEqualTo(1);
    assertThat(response.summary().unchangedCount()).isEqualTo(1);
    assertThat(response.summary().affectedDevices()).isZero();
  }

  @Test
  void unchangedConfigProducesAllUnchangedTransitions() {
    // Two fingerprints on same device → there's actually a comparison to make.
    collectionService.collect(baselineRequest("testuser"), "203.0.113.10");
    collectionService.collect(baselineRequest("testuser"), "203.0.113.10");

    ScoringPreviewResponse response = scoringPreviewService.preview(currentConfigRequest());

    assertThat(response.users()).hasSize(1);
    assertThat(response.users().get(0).devices()).hasSize(1);
    assertThat(response.users().get(0).devices().get(0).transition()).isEqualTo("UNCHANGED");
    assertThat(response.summary().affectedDevices()).isZero();
    assertThat(response.summary().promotedCount()).isZero();
    assertThat(response.summary().demotedCount()).isZero();
    assertThat(response.summary().unchangedCount()).isEqualTo(1);
  }

  @Test
  void zeroingAllWeightsDemoteSameDeviceToNewDevice() {
    // Two identical visits → SAME_DEVICE under default weights.
    collectionService.collect(baselineRequest("testuser"), "203.0.113.10");
    collectionService.collect(baselineRequest("testuser"), "203.0.113.10");

    // Propose all weights at zero → composite score becomes 0 → NEW_DEVICE.
    Map<String, SignalWeightConfig> proposedWeights = allWeightsZeroed();
    ScoringPreviewRequest request =
        new ScoringPreviewRequest(
            proposedWeights,
            scoringConfigService.getSameDeviceThreshold(),
            scoringConfigService.getDriftThreshold());

    ScoringPreviewResponse response = scoringPreviewService.preview(request);

    assertThat(response.users()).hasSize(1);
    assertThat(response.users().get(0).devices().get(0).currentClassification())
        .isEqualTo(com.example.deviceid.domain.MatchResult.SAME_DEVICE);
    assertThat(response.users().get(0).devices().get(0).proposedClassification())
        .isEqualTo(com.example.deviceid.domain.MatchResult.NEW_DEVICE);
    assertThat(response.users().get(0).devices().get(0).transition()).isEqualTo("DEMOTED");
    assertThat(response.summary().demotedCount()).isEqualTo(1);
    assertThat(response.summary().affectedDevices()).isEqualTo(1);
    assertThat(response.summary().promotedCount()).isZero();
  }

  @Test
  void multiUserSummaryCountsAggregateAcrossUsers() {
    collectionService.collect(baselineRequest("userA"), "203.0.113.10");
    collectionService.collect(baselineRequest("userA"), "203.0.113.10");
    collectionService.collect(baselineRequest("userB"), "203.0.113.20");
    collectionService.collect(baselineRequest("userB"), "203.0.113.20");

    Map<String, SignalWeightConfig> proposedWeights = allWeightsZeroed();
    ScoringPreviewRequest request =
        new ScoringPreviewRequest(
            proposedWeights,
            scoringConfigService.getSameDeviceThreshold(),
            scoringConfigService.getDriftThreshold());

    ScoringPreviewResponse response = scoringPreviewService.preview(request);

    assertThat(response.summary().totalUsers()).isEqualTo(2);
    assertThat(response.summary().totalDevices()).isEqualTo(2);
    assertThat(response.summary().totalFingerprints()).isEqualTo(4);
    assertThat(response.summary().demotedCount()).isEqualTo(2);
    assertThat(response.summary().affectedDevices()).isEqualTo(2);
  }

  @Test
  void previewIsReadOnlyAndDoesNotModifyConfig() {
    double originalSameThreshold = scoringConfigService.getSameDeviceThreshold();
    double originalDriftThreshold = scoringConfigService.getDriftThreshold();
    Map<String, SignalWeightConfig> originalWeights = scoringConfigService.getAllWeights();

    ScoringPreviewRequest request = new ScoringPreviewRequest(allWeightsZeroed(), 50.0, 25.0);
    scoringPreviewService.preview(request);

    assertThat(scoringConfigService.getSameDeviceThreshold()).isEqualTo(originalSameThreshold);
    assertThat(scoringConfigService.getDriftThreshold()).isEqualTo(originalDriftThreshold);
    assertThat(scoringConfigService.getAllWeights()).isEqualTo(originalWeights);
  }

  private ScoringPreviewRequest currentConfigRequest() {
    return new ScoringPreviewRequest(
        scoringConfigService.getAllWeights(),
        scoringConfigService.getSameDeviceThreshold(),
        scoringConfigService.getDriftThreshold());
  }

  private Map<String, SignalWeightConfig> allWeightsZeroed() {
    Map<String, SignalWeightConfig> result = new LinkedHashMap<>();
    for (Map.Entry<String, SignalWeightConfig> entry :
        scoringConfigService.getAllWeights().entrySet()) {
      result.put(entry.getKey(), new SignalWeightConfig(0.0, true));
    }
    return result;
  }

  private CollectRequest baselineRequest(String name) {
    return new CollectRequest(
        name,
        "canvas-baseline",
        "NVIDIA GeForce GTX 1080",
        "1920x1080",
        24,
        2.0,
        "America/New_York",
        "en-US",
        "MacIntel",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0.0",
        8,
        16.0,
        0,
        "video/webm,video/mp4,audio/ogg",
        false,
        true,
        "font-hash-baseline");
  }
}
