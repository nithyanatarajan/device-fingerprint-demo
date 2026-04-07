package com.example.deviceid.service;

import com.example.deviceid.domain.DeviceFingerprint;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import org.springframework.stereotype.Component;

/**
 * Computes a stable, browser-independent machine signature over hardware-only signals.
 *
 * <p>The hash spans 5 hardware-and-font signals: platform, screenResolution, pixelRatio,
 * touchSupport, fontHash.
 *
 * <p><b>Why fontHash is included.</b> The first four signals are hardware properties shared by
 * every machine of a given model — two MacBook Pros of the same SKU collide on all of them. The
 * font hash breaks that tie. It is a digest the frontend computes by probing a curated list of font
 * names with {@code document.fonts.check()} and hashing the resulting bit vector. Three properties
 * make it suitable for the hash:
 *
 * <ul>
 *   <li><b>Cross-browser stable.</b> {@code document.fonts.check()} returns the same boolean for a
 *       given font name in Chrome, Firefox, and Safari on the same OS, because all three resolve
 *       against the system font registry rather than a browser-managed list.
 *   <li><b>High entropy within a user.</b> Two physically identical machines owned by the same user
 *       almost always diverge on installed fonts: one has Adobe Creative Cloud, the other has
 *       Office, the third has nothing extra. Installed software pulls in distinct font families.
 *   <li><b>Cheap.</b> ~150 boolean checks at page load on the frontend, sub-millisecond. The
 *       backend just stores the hex string and concatenates it into the signature.
 * </ul>
 *
 * <p>Signals deliberately excluded from the hash, with reasons:
 *
 * <ul>
 *   <li><b>canvas, webgl, userAgent, codec, locale, dntEnabled, cookieEnabled</b> — browser-
 *       specific or user-preference. Change per browser on the same machine.
 *   <li><b>timezone</b> — OS setting that changes when the user travels or on DST transitions.
 *       Handled as a hard co-match gate in {@code MachineMatchService} (alias-aware).
 *   <li><b>deviceMemory</b> — the Device Memory API is Chromium-only. Firefox and Safari return
 *       {@code undefined} → {@code null} in our DTO.
 *   <li><b>colorDepth</b> — Safari deliberately reports {@code 24} on Display P3 panels even though
 *       the hardware supports 30-bit colour, as anti-fingerprinting. Chrome and Firefox report the
 *       actual {@code 30}. Including this signal would cause the same Apple Silicon machine to
 *       produce different hashes across browser families.
 *   <li><b>hardwareConcurrency</b> — WebKit caps {@code navigator.hardwareConcurrency} at 8
 *       regardless of the actual logical core count, also as anti-fingerprinting. A 12-core MacBook
 *       reports 12 in Chrome and Firefox but 8 in Safari.
 * </ul>
 *
 * <p>The principle: a signal only belongs in the hash if every major browser reports it identically
 * for the same physical hardware. Anything that varies for browser-API or browser- privacy reasons
 * would silently break cross-browser machine recognition — the very property the hash exists to
 * provide.
 *
 * <p>The trade-off is reduced entropy. With the four hardware-only signals the global combination
 * space was small (~1,500 buckets); adding fontHash brings it to roughly 2 million to 80 million
 * combinations, large enough that within-user collisions between two physically distinct devices
 * become rare. Per-user scoping in {@code MachineMatchService} contains any residual collision
 * risk: matches are only computed against the current user's own devices (typically 1–3), not the
 * global population. The full FP-reduction rationale is documented in {@code docs/how-it-works.md}.
 */
@Component
public class MachineSignatureService {

  /** Computes a SHA-256 hex digest over the hardware signals of the given fingerprint. */
  public String computeSignature(DeviceFingerprint fp) {
    StringBuilder sb = new StringBuilder();
    sb.append(serialize(fp.getPlatform())).append('|');
    sb.append(serialize(fp.getScreenResolution())).append('|');
    sb.append(serialize(fp.getPixelRatio())).append('|');
    sb.append(serialize(fp.getTouchSupport())).append('|');
    sb.append(serialize(fp.getFontHash()));

    try {
      MessageDigest digest = MessageDigest.getInstance("SHA-256");
      byte[] hash = digest.digest(sb.toString().getBytes(StandardCharsets.UTF_8));
      return toHex(hash);
    } catch (NoSuchAlgorithmException e) {
      throw new IllegalStateException("SHA-256 algorithm not available", e);
    }
  }

  private String serialize(Object value) {
    return value == null ? "null" : value.toString();
  }

  private String toHex(byte[] bytes) {
    StringBuilder hex = new StringBuilder(bytes.length * 2);
    for (byte b : bytes) {
      hex.append(String.format("%02x", b));
    }
    return hex.toString();
  }
}
