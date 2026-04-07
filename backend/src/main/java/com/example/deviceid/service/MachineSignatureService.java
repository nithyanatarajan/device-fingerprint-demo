package com.example.deviceid.service;

import com.example.deviceid.domain.DeviceFingerprint;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import org.springframework.stereotype.Component;

/**
 * Computes a stable, browser-independent machine signature over hardware-only signals.
 *
 * <p>Browser-specific signals (canvas, webgl, userAgent, codec, locale, pixelRatio, dntEnabled,
 * cookieEnabled) are deliberately excluded so the signature remains stable across different
 * browsers running on the same machine.
 */
@Component
public class MachineSignatureService {

  /** Computes a SHA-256 hex digest over the hardware signals of the given fingerprint. */
  public String computeSignature(DeviceFingerprint fp) {
    StringBuilder sb = new StringBuilder();
    sb.append(serialize(fp.getTimezone())).append('|');
    sb.append(serialize(fp.getPlatform())).append('|');
    sb.append(serialize(fp.getScreenResolution())).append('|');
    sb.append(serialize(fp.getColorDepth())).append('|');
    sb.append(serialize(fp.getHardwareConcurrency())).append('|');
    sb.append(serialize(fp.getDeviceMemory())).append('|');
    sb.append(serialize(fp.getTouchSupport()));

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
