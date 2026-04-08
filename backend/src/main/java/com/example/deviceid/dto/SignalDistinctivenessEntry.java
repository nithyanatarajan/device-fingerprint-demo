package com.example.deviceid.dto;

/**
 * Per-signal distinctiveness stats for a single fingerprint.
 *
 * <p>{@code matchCount} is the number of fingerprints in the current database (including the
 * subject fingerprint itself) whose value for this signal equals the subject's value. So {@code
 * matchCount == 1} means "no-one else has this value yet". {@code distinctValues} is the number of
 * distinct values stored across the whole fingerprint table for this signal.
 */
public record SignalDistinctivenessEntry(
    String signalName, String value, long matchCount, long distinctValues) {}
