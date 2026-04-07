package com.example.deviceid.service;

import com.example.deviceid.domain.Device;
import com.example.deviceid.domain.User;
import com.example.deviceid.dto.AdminSeedRequest;
import com.example.deviceid.dto.AdminSeedSummary;
import com.example.deviceid.dto.CollectRequest;
import com.example.deviceid.dto.CollectResponse;
import com.example.deviceid.repository.DeviceFingerprintRepository;
import com.example.deviceid.repository.DeviceRepository;
import com.example.deviceid.repository.UserRepository;
import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.Locale;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.ObjectMapper;

/**
 * Builds synthetic fingerprints from canonical templates so the Tuning Console always has data to
 * work with. All synthetic users are forced to use the {@code demo-user-} prefix and flow through
 * {@link CollectionService#collect} so they are indistinguishable from real visits in storage.
 */
@Service
@Transactional
public class AdminSeedService {

  /** Required prefix for any user touched by admin seed endpoints. */
  public static final String DEMO_USER_PREFIX = "demo-user-";

  /** Public IP recorded when {@code vpn=false}. */
  static final String NON_VPN_IP = "203.0.113.42";

  /** Public IP recorded when {@code vpn=true}. */
  static final String VPN_IP = "198.51.100.99";

  private final CollectionService collectionService;
  private final UserRepository userRepository;
  private final DeviceRepository deviceRepository;
  private final DeviceFingerprintRepository fingerprintRepository;
  private final ObjectMapper objectMapper;

  /** Creates the seed service with the dependencies it needs to run a synthetic visit. */
  public AdminSeedService(
      CollectionService collectionService,
      UserRepository userRepository,
      DeviceRepository deviceRepository,
      DeviceFingerprintRepository fingerprintRepository,
      ObjectMapper objectMapper) {
    this.collectionService = collectionService;
    this.userRepository = userRepository;
    this.deviceRepository = deviceRepository;
    this.fingerprintRepository = fingerprintRepository;
    this.objectMapper = objectMapper;
  }

  /**
   * Runs one synthetic visit through {@link CollectionService#collect}. Returns the same {@link
   * CollectResponse} the live page would render so the audience can watch the seeded result land.
   */
  public CollectResponse seed(AdminSeedRequest request) {
    String userName = requireDemoUserName(request.userName());
    String browser = requireBrowser(request.browser());
    CollectRequest template = loadTemplate(browser, request.incognito());
    CollectRequest withName = withName(template, userName);
    String publicIp = request.vpn() ? VPN_IP : NON_VPN_IP;
    return collectionService.collect(withName, publicIp);
  }

  /** Returns counts of all {@code demo-user-*} data currently stored. */
  public AdminSeedSummary summary() {
    List<User> demoUsers = findDemoUsers();
    int devices = 0;
    int fingerprints = 0;
    for (User user : demoUsers) {
      List<Device> userDevices = deviceRepository.findByUser(user);
      devices += userDevices.size();
      for (Device device : userDevices) {
        fingerprints += fingerprintRepository.findByDeviceOrderByCollectedAtDesc(device).size();
      }
    }
    return new AdminSeedSummary(demoUsers.size(), devices, fingerprints);
  }

  /**
   * Cascading-deletes every {@code demo-user-*} user along with their devices and fingerprints.
   * Returns the counts that were removed (the same shape as {@link #summary}).
   */
  public AdminSeedSummary clearAll() {
    AdminSeedSummary before = summary();
    for (User user : findDemoUsers()) {
      for (Device device : deviceRepository.findByUser(user)) {
        for (var fp : fingerprintRepository.findByDeviceOrderByCollectedAtDesc(device)) {
          fingerprintRepository.delete(fp);
        }
        deviceRepository.delete(device);
      }
      userRepository.delete(user);
    }
    return before;
  }

  private List<User> findDemoUsers() {
    return userRepository.findAll().stream()
        .filter(
            u ->
                u.getName() != null
                    && u.getName().toLowerCase(Locale.ROOT).startsWith(DEMO_USER_PREFIX))
        .toList();
  }

  private String requireDemoUserName(String userName) {
    if (userName == null || !userName.toLowerCase(Locale.ROOT).startsWith(DEMO_USER_PREFIX)) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "userName must start with '" + DEMO_USER_PREFIX + "'");
    }
    return userName;
  }

  private String requireBrowser(String browser) {
    if (browser == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "browser is required");
    }
    String normalized = browser.toLowerCase(Locale.ROOT);
    return switch (normalized) {
      case "chrome", "firefox", "safari" -> normalized;
      default ->
          throw new ResponseStatusException(
              HttpStatus.BAD_REQUEST, "browser must be one of chrome, firefox, safari");
    };
  }

  private CollectRequest loadTemplate(String browser, boolean incognito) {
    String suffix = incognito ? "incognito" : "regular";
    String resourcePath = "seed-templates/" + browser + "-" + suffix + ".json";
    try (InputStream stream = new ClassPathResource(resourcePath).getInputStream()) {
      return objectMapper.readValue(stream, CollectRequest.class);
    } catch (IOException e) {
      throw new ResponseStatusException(
          HttpStatus.INTERNAL_SERVER_ERROR, "Failed to load seed template: " + resourcePath, e);
    }
  }

  private CollectRequest withName(CollectRequest template, String userName) {
    return new CollectRequest(
        userName,
        template.canvasHash(),
        template.webglRenderer(),
        template.screenResolution(),
        template.colorDepth(),
        template.pixelRatio(),
        template.timezone(),
        template.locale(),
        template.platform(),
        template.userAgent(),
        template.hardwareConcurrency(),
        template.deviceMemory(),
        template.touchSupport(),
        template.codecSupport(),
        template.dntEnabled(),
        template.cookieEnabled(),
        template.fontHash());
  }
}
