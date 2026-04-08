package com.example.deviceid.service;

import com.example.deviceid.domain.DeviceFingerprint;
import com.example.deviceid.dto.SignalDistinctivenessEntry;
import com.example.deviceid.dto.SignalDistinctivenessResponse;
import com.example.deviceid.repository.DeviceFingerprintRepository;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Computes per-signal distinctiveness for a given fingerprint against the current fingerprint
 * table.
 *
 * <p>Nothing is compared against a reference or curated dataset — every number returned is measured
 * from the live database. With a small population the numbers are small; the frontend is
 * responsible for framing that honestly.
 */
@Service
@Transactional(readOnly = true)
public class SignalDistinctivenessService {

  /**
   * The 15 signals exposed to the distinctiveness view. Order is intentional — mirrors the
   * scoring-weight ordering the rest of the UI uses so the two panels feel consistent.
   */
  private static final Map<String, Function<DeviceFingerprint, String>> SIGNAL_EXTRACTORS =
      buildExtractors();

  private final DeviceFingerprintRepository fingerprintRepository;

  /** Creates the service with its repository dependency. */
  public SignalDistinctivenessService(DeviceFingerprintRepository fingerprintRepository) {
    this.fingerprintRepository = fingerprintRepository;
  }

  private static Map<String, Function<DeviceFingerprint, String>> buildExtractors() {
    Map<String, Function<DeviceFingerprint, String>> map = new LinkedHashMap<>();
    map.put("canvas_hash", DeviceFingerprint::getCanvasHash);
    map.put("webgl_renderer", DeviceFingerprint::getWebglRenderer);
    map.put("touch_support", fp -> stringify(fp.getTouchSupport()));
    map.put("platform", DeviceFingerprint::getPlatform);
    map.put("hardware_concurrency", fp -> stringify(fp.getHardwareConcurrency()));
    map.put("device_memory", fp -> stringify(fp.getDeviceMemory()));
    map.put("pixel_ratio", fp -> stringify(fp.getPixelRatio()));
    map.put("screen_resolution", DeviceFingerprint::getScreenResolution);
    map.put("codec_support", DeviceFingerprint::getCodecSupport);
    map.put("user_agent", DeviceFingerprint::getUserAgent);
    map.put("timezone", DeviceFingerprint::getTimezone);
    map.put("locale", DeviceFingerprint::getLocale);
    map.put("color_depth", fp -> stringify(fp.getColorDepth()));
    map.put("dnt_enabled", fp -> stringify(fp.getDntEnabled()));
    map.put("cookie_enabled", fp -> stringify(fp.getCookieEnabled()));
    return map;
  }

  private static String stringify(Object value) {
    return value == null ? null : value.toString();
  }

  /**
   * Computes distinctiveness stats for the fingerprint with the given id. Walks the fingerprint
   * table once and tallies per-signal value distributions.
   */
  public SignalDistinctivenessResponse computeFor(UUID fingerprintId) {
    DeviceFingerprint subject =
        fingerprintRepository
            .findById(fingerprintId)
            .orElseThrow(
                () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "fingerprint not found"));

    List<DeviceFingerprint> all = fingerprintRepository.findAll();

    // Per-signal: valueOccurrenceCounts[signal] = { value -> count }
    Map<String, Map<String, Long>> valueOccurrenceCounts = new HashMap<>();
    for (String signalName : SIGNAL_EXTRACTORS.keySet()) {
      valueOccurrenceCounts.put(signalName, new HashMap<>());
    }

    for (DeviceFingerprint fp : all) {
      for (Map.Entry<String, Function<DeviceFingerprint, String>> entry :
          SIGNAL_EXTRACTORS.entrySet()) {
        String value = entry.getValue().apply(fp);
        valueOccurrenceCounts.get(entry.getKey()).merge(value, 1L, Long::sum);
      }
    }

    List<SignalDistinctivenessEntry> entries = new ArrayList<>();
    for (Map.Entry<String, Function<DeviceFingerprint, String>> entry :
        SIGNAL_EXTRACTORS.entrySet()) {
      String signalName = entry.getKey();
      String subjectValue = entry.getValue().apply(subject);
      Map<String, Long> counts = valueOccurrenceCounts.get(signalName);
      long matchCount = counts.getOrDefault(subjectValue, 0L);
      long distinctValues = counts.size();
      entries.add(
          new SignalDistinctivenessEntry(signalName, subjectValue, matchCount, distinctValues));
    }

    long fullMatchCount = countFullFingerprintMatches(subject, all);

    return new SignalDistinctivenessResponse(
        subject.getId(), (long) all.size(), entries, fullMatchCount);
  }

  private long countFullFingerprintMatches(DeviceFingerprint subject, List<DeviceFingerprint> all) {
    List<String> subjectValues = extractAll(subject);
    long matches = 0;
    for (DeviceFingerprint fp : all) {
      if (extractAll(fp).equals(subjectValues)) {
        matches++;
      }
    }
    return matches;
  }

  private List<String> extractAll(DeviceFingerprint fp) {
    List<String> values = new ArrayList<>(SIGNAL_EXTRACTORS.size());
    for (Function<DeviceFingerprint, String> extractor : SIGNAL_EXTRACTORS.values()) {
      values.add(extractor.apply(fp));
    }
    return values;
  }

  /** Exposed for tests — the set of signal names this service emits. */
  public static Set<String> signalNames() {
    return new HashSet<>(SIGNAL_EXTRACTORS.keySet());
  }
}
