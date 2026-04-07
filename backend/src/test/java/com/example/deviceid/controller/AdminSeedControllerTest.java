package com.example.deviceid.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

@SpringBootTest
@Transactional
class AdminSeedControllerTest {

  @Autowired private WebApplicationContext webApplicationContext;

  private MockMvc mockMvc;

  @BeforeEach
  void setUp() {
    mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext).build();
  }

  @Test
  void postSeedReturnsCollectResponseShape() throws Exception {
    mockMvc
        .perform(
            post("/api/admin/seed")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"userName": "demo-user-alpha", "browser": "chrome", "vpn": false, "incognito": false}
                    """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.userId").isNotEmpty())
        .andExpect(jsonPath("$.deviceId").isNotEmpty())
        .andExpect(jsonPath("$.deviceLabel").isNotEmpty());
  }

  @Test
  void postSeedRejectsNonDemoUserName() throws Exception {
    mockMvc
        .perform(
            post("/api/admin/seed")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"userName": "nithya", "browser": "chrome", "vpn": false, "incognito": false}
                    """))
        .andExpect(status().isBadRequest());
  }

  @Test
  void postSeedRejectsUnknownBrowser() throws Exception {
    mockMvc
        .perform(
            post("/api/admin/seed")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"userName": "demo-user-alpha", "browser": "edge", "vpn": false, "incognito": false}
                    """))
        .andExpect(status().isBadRequest());
  }

  @Test
  void getSummaryReturnsZeroWhenEmpty() throws Exception {
    mockMvc
        .perform(get("/api/admin/seed/summary"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.users").value(0))
        .andExpect(jsonPath("$.devices").value(0))
        .andExpect(jsonPath("$.fingerprints").value(0));
  }

  @Test
  void getSummaryReflectsSeededData() throws Exception {
    mockMvc.perform(
        post("/api/admin/seed")
            .contentType(MediaType.APPLICATION_JSON)
            .content(
                """
                {"userName": "demo-user-alpha", "browser": "chrome", "vpn": false, "incognito": false}
                """));

    mockMvc
        .perform(get("/api/admin/seed/summary"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.users").value(1))
        .andExpect(jsonPath("$.devices").value(1))
        .andExpect(jsonPath("$.fingerprints").value(1));
  }

  @Test
  void postSeedScenarioCreatesCuratedSevenUserDataset() throws Exception {
    mockMvc
        .perform(post("/api/admin/seed/scenario"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$").isArray())
        .andExpect(jsonPath("$.length()").value(7));

    mockMvc
        .perform(get("/api/admin/seed/summary"))
        .andExpect(jsonPath("$.users").value(7))
        .andExpect(jsonPath("$.devices").value(7))
        .andExpect(jsonPath("$.fingerprints").value(14));
  }

  @Test
  void deleteSeedClearsAllDemoData() throws Exception {
    mockMvc.perform(
        post("/api/admin/seed")
            .contentType(MediaType.APPLICATION_JSON)
            .content(
                """
                {"userName": "demo-user-alpha", "browser": "chrome", "vpn": false, "incognito": false}
                """));

    mockMvc
        .perform(delete("/api/admin/seed"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.users").value(1))
        .andExpect(jsonPath("$.devices").value(1))
        .andExpect(jsonPath("$.fingerprints").value(1));

    mockMvc.perform(get("/api/admin/seed/summary")).andExpect(jsonPath("$.users").value(0));
  }
}
