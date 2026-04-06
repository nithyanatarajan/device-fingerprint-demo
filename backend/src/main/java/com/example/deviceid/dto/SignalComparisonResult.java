package com.example.deviceid.dto;

/** Result of comparing a single signal between two fingerprints. */
public record SignalComparisonResult(
    String signalName, double score, Object value1, Object value2) {}
