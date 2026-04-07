package com.example.deviceid.controller;

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
class CollectionControllerTest {

  @Autowired private WebApplicationContext webApplicationContext;

  private MockMvc mockMvc;

  @BeforeEach
  void setUp() {
    mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext).build();
  }

  @Test
  void postCollectShouldReturnNewDeviceOnFirstVisit() throws Exception {
    mockMvc
        .perform(
            post("/api/collect")
                .contentType(MediaType.APPLICATION_JSON)
                .content(collectRequestJson("testuser")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.matchResult").value("NEW_DEVICE"))
        .andExpect(jsonPath("$.userId").isNotEmpty())
        .andExpect(jsonPath("$.deviceId").isNotEmpty());
  }

  @Test
  void forwardedHeaderShouldTakePrecedenceOverRemoteAddr() throws Exception {
    mockMvc
        .perform(
            post("/api/collect")
                .contentType(MediaType.APPLICATION_JSON)
                .header("X-Forwarded-For", "203.0.113.55")
                .with(
                    req -> {
                      req.setRemoteAddr("10.0.0.1");
                      return req;
                    })
                .content(collectRequestJson("userA")))
        .andExpect(status().isOk());

    mockMvc
        .perform(
            post("/api/collect")
                .contentType(MediaType.APPLICATION_JSON)
                .header("X-Forwarded-For", "203.0.113.55")
                .with(
                    req -> {
                      req.setRemoteAddr("10.0.0.99");
                      return req;
                    })
                .content(collectRequestJson("userB")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.machineMatch.matches[0].userName").value("usera"));
  }

  @Test
  void forwardedHeaderWithMultipleIpsShouldTakeFirst() throws Exception {
    mockMvc
        .perform(
            post("/api/collect")
                .contentType(MediaType.APPLICATION_JSON)
                .header("X-Forwarded-For", "203.0.113.77")
                .content(collectRequestJson("userA")))
        .andExpect(status().isOk());

    mockMvc
        .perform(
            post("/api/collect")
                .contentType(MediaType.APPLICATION_JSON)
                .header("X-Forwarded-For", "203.0.113.77, 10.0.0.1, 10.0.0.2")
                .content(collectRequestJson("userB")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.machineMatch.matches[0].userName").value("usera"));
  }

  @Test
  void absentForwardedHeaderShouldFallBackToRemoteAddr() throws Exception {
    mockMvc
        .perform(
            post("/api/collect")
                .contentType(MediaType.APPLICATION_JSON)
                .with(
                    req -> {
                      req.setRemoteAddr("198.51.100.42");
                      return req;
                    })
                .content(collectRequestJson("userA")))
        .andExpect(status().isOk());

    mockMvc
        .perform(
            post("/api/collect")
                .contentType(MediaType.APPLICATION_JSON)
                .header("X-Forwarded-For", "  ")
                .with(
                    req -> {
                      req.setRemoteAddr("198.51.100.42");
                      return req;
                    })
                .content(collectRequestJson("userB")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.machineMatch.matches[0].userName").value("usera"));
  }

  @Test
  void postCollectShouldReturnSameDeviceOnReturnVisit() throws Exception {
    mockMvc
        .perform(
            post("/api/collect")
                .contentType(MediaType.APPLICATION_JSON)
                .content(collectRequestJson("testuser")))
        .andExpect(status().isOk());

    mockMvc
        .perform(
            post("/api/collect")
                .contentType(MediaType.APPLICATION_JSON)
                .content(collectRequestJson("testuser")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.matchResult").value("SAME_DEVICE"));
  }

  private String collectRequestJson(String name) {
    return """
        {
          "name": "%s",
          "canvasHash": "abc123",
          "webglRenderer": "NVIDIA GeForce GTX 1080",
          "screenResolution": "1920x1080",
          "colorDepth": 24,
          "pixelRatio": 2.0,
          "timezone": "America/New_York",
          "locale": "en-US",
          "platform": "MacIntel",
          "userAgent": "Mozilla/5.0 (Macintosh) Chrome/120.0.0",
          "hardwareConcurrency": 8,
          "deviceMemory": 16.0,
          "touchSupport": 0,
          "codecSupport": "video/webm,video/mp4,audio/ogg",
          "dntEnabled": false,
          "cookieEnabled": true
        }
        """
        .formatted(name);
  }
}
