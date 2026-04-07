package com.example.deviceid.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.deviceid.service.ScoringConfigService;
import com.example.deviceid.service.ScoringConfigService.SignalWeightConfig;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

@SpringBootTest
class ScoringControllerTest {

  @Autowired private WebApplicationContext webApplicationContext;

  @Autowired private ScoringConfigService scoringConfigService;

  private MockMvc mockMvc;

  @BeforeEach
  void setUp() {
    mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext).build();
    // Reset to defaults before each test to ensure independence
    scoringConfigService.updateThresholds(85.0, 60.0);
    scoringConfigService.updateWeights(Map.of("canvas_hash", new SignalWeightConfig(90, true)));
  }

  @Test
  void getWeightsShouldReturnDefaults() throws Exception {
    mockMvc
        .perform(get("/api/scoring/weights"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.canvas_hash.weight").value(90.0))
        .andExpect(jsonPath("$.canvas_hash.enabled").value(true));
  }

  @Test
  void getConfigShouldReturnThresholds() throws Exception {
    mockMvc
        .perform(get("/api/scoring/config"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.sameDeviceThreshold").value(85.0))
        .andExpect(jsonPath("$.driftThreshold").value(60.0));
  }

  @Test
  void putConfigShouldPersistThresholds() throws Exception {
    mockMvc
        .perform(
            put("/api/scoring/config")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"sameDeviceThreshold": 90.0, "driftThreshold": 70.0}
                    """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.sameDeviceThreshold").value(90.0))
        .andExpect(jsonPath("$.driftThreshold").value(70.0));

    // Verify persistence
    mockMvc
        .perform(get("/api/scoring/config"))
        .andExpect(jsonPath("$.sameDeviceThreshold").value(90.0))
        .andExpect(jsonPath("$.driftThreshold").value(70.0));
  }

  @Test
  void putWeightsShouldUpdateAndReturn() throws Exception {
    mockMvc
        .perform(
            put("/api/scoring/weights")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"canvas_hash": {"weight": 50.0, "enabled": false}}
                    """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.canvas_hash.weight").value(50.0))
        .andExpect(jsonPath("$.canvas_hash.enabled").value(false));
  }

  @Test
  void postPreviewWithEmptyDatabaseReturnsEmptyUserListAndZeroSummary() throws Exception {
    mockMvc
        .perform(
            post("/api/scoring/preview")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {
                      "weights": {"canvas_hash": {"weight": 90.0, "enabled": true}},
                      "sameDeviceThreshold": 85.0,
                      "driftThreshold": 60.0
                    }
                    """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.users").isArray())
        .andExpect(jsonPath("$.users.length()").value(0))
        .andExpect(jsonPath("$.summary.totalUsers").value(0))
        .andExpect(jsonPath("$.summary.totalDevices").value(0))
        .andExpect(jsonPath("$.summary.totalFingerprints").value(0))
        .andExpect(jsonPath("$.summary.affectedDevices").value(0));
  }

  @Test
  void postPreviewDoesNotPersistProposedConfig() throws Exception {
    double originalSameDeviceThreshold = scoringConfigService.getSameDeviceThreshold();
    double originalDriftThreshold = scoringConfigService.getDriftThreshold();
    Map<String, SignalWeightConfig> originalWeights = scoringConfigService.getAllWeights();

    mockMvc
        .perform(
            post("/api/scoring/preview")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {
                      "weights": {"canvas_hash": {"weight": 1.0, "enabled": true}},
                      "sameDeviceThreshold": 50.0,
                      "driftThreshold": 25.0
                    }
                    """))
        .andExpect(status().isOk());

    assertThat(scoringConfigService.getSameDeviceThreshold())
        .isEqualTo(originalSameDeviceThreshold);
    assertThat(scoringConfigService.getDriftThreshold()).isEqualTo(originalDriftThreshold);
    assertThat(scoringConfigService.getAllWeights()).isEqualTo(originalWeights);
  }
}
