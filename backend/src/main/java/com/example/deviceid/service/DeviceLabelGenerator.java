package com.example.deviceid.service;

import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

/** Generates human-readable device labels from user agent and platform strings. */
@Component
public class DeviceLabelGenerator {

  private static final String UNKNOWN_DEVICE = "Unknown Device";

  private static final Pattern BROWSER_PATTERN =
      Pattern.compile("(Chrome|Firefox|Safari|Edge|Opera|Brave)", Pattern.CASE_INSENSITIVE);
  private static final Pattern OS_PATTERN =
      Pattern.compile(
          "(Windows|MacOS|Mac\\s*OS|Macintosh|Linux|Android|iOS|iPhone"
              + "|iPad|CrOS|Chrome\\s*OS)",
          Pattern.CASE_INSENSITIVE);

  /** Generates a label like "Chrome on MacOS" from user agent and platform strings. */
  public String generate(String userAgent, String platform) {
    if (userAgent == null || userAgent.isBlank()) {
      return UNKNOWN_DEVICE;
    }

    String browser = extractBrowser(userAgent);
    String os = extractOs(userAgent, platform);

    if (browser == null && os == null) {
      return UNKNOWN_DEVICE;
    }
    if (browser == null) {
      return os;
    }
    if (os == null) {
      return browser;
    }
    return browser + " on " + os;
  }

  private String extractBrowser(String userAgent) {
    Matcher matcher = BROWSER_PATTERN.matcher(userAgent);
    return matcher.find() ? matcher.group(1) : null;
  }

  private String extractOs(String userAgent, String platform) {
    Matcher matcher = OS_PATTERN.matcher(userAgent);
    if (matcher.find()) {
      String matched = matcher.group(1);
      return normalizeOs(matched);
    }
    if (platform != null && !platform.isBlank()) {
      Matcher platformMatcher = OS_PATTERN.matcher(platform);
      if (platformMatcher.find()) {
        return normalizeOs(platformMatcher.group(1));
      }
    }
    return null;
  }

  private String normalizeOs(String os) {
    String lower = os.toLowerCase();
    if (lower.contains("mac")) {
      return "MacOS";
    }
    if (lower.contains("win")) {
      return "Windows";
    }
    if (lower.contains("linux")) {
      return "Linux";
    }
    if (lower.contains("android")) {
      return "Android";
    }
    if (lower.contains("ios") || lower.contains("iphone") || lower.contains("ipad")) {
      return "iOS";
    }
    if (lower.contains("cros") || lower.contains("chrome os")) {
      return "ChromeOS";
    }
    return os;
  }
}
