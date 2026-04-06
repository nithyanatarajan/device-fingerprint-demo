package com.example.deviceid.dto;

import java.util.UUID;

/** Summary view of a user with their device count. */
public record UserSummary(UUID id, String name, int deviceCount) {}
