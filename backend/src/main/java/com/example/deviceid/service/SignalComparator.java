package com.example.deviceid.service;

import java.util.Arrays;
import java.util.Collections;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

/** Compares individual signal values and produces similarity scores. */
@Component
public class SignalComparator {

  private static final Pattern BROWSER_PATTERN =
      Pattern.compile("(Chrome|Firefox|Safari|Edge|Opera|Brave)", Pattern.CASE_INSENSITIVE);
  private static final Pattern OS_PATTERN =
      Pattern.compile(
          "(Windows|Mac\\s*OS|MacOS|Macintosh|Linux|Android|iOS|iPhone"
              + "|iPad|CrOS|Chrome\\s*OS)",
          Pattern.CASE_INSENSITIVE);

  private static final double CODEC_HIGH_THRESHOLD = 0.8;
  private static final double CODEC_MEDIUM_THRESHOLD = 0.5;

  /** Compares two signal values and returns a similarity score between 0.0 and 1.0. */
  public double compare(String signalName, Object value1, Object value2) {
    if (value1 == null && value2 == null) {
      return 1.0;
    }
    if (value1 == null || value2 == null) {
      return 0.0;
    }

    return switch (signalName) {
      case "user_agent" -> compareUserAgent(value1.toString(), value2.toString());
      case "codec_support" -> compareCodecSupport(value1.toString(), value2.toString());
      default -> value1.equals(value2) ? 1.0 : 0.0;
    };
  }

  private double compareUserAgent(String ua1, String ua2) {
    if (ua1.equals(ua2)) {
      return 1.0;
    }

    String browser1 = extractBrowserFamily(ua1);
    String browser2 = extractBrowserFamily(ua2);
    String os1 = extractOs(ua1);
    String os2 = extractOs(ua2);

    if (browser1 != null
        && browser1.equalsIgnoreCase(browser2)
        && os1 != null
        && os1.equalsIgnoreCase(os2)) {
      return 0.5;
    }
    return 0.0;
  }

  private double compareCodecSupport(String codecs1, String codecs2) {
    Set<String> set1 = parseCodecSet(codecs1);
    Set<String> set2 = parseCodecSet(codecs2);

    if (set1.isEmpty() && set2.isEmpty()) {
      return 1.0;
    }
    if (set1.isEmpty() || set2.isEmpty()) {
      return 0.0;
    }

    long intersection = set1.stream().filter(set2::contains).count();
    long union = set1.size() + set2.size() - intersection;
    double jaccard = (double) intersection / union;

    if (jaccard >= CODEC_HIGH_THRESHOLD) {
      return 1.0;
    }
    if (jaccard >= CODEC_MEDIUM_THRESHOLD) {
      return 0.5;
    }
    return 0.0;
  }

  private Set<String> parseCodecSet(String codecs) {
    if (codecs == null || codecs.isBlank()) {
      return Collections.emptySet();
    }
    return Arrays.stream(codecs.split(","))
        .map(String::trim)
        .filter(s -> !s.isEmpty())
        .collect(Collectors.toSet());
  }

  String extractBrowserFamily(String userAgent) {
    if (userAgent == null) {
      return null;
    }
    Matcher matcher = BROWSER_PATTERN.matcher(userAgent);
    return matcher.find() ? matcher.group(1) : null;
  }

  String extractOs(String userAgent) {
    if (userAgent == null) {
      return null;
    }
    Matcher matcher = OS_PATTERN.matcher(userAgent);
    return matcher.find() ? matcher.group(1) : null;
  }
}
