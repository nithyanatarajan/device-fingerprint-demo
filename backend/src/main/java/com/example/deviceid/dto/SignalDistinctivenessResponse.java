package com.example.deviceid.dto;

import java.util.List;
import java.util.UUID;

/**
 * Response payload describing how distinctive each signal of a given fingerprint is against the
 * current fingerprint database.
 *
 * <p>All counts are measured from the live fingerprint table — nothing is fabricated, nothing is
 * compared against a reference population. With a small database the absolute numbers will be
 * small, so the frontend presents them with a caption warning that the meaning grows with sample
 * size.
 */
public record SignalDistinctivenessResponse(
    UUID fingerprintId,
    long totalFingerprints,
    List<SignalDistinctivenessEntry> signals,
    long fullFingerprintMatchCount) {}
