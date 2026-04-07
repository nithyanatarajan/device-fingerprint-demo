package com.example.deviceid.dto;

import java.time.Instant;
import java.util.UUID;

/**
 * Summary view of a device including identifying signals from its latest fingerprint.
 *
 * <p>{@code machineSignature} is the SHA-256 hex digest of the device's hardware signature
 * truncated to the first 16 characters for compact UI display. {@code publicIp} is the public IP
 * address last seen for this device. Both fields are populated from the latest fingerprint via
 * {@code DeviceFingerprintRepository.findTopByDeviceOrderByCollectedAtDesc} and are {@code null} if
 * no fingerprint has been captured yet for this device (defensive — should not happen in practice
 * because devices are created at the same time as their first fingerprint).
 */
public record DeviceSummary(
    UUID id,
    String label,
    Instant createdAt,
    Instant lastSeenAt,
    int visitCount,
    String machineSignature,
    String publicIp) {}
