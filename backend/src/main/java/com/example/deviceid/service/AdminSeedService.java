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
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.function.UnaryOperator;
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

  /**
   * Curated scenario for {@link #seedScenario}. Each scenario produces one user with two
   * fingerprints attached to a single device, designed to land at a specific point on the score
   * curve so the Tuning Console's sliders produce visible flips when dragged.
   */
  private record Scenario(String userName, UnaryOperator<CollectRequest> mutateSecondVisit) {}

  // Distinct field values used by the curated scenarios. Each is intentionally far enough from
  // the chrome-regular template that the SignalComparator scores it as a full mismatch (no
  // partial match), so the math in the scenario score predictions is clean.
  private static final String DIFFERENT_CANVAS_HASH = "DIFFERENT_HASH";
  private static final String DIFFERENT_WEBGL_RENDERER = "Mesa Intel HD Graphics 4000";
  private static final String DIFFERENT_USER_AGENT =
      "Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0";
  private static final String DIFFERENT_CODEC_SUPPORT = "audio/mp4;codecs=mp4a.40.2";
  private static final String DIFFERENT_PLATFORM = "Win32";
  // chrome-regular template ships with touchSupport=0; flipping to 5 simulates a touchscreen.
  private static final int DIFFERENT_TOUCH_SUPPORT = 5;

  // Total default weight = 90+85+70+60+50+50+45+40+35+30+20+15+15+10+5 = 620
  // Approximate scores under default weights:
  //   stable        — all match           → 100.0  (SAME_DEVICE)
  //   canvas-drift  — canvas (90)         →  85.5  (SAME_DEVICE, on the cusp)
  //   webgl-only    — webgl (85)          →  86.3  (SAME_DEVICE, on the cusp)
  //   touch-only    — touch (70)          →  88.7  (SAME_DEVICE, on the cusp)
  //   cross-browser — canvas+webgl (175)  →  71.8  (DRIFT_DETECTED)
  //   os-update     — canvas+ua+codec     →  75.0  (DRIFT_DETECTED)
  //   major-drift   — canvas+webgl+plat   →  62.1  (DRIFT_DETECTED, just above drift threshold)
  //
  // The webgl-only and touch-only scenarios give webgl_renderer and touch_support their own
  // dedicated lever devices — drag those individual weight sliders, or nudge the same-device
  // threshold above 86.3 / 88.7, and watch the corresponding row flip from SAME_DEVICE to
  // DRIFT_DETECTED. Without these, canvas_hash carried all the variation in the scenario set.
  private static final List<Scenario> SCENARIOS =
      List.of(
          new Scenario("demo-user-stable", req -> req),
          new Scenario(
              "demo-user-canvas-drift",
              req ->
                  new CollectRequest(
                      req.name(),
                      DIFFERENT_CANVAS_HASH,
                      req.webglRenderer(),
                      req.screenResolution(),
                      req.colorDepth(),
                      req.pixelRatio(),
                      req.timezone(),
                      req.locale(),
                      req.platform(),
                      req.userAgent(),
                      req.hardwareConcurrency(),
                      req.deviceMemory(),
                      req.touchSupport(),
                      req.codecSupport(),
                      req.dntEnabled(),
                      req.cookieEnabled(),
                      req.fontHash())),
          new Scenario(
              "demo-user-webgl-only",
              req ->
                  new CollectRequest(
                      req.name(),
                      req.canvasHash(),
                      DIFFERENT_WEBGL_RENDERER,
                      req.screenResolution(),
                      req.colorDepth(),
                      req.pixelRatio(),
                      req.timezone(),
                      req.locale(),
                      req.platform(),
                      req.userAgent(),
                      req.hardwareConcurrency(),
                      req.deviceMemory(),
                      req.touchSupport(),
                      req.codecSupport(),
                      req.dntEnabled(),
                      req.cookieEnabled(),
                      req.fontHash())),
          new Scenario(
              "demo-user-touch-only",
              req ->
                  new CollectRequest(
                      req.name(),
                      req.canvasHash(),
                      req.webglRenderer(),
                      req.screenResolution(),
                      req.colorDepth(),
                      req.pixelRatio(),
                      req.timezone(),
                      req.locale(),
                      req.platform(),
                      req.userAgent(),
                      req.hardwareConcurrency(),
                      req.deviceMemory(),
                      DIFFERENT_TOUCH_SUPPORT,
                      req.codecSupport(),
                      req.dntEnabled(),
                      req.cookieEnabled(),
                      req.fontHash())),
          new Scenario(
              "demo-user-cross-browser",
              req ->
                  new CollectRequest(
                      req.name(),
                      DIFFERENT_CANVAS_HASH,
                      DIFFERENT_WEBGL_RENDERER,
                      req.screenResolution(),
                      req.colorDepth(),
                      req.pixelRatio(),
                      req.timezone(),
                      req.locale(),
                      req.platform(),
                      req.userAgent(),
                      req.hardwareConcurrency(),
                      req.deviceMemory(),
                      req.touchSupport(),
                      req.codecSupport(),
                      req.dntEnabled(),
                      req.cookieEnabled(),
                      req.fontHash())),
          new Scenario(
              "demo-user-os-update",
              req ->
                  new CollectRequest(
                      req.name(),
                      DIFFERENT_CANVAS_HASH,
                      req.webglRenderer(),
                      req.screenResolution(),
                      req.colorDepth(),
                      req.pixelRatio(),
                      req.timezone(),
                      req.locale(),
                      req.platform(),
                      DIFFERENT_USER_AGENT,
                      req.hardwareConcurrency(),
                      req.deviceMemory(),
                      req.touchSupport(),
                      DIFFERENT_CODEC_SUPPORT,
                      req.dntEnabled(),
                      req.cookieEnabled(),
                      req.fontHash())),
          new Scenario(
              "demo-user-major-drift",
              req ->
                  new CollectRequest(
                      req.name(),
                      DIFFERENT_CANVAS_HASH,
                      DIFFERENT_WEBGL_RENDERER,
                      req.screenResolution(),
                      req.colorDepth(),
                      req.pixelRatio(),
                      req.timezone(),
                      req.locale(),
                      DIFFERENT_PLATFORM,
                      req.userAgent(),
                      req.hardwareConcurrency(),
                      req.deviceMemory(),
                      req.touchSupport(),
                      req.codecSupport(),
                      req.dntEnabled(),
                      req.cookieEnabled(),
                      req.fontHash())));

  /**
   * Wipes existing demo data and seeds a curated scenario of 7 users designed to sit at varied
   * points on the score curve. Each user has two fingerprints on one device so the preview service
   * can score them, and dragging high-leverage sliders (canvas_hash, webgl_renderer, touch_support,
   * platform) or the same-device / drift thresholds produces visible classification flips. Returns
   * the {@link CollectResponse} of each second visit (the scoring outcome the audience watches
   * happen).
   */
  public List<CollectResponse> seedScenario() {
    clearAll();
    CollectRequest base = loadTemplate("chrome", false);
    List<CollectResponse> outcomes = new ArrayList<>();
    for (Scenario scenario : SCENARIOS) {
      CollectRequest firstVisit = withName(base, scenario.userName());
      collectionService.collect(firstVisit, NON_VPN_IP);
      CollectRequest secondVisit = scenario.mutateSecondVisit().apply(firstVisit);
      outcomes.add(collectionService.collect(secondVisit, NON_VPN_IP));
    }
    return outcomes;
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
