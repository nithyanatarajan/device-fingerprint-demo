package com.example.deviceid.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

import com.example.deviceid.domain.Device;
import com.example.deviceid.domain.DeviceFingerprint;
import com.example.deviceid.domain.MatchResult;
import com.example.deviceid.domain.User;
import com.example.deviceid.dto.ScoringResult;
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class ScoringEngineTest {

  private ScoringEngine engine;
  private User testUser;
  private Device testDevice;

  @BeforeEach
  void setUp() {
    engine = new ScoringEngine(new SignalComparator());
    testUser = new User("testuser");
    testDevice = new Device(testUser, "Test Device");
  }

  @Test
  void identicalFingerprintsShouldScoreOneHundred() {
    DeviceFingerprint fp1 = createFullFingerprint();
    DeviceFingerprint fp2 = createFullFingerprint();

    ScoringResult result = engine.score(fp1, fp2, defaultWeights(), 85.0, 60.0);

    assertThat(result.score()).isCloseTo(100.0, within(0.01));
    assertThat(result.matchResult()).isEqualTo(MatchResult.SAME_DEVICE);
  }

  @Test
  void completelyDifferentFingerprintsShouldScoreZero() {
    DeviceFingerprint fp1 = createFullFingerprint();
    DeviceFingerprint fp2 = createDifferentFingerprint();

    ScoringResult result = engine.score(fp1, fp2, defaultWeights(), 85.0, 60.0);

    assertThat(result.score()).isCloseTo(0.0, within(0.01));
    assertThat(result.matchResult()).isEqualTo(MatchResult.NEW_DEVICE);
  }

  @Test
  void partialMatchShouldProduceDrift() {
    DeviceFingerprint fp1 = createFullFingerprint();
    DeviceFingerprint fp2 = createFullFingerprint();
    // Change enough signals to drop below same-device but above drift
    fp2.setScreenResolution("2560x1440");
    fp2.setUserAgent("Mozilla/5.0 (Windows) Firefox/119.0");
    fp2.setTimezone("Europe/London");
    fp2.setLocale("en-GB");
    fp2.setColorDepth(32);
    fp2.setPixelRatio(1.0);
    fp2.setDntEnabled(true);
    fp2.setCookieEnabled(false);

    ScoringResult result = engine.score(fp1, fp2, defaultWeights(), 85.0, 60.0);

    assertThat(result.score()).isBetween(60.0, 85.0);
    assertThat(result.matchResult()).isEqualTo(MatchResult.DRIFT_DETECTED);
  }

  @Test
  void weightsShouldBeRelative() {
    DeviceFingerprint fp1 = createFullFingerprint();
    DeviceFingerprint fp2 = createFullFingerprint();
    fp2.setCanvasHash("different");

    // Weights at one scale
    Map<String, Double> weights1 = Map.of("canvas_hash", 90.0, "webgl_renderer", 85.0);

    // Same ratio, different absolute values
    Map<String, Double> weights2 = Map.of("canvas_hash", 180.0, "webgl_renderer", 170.0);

    ScoringResult result1 = engine.score(fp1, fp2, weights1, 85.0, 60.0);
    ScoringResult result2 = engine.score(fp1, fp2, weights2, 85.0, 60.0);

    assertThat(result1.score()).isCloseTo(result2.score(), within(0.01));
  }

  @Test
  void zeroWeightSignalsShouldBeExcluded() {
    DeviceFingerprint fp1 = createFullFingerprint();
    DeviceFingerprint fp2 = createFullFingerprint();
    fp2.setCanvasHash("different");

    Map<String, Double> weights = new HashMap<>();
    weights.put("canvas_hash", 0.0);
    weights.put("webgl_renderer", 85.0);

    ScoringResult result = engine.score(fp1, fp2, weights, 85.0, 60.0);

    // Only webgl_renderer contributes; it matches, so score should be 100
    assertThat(result.score()).isCloseTo(100.0, within(0.01));
  }

  @Test
  void nullSignalsShouldBeExcludedFromWeightCalculation() {
    DeviceFingerprint fp1 = new DeviceFingerprint(testDevice);
    fp1.setCanvasHash("abc123");
    // Leave other signals null

    DeviceFingerprint fp2 = new DeviceFingerprint(testDevice);
    fp2.setCanvasHash("abc123");
    // Leave other signals null

    ScoringResult result = engine.score(fp1, fp2, defaultWeights(), 85.0, 60.0);

    // Only canvas_hash contributes and matches perfectly
    assertThat(result.score()).isCloseTo(100.0, within(0.01));
    assertThat(result.matchResult()).isEqualTo(MatchResult.SAME_DEVICE);
  }

  @Test
  void shouldReturnSignalComparisons() {
    DeviceFingerprint fp1 = createFullFingerprint();
    DeviceFingerprint fp2 = createFullFingerprint();

    ScoringResult result = engine.score(fp1, fp2, defaultWeights(), 85.0, 60.0);

    assertThat(result.signalComparisons()).isNotEmpty();
    assertThat(result.signalComparisons()).allSatisfy(c -> assertThat(c.score()).isEqualTo(1.0));
  }

  @Test
  void noWeightsShouldScoreZero() {
    DeviceFingerprint fp1 = createFullFingerprint();
    DeviceFingerprint fp2 = createFullFingerprint();

    ScoringResult result = engine.score(fp1, fp2, Map.of(), 85.0, 60.0);

    assertThat(result.score()).isEqualTo(0.0);
  }

  private DeviceFingerprint createFullFingerprint() {
    DeviceFingerprint fp = new DeviceFingerprint(testDevice);
    fp.setCanvasHash("abc123");
    fp.setWebglRenderer("NVIDIA GeForce GTX 1080");
    fp.setScreenResolution("1920x1080");
    fp.setColorDepth(24);
    fp.setPixelRatio(2.0);
    fp.setTimezone("America/New_York");
    fp.setLocale("en-US");
    fp.setPlatform("MacIntel");
    fp.setUserAgent("Mozilla/5.0 (Macintosh) Chrome/120.0.0");
    fp.setHardwareConcurrency(8);
    fp.setDeviceMemory(16.0);
    fp.setTouchSupport(0);
    fp.setCodecSupport("video/webm,video/mp4,audio/ogg");
    fp.setDntEnabled(false);
    fp.setCookieEnabled(true);
    return fp;
  }

  private DeviceFingerprint createDifferentFingerprint() {
    DeviceFingerprint fp = new DeviceFingerprint(testDevice);
    fp.setCanvasHash("xyz789");
    fp.setWebglRenderer("Intel HD Graphics");
    fp.setScreenResolution("1366x768");
    fp.setColorDepth(32);
    fp.setPixelRatio(1.0);
    fp.setTimezone("Europe/London");
    fp.setLocale("en-GB");
    fp.setPlatform("Win32");
    fp.setUserAgent("Mozilla/5.0 (Windows) Firefox/119.0");
    fp.setHardwareConcurrency(4);
    fp.setDeviceMemory(8.0);
    fp.setTouchSupport(5);
    fp.setCodecSupport("audio/wav,audio/flac");
    fp.setDntEnabled(true);
    fp.setCookieEnabled(false);
    return fp;
  }

  private Map<String, Double> defaultWeights() {
    Map<String, Double> weights = new HashMap<>();
    weights.put("canvas_hash", 90.0);
    weights.put("webgl_renderer", 85.0);
    weights.put("touch_support", 70.0);
    weights.put("platform", 60.0);
    weights.put("hardware_concurrency", 50.0);
    weights.put("device_memory", 50.0);
    weights.put("pixel_ratio", 45.0);
    weights.put("screen_resolution", 40.0);
    weights.put("codec_support", 35.0);
    weights.put("user_agent", 30.0);
    weights.put("timezone", 20.0);
    weights.put("locale", 15.0);
    weights.put("color_depth", 15.0);
    weights.put("dnt_enabled", 10.0);
    weights.put("cookie_enabled", 5.0);
    return weights;
  }
}
