package com.example.deviceid.dto;

import com.example.deviceid.domain.MatchResult;
import java.util.UUID;

/** Per-device diff entry in the ripple-effect preview response. */
public record DevicePreview(
    UUID deviceId,
    String deviceLabel,
    int fingerprintCount,
    MatchResult currentClassification,
    MatchResult proposedClassification,
    double currentScore,
    double proposedScore,
    String transition) {}
