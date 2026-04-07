package com.example.deviceid.dto;

/**
 * Per-signal entry in a {@link DeviceInvestigation} match explanation.
 *
 * <p>Captures everything the audience needs to understand why a single signal contributed (or
 * failed to contribute) to the composite score: the configured weight, whether the signal was
 * enabled, the raw values from the latest and previous fingerprint, the per-signal similarity score
 * (0.0 to 1.0), and the weighted contribution to the composite (0.0 to ~100.0 percent).
 */
public record SignalContribution(
    String signalName,
    double weight,
    boolean enabled,
    Object latestValue,
    Object previousValue,
    double similarityScore,
    double weightedContribution) {}
