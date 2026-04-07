package com.example.deviceid.dto;

import java.util.List;
import java.util.UUID;

/** Per-user grouping of device previews in the ripple-effect preview response. */
public record UserPreview(UUID userId, String userName, List<DevicePreview> devices) {}
