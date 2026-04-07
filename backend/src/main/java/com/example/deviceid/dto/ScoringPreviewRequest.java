package com.example.deviceid.dto;

import com.example.deviceid.service.ScoringConfigService.SignalWeightConfig;
import java.util.Map;

/** Request payload for the read-only ripple-effect preview endpoint. */
public record ScoringPreviewRequest(
    Map<String, SignalWeightConfig> weights, double sameDeviceThreshold, double driftThreshold) {}
