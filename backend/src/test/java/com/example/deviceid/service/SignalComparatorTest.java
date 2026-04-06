package com.example.deviceid.service;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class SignalComparatorTest {

  private final SignalComparator comparator = new SignalComparator();

  @Test
  void exactMatchShouldReturnOne() {
    assertThat(comparator.compare("canvas_hash", "abc123", "abc123")).isEqualTo(1.0);
  }

  @Test
  void noMatchShouldReturnZero() {
    assertThat(comparator.compare("canvas_hash", "abc123", "xyz789")).isEqualTo(0.0);
  }

  @Test
  void bothNullShouldReturnOne() {
    assertThat(comparator.compare("canvas_hash", null, null)).isEqualTo(1.0);
  }

  @Test
  void oneNullShouldReturnZero() {
    assertThat(comparator.compare("canvas_hash", "abc123", null)).isEqualTo(0.0);
    assertThat(comparator.compare("canvas_hash", null, "abc123")).isEqualTo(0.0);
  }

  @Test
  void userAgentSameBrowserFamilyDifferentVersionShouldReturnHalf() {
    String ua1 = "Mozilla/5.0 (Macintosh) Chrome/120.0.0";
    String ua2 = "Mozilla/5.0 (Macintosh) Chrome/121.0.0";
    assertThat(comparator.compare("user_agent", ua1, ua2)).isEqualTo(0.5);
  }

  @Test
  void userAgentExactMatchShouldReturnOne() {
    String ua = "Mozilla/5.0 (Macintosh) Chrome/120.0.0";
    assertThat(comparator.compare("user_agent", ua, ua)).isEqualTo(1.0);
  }

  @Test
  void userAgentDifferentBrowserShouldReturnZero() {
    String ua1 = "Mozilla/5.0 (Macintosh) Chrome/120.0.0";
    String ua2 = "Mozilla/5.0 (Macintosh) Firefox/120.0";
    assertThat(comparator.compare("user_agent", ua1, ua2)).isEqualTo(0.0);
  }

  @Test
  void userAgentDifferentOsShouldReturnZero() {
    String ua1 = "Mozilla/5.0 (Macintosh) Chrome/120.0.0";
    String ua2 = "Mozilla/5.0 (Windows) Chrome/120.0.0";
    assertThat(comparator.compare("user_agent", ua1, ua2)).isEqualTo(0.0);
  }

  @Test
  void codecSupportHighOverlapShouldReturnOne() {
    String codecs1 = "video/webm,video/mp4,audio/ogg,audio/mp3";
    String codecs2 = "video/webm,video/mp4,audio/ogg,audio/mp3";
    assertThat(comparator.compare("codec_support", codecs1, codecs2)).isEqualTo(1.0);
  }

  @Test
  void codecSupportMediumOverlapShouldReturnHalf() {
    // 3 out of 5 unique items overlap -> jaccard = 3/5 = 0.6 >= 0.5
    String codecs1 = "video/webm,video/mp4,audio/ogg";
    String codecs2 = "video/webm,video/mp4,audio/ogg,audio/mp3,audio/wav";
    assertThat(comparator.compare("codec_support", codecs1, codecs2)).isEqualTo(0.5);
  }

  @Test
  void codecSupportLowOverlapShouldReturnZero() {
    // 1 out of 5 unique items -> jaccard = 1/5 = 0.2 < 0.5
    String codecs1 = "video/webm,audio/special1,audio/special2";
    String codecs2 = "video/webm,video/mp4,audio/ogg";
    assertThat(comparator.compare("codec_support", codecs1, codecs2)).isEqualTo(0.0);
  }

  @Test
  void extractBrowserFamilyShouldParseChrome() {
    assertThat(comparator.extractBrowserFamily("Mozilla/5.0 Chrome/120")).isEqualTo("Chrome");
  }

  @Test
  void extractBrowserFamilyShouldParseFirefox() {
    assertThat(comparator.extractBrowserFamily("Mozilla/5.0 Firefox/120")).isEqualTo("Firefox");
  }

  @Test
  void extractBrowserFamilyShouldReturnNullForUnknown() {
    assertThat(comparator.extractBrowserFamily("SomeUnknownBrowser/1.0")).isNull();
  }

  @Test
  void extractBrowserFamilyShouldReturnNullForNullInput() {
    assertThat(comparator.extractBrowserFamily(null)).isNull();
  }

  @Test
  void extractOsShouldParseMacOs() {
    assertThat(comparator.extractOs("Mozilla/5.0 (Macintosh)")).isEqualTo("Macintosh");
  }

  @Test
  void extractOsShouldParseWindows() {
    assertThat(comparator.extractOs("Mozilla/5.0 (Windows NT 10.0)")).isEqualTo("Windows");
  }

  @Test
  void extractOsShouldReturnNullForNullInput() {
    assertThat(comparator.extractOs(null)).isNull();
  }

  @Test
  void extractOsShouldReturnNullForUnknown() {
    assertThat(comparator.extractOs("SomeAgent/1.0")).isNull();
  }

  @Test
  void codecSupportBothEmptyShouldReturnOne() {
    assertThat(comparator.compare("codec_support", "", "")).isEqualTo(1.0);
  }

  @Test
  void codecSupportOneEmptyShouldReturnZero() {
    assertThat(comparator.compare("codec_support", "video/webm", "")).isEqualTo(0.0);
  }
}
