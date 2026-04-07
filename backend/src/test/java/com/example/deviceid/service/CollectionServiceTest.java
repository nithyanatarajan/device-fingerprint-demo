package com.example.deviceid.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.example.deviceid.domain.MatchResult;
import com.example.deviceid.dto.CollectRequest;
import com.example.deviceid.dto.CollectResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class CollectionServiceTest {

  @Autowired private CollectionService collectionService;

  @Test
  void firstVisitShouldCreateUserAndDevice() {
    CollectResponse response = collectionService.collect(createRequest("testuser"), "203.0.113.10");

    assertThat(response.userId()).isNotNull();
    assertThat(response.deviceId()).isNotNull();
    assertThat(response.matchResult()).isEqualTo(MatchResult.NEW_DEVICE);
    assertThat(response.deviceLabel()).isEqualTo("Chrome on MacOS");
  }

  @Test
  void returnVisitShouldMatchDevice() {
    collectionService.collect(createRequest("testuser"), "203.0.113.10");
    CollectResponse second = collectionService.collect(createRequest("testuser"), "203.0.113.10");

    assertThat(second.matchResult()).isEqualTo(MatchResult.SAME_DEVICE);
    assertThat(second.score()).isGreaterThan(0);
  }

  @Test
  void differentDeviceShouldBeDetected() {
    collectionService.collect(createRequest("testuser"), "203.0.113.10");
    CollectResponse second =
        collectionService.collect(createDifferentDeviceRequest("testuser"), "203.0.113.10");

    assertThat(second.matchResult()).isEqualTo(MatchResult.NEW_DEVICE);
  }

  @Test
  void nameShouldBeCaseInsensitive() {
    CollectResponse first = collectionService.collect(createRequest("TestUser"), "203.0.113.10");
    CollectResponse second = collectionService.collect(createRequest("testuser"), "203.0.113.10");

    assertThat(first.userId()).isEqualTo(second.userId());
    assertThat(second.matchResult()).isEqualTo(MatchResult.SAME_DEVICE);
  }

  @Test
  void responseShouldIncludeMachineMatchPopulated() {
    CollectResponse response = collectionService.collect(createRequest("testuser"), "203.0.113.10");

    assertThat(response.machineMatch()).isNotNull();
    assertThat(response.machineMatch().strongMatches()).isEmpty();
    assertThat(response.machineMatch().possibleMatches()).isEmpty();
  }

  @Test
  void crossUserSameMachineShouldNotSurfaceUnderPerUserScoping() {
    collectionService.collect(createRequest("userA"), "203.0.113.10");
    CollectResponse second = collectionService.collect(createRequest("userB"), "203.0.113.10");

    assertThat(second.machineMatch()).isNotNull();
    assertThat(second.machineMatch().strongMatches()).isEmpty();
    assertThat(second.machineMatch().possibleMatches()).isEmpty();
  }

  @Test
  void crossUserSameMachineDifferentNetworkShouldNotSurfaceUnderPerUserScoping() {
    collectionService.collect(createRequest("userA"), "203.0.113.10");
    CollectResponse second = collectionService.collect(createRequest("userB"), "198.51.100.20");

    assertThat(second.machineMatch()).isNotNull();
    assertThat(second.machineMatch().strongMatches()).isEmpty();
    assertThat(second.machineMatch().possibleMatches()).isEmpty();
  }

  @Test
  void sameUserSecondVisitShouldSurfacePriorFingerprintOnSameDeviceAsStrongMatch() {
    CollectResponse first = collectionService.collect(createRequest("testuser"), "203.0.113.10");
    CollectResponse second = collectionService.collect(createRequest("testuser"), "203.0.113.10");

    // Phase 1 will recognize this as SAME_DEVICE and reuse the device row.
    assertThat(second.deviceId()).isEqualTo(first.deviceId());

    // Phase 2 speaks independently: the prior fingerprint on the same device row is
    // included in the match list under per-fingerprint self-exclusion.
    assertThat(second.machineMatch()).isNotNull();
    assertThat(second.machineMatch().possibleMatches()).isEmpty();
    assertThat(second.machineMatch().strongMatches()).hasSize(1);
    assertThat(second.machineMatch().strongMatches().get(0).deviceId()).isEqualTo(first.deviceId());
    assertThat(second.machineMatch().strongMatches().get(0).userId()).isEqualTo(first.userId());
  }

  @Test
  void returnVisitWithChangedSignalsShouldReportChanges() {
    collectionService.collect(createRequest("testuser"), "203.0.113.10");

    CollectRequest modified =
        new CollectRequest(
            "testuser",
            "abc123",
            "NVIDIA GeForce GTX 1080",
            "1920x1080",
            24,
            2.0,
            "Europe/London",
            "en-US",
            "MacIntel",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/121.0.0",
            8,
            16.0,
            0,
            "video/webm,video/mp4,audio/ogg",
            false,
            true);

    CollectResponse response = collectionService.collect(modified, "203.0.113.10");

    // Should still match (canvas, webgl, etc. are same) but with some changes
    assertThat(response.matchResult()).isNotEqualTo(MatchResult.NEW_DEVICE);
    assertThat(response.changedSignals()).isNotEmpty();
  }

  private CollectRequest createRequest(String name) {
    return new CollectRequest(
        name,
        "abc123",
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
        true);
  }

  private CollectRequest createDifferentDeviceRequest(String name) {
    return new CollectRequest(
        name,
        "xyz789",
        "Intel HD Graphics",
        "1366x768",
        32,
        1.0,
        "Europe/London",
        "en-GB",
        "Win32",
        "Mozilla/5.0 (Windows NT 10.0; Win64) Firefox/119.0",
        4,
        8.0,
        5,
        "audio/wav,audio/flac",
        true,
        false);
  }
}
