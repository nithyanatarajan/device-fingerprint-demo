package com.example.deviceid.dto;

/** Aggregate counters for the ripple-effect preview. */
public record PreviewSummary(
    int totalUsers,
    int totalDevices,
    int totalFingerprints,
    int affectedDevices,
    int promotedCount,
    int demotedCount,
    int unchangedCount) {}
