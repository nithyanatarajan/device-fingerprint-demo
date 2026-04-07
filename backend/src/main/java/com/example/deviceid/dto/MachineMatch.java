package com.example.deviceid.dto;

import java.time.Instant;
import java.util.UUID;

/** A single cross-browser machine match: another device on the same hardware and IP. */
public record MachineMatch(
    UUID userId, String userName, UUID deviceId, String deviceLabel, Instant lastSeenAt) {}
