package com.example.deviceid.dto;

import java.time.Instant;
import java.util.UUID;

/** Summary view of a device. */
public record DeviceSummary(
    UUID id, String label, Instant createdAt, Instant lastSeenAt, int visitCount) {}
