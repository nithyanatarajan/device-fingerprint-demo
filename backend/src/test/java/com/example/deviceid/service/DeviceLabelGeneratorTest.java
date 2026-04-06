package com.example.deviceid.service;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class DeviceLabelGeneratorTest {

  private final DeviceLabelGenerator generator = new DeviceLabelGenerator();

  @Test
  void shouldGenerateChromeOnMacOs() {
    String label =
        generator.generate(
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0", "MacIntel");
    assertThat(label).isEqualTo("Chrome on MacOS");
  }

  @Test
  void shouldGenerateFirefoxOnWindows() {
    String label =
        generator.generate("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/120.0", "Win32");
    assertThat(label).isEqualTo("Firefox on Windows");
  }

  @Test
  void nullUserAgentShouldReturnUnknownDevice() {
    assertThat(generator.generate(null, "MacIntel")).isEqualTo("Unknown Device");
  }

  @Test
  void blankUserAgentShouldReturnUnknownDevice() {
    assertThat(generator.generate("  ", "MacIntel")).isEqualTo("Unknown Device");
  }

  @Test
  void unknownBrowserAndOsShouldReturnUnknownDevice() {
    assertThat(generator.generate("SomeUnknownAgent/1.0", null)).isEqualTo("Unknown Device");
  }

  @Test
  void shouldFallBackToPlatformForOs() {
    String label = generator.generate("Chrome/120.0", "Linux x86_64");
    assertThat(label).isEqualTo("Chrome on Linux");
  }

  @Test
  void shouldHandleSafariOnIos() {
    String label = generator.generate("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Safari/604", null);
    assertThat(label).isEqualTo("Safari on iOS");
  }

  @Test
  void shouldReturnOnlyBrowserWhenOsUnknown() {
    String label = generator.generate("Chrome/120.0", null);
    assertThat(label).isEqualTo("Chrome");
  }

  @Test
  void shouldReturnOnlyOsWhenBrowserUnknown() {
    String label = generator.generate("Mozilla/5.0 (Linux) AppleWebKit", null);
    assertThat(label).isEqualTo("Linux");
  }
}
