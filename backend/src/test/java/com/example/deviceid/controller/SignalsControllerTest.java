package com.example.deviceid.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.deviceid.domain.Device;
import com.example.deviceid.domain.DeviceFingerprint;
import com.example.deviceid.domain.User;
import com.example.deviceid.repository.DeviceFingerprintRepository;
import com.example.deviceid.repository.DeviceRepository;
import com.example.deviceid.repository.UserRepository;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

@SpringBootTest
@Transactional
class SignalsControllerTest {

  @Autowired private WebApplicationContext webApplicationContext;
  @Autowired private UserRepository userRepository;
  @Autowired private DeviceRepository deviceRepository;
  @Autowired private DeviceFingerprintRepository fingerprintRepository;

  private MockMvc mockMvc;

  @BeforeEach
  void setUp() {
    mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext).build();
  }

  @Test
  void distinctivenessReturnsPayloadForExistingFingerprint() throws Exception {
    User user = userRepository.save(new User("alice"));
    Device device = deviceRepository.save(new Device(user, "Laptop"));
    DeviceFingerprint fp = new DeviceFingerprint(device);
    fp.setPlatform("MacIntel");
    fp.setCanvasHash("HASH_A");
    DeviceFingerprint saved = fingerprintRepository.save(fp);

    mockMvc
        .perform(
            get("/api/signals/distinctiveness").param("fingerprintId", saved.getId().toString()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.fingerprintId").value(saved.getId().toString()))
        .andExpect(jsonPath("$.totalFingerprints").value(1))
        .andExpect(jsonPath("$.fullFingerprintMatchCount").value(1))
        .andExpect(jsonPath("$.signals.length()").value(15));
  }

  @Test
  void distinctivenessReturns404ForMissingFingerprint() throws Exception {
    mockMvc
        .perform(
            get("/api/signals/distinctiveness")
                .param("fingerprintId", UUID.randomUUID().toString()))
        .andExpect(status().isNotFound());
  }
}
