package com.example.deviceid.dto;

import java.time.Instant;
import java.util.UUID;

/** Detailed view of a single user, returned by GET /api/users/{id}. */
public record UserDetail(UUID id, String name, int deviceCount, Instant createdAt) {}
