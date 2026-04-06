package com.example.deviceid.domain;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class MatchResultTest {

  @Test
  void shouldHaveThreeValues() {
    MatchResult[] values = MatchResult.values();
    assertThat(values).hasSize(3);
    assertThat(values)
        .containsExactly(
            MatchResult.SAME_DEVICE, MatchResult.DRIFT_DETECTED, MatchResult.NEW_DEVICE);
  }

  @Test
  void valueOfShouldReturnCorrectEnum() {
    assertThat(MatchResult.valueOf("SAME_DEVICE")).isEqualTo(MatchResult.SAME_DEVICE);
    assertThat(MatchResult.valueOf("DRIFT_DETECTED")).isEqualTo(MatchResult.DRIFT_DETECTED);
    assertThat(MatchResult.valueOf("NEW_DEVICE")).isEqualTo(MatchResult.NEW_DEVICE);
  }
}
