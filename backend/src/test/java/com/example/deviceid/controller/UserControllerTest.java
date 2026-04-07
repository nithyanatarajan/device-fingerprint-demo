package com.example.deviceid.controller;

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
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

@SpringBootTest
@Transactional
class UserControllerTest {

  @Autowired private WebApplicationContext webApplicationContext;

  private MockMvc mockMvc;

  @BeforeEach
  void setUp() {
    mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext).build();
  }

  @Test
  void getUsersShouldReturnCollectedUsers() throws Exception {
    mockMvc.perform(
        post("/api/collect")
            .contentType(MediaType.APPLICATION_JSON)
            .content(collectJson("testuser")));

    mockMvc
        .perform(get("/api/users"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].name").value("testuser"))
        .andExpect(jsonPath("$[0].deviceCount").value(1));
  }

  @Test
  void getUserDevicesShouldReturnDeviceList() throws Exception {
    MvcResult result =
        mockMvc
            .perform(
                post("/api/collect")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(collectJson("testuser")))
            .andReturn();

    String responseBody = result.getResponse().getContentAsString();
    // Extract userId from JSON response
    String userId =
        responseBody.substring(
            responseBody.indexOf("\"userId\":\"") + 10,
            responseBody.indexOf("\"", responseBody.indexOf("\"userId\":\"") + 10));

    mockMvc
        .perform(get("/api/users/" + userId + "/devices"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].label").isNotEmpty())
        .andExpect(jsonPath("$[0].visitCount").value(1));
  }

  @Test
  void getUserDevicesForUnknownUserShouldReturn404() throws Exception {
    mockMvc
        .perform(get("/api/users/00000000-0000-0000-0000-000000000000/devices"))
        .andExpect(status().isNotFound());
  }

  @Test
  void getUserDevicesShouldIncludeMachineSignatureAndPublicIp() throws Exception {
    MvcResult result =
        mockMvc
            .perform(
                post("/api/collect")
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("X-Forwarded-For", "203.0.113.42")
                    .content(collectJson("testuser")))
            .andReturn();

    String responseBody = result.getResponse().getContentAsString();
    String userId =
        responseBody.substring(
            responseBody.indexOf("\"userId\":\"") + 10,
            responseBody.indexOf("\"", responseBody.indexOf("\"userId\":\"") + 10));

    mockMvc
        .perform(get("/api/users/" + userId + "/devices"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].machineSignature").isNotEmpty())
        .andExpect(jsonPath("$[0].publicIp").value("203.0.113.42"));
  }

  @Test
  void getUserDetailShouldReturnUserMetadata() throws Exception {
    MvcResult result =
        mockMvc
            .perform(
                post("/api/collect")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(collectJson("testuser")))
            .andReturn();

    String responseBody = result.getResponse().getContentAsString();
    String userId =
        responseBody.substring(
            responseBody.indexOf("\"userId\":\"") + 10,
            responseBody.indexOf("\"", responseBody.indexOf("\"userId\":\"") + 10));

    mockMvc
        .perform(get("/api/users/" + userId))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value(userId))
        .andExpect(jsonPath("$.name").value("testuser"))
        .andExpect(jsonPath("$.deviceCount").value(1))
        .andExpect(jsonPath("$.createdAt").isNotEmpty());
  }

  @Test
  void getUserDetailForUnknownUserShouldReturn404() throws Exception {
    mockMvc
        .perform(get("/api/users/00000000-0000-0000-0000-000000000000"))
        .andExpect(status().isNotFound());
  }

  private String collectJson(String name) {
    return """
        {
          "name": "%s",
          "canvasHash": "abc123",
          "webglRenderer": "NVIDIA GeForce",
          "screenResolution": "1920x1080",
          "colorDepth": 24,
          "pixelRatio": 2.0,
          "timezone": "America/New_York",
          "locale": "en-US",
          "platform": "MacIntel",
          "userAgent": "Mozilla/5.0 (Macintosh) Chrome/120.0",
          "hardwareConcurrency": 8,
          "deviceMemory": 16.0,
          "touchSupport": 0,
          "codecSupport": "video/webm",
          "dntEnabled": false,
          "cookieEnabled": true
        }
        """
        .formatted(name);
  }
}
