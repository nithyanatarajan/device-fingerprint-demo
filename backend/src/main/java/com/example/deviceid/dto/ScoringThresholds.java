package com.example.deviceid.dto;

/** Threshold configuration for scoring classification. */
public record ScoringThresholds(double sameDeviceThreshold, double driftThreshold) {}
