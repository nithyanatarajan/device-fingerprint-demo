package com.example.deviceid.dto;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/**
 * One fingerprint capture in a device's visit timeline.
 *
 * <p>{@code signals} is a flat map of every signal name to its raw value (string, number, boolean,
 * or null) so the frontend can render a side-by-side table without per-signal accessor logic.
 */
public record VisitEntry(
    UUID fingerprintId,
    Instant collectedAt,
    String publicIp,
    String machineSignature,
    Map<String, Object> signals) {}
