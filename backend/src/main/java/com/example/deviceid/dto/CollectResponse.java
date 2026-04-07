package com.example.deviceid.dto;

import com.example.deviceid.domain.MatchResult;
import java.util.List;
import java.util.UUID;

/** Response payload after processing a collected fingerprint. */
public record CollectResponse(
    UUID userId,
    UUID deviceId,
    String deviceLabel,
    MatchResult matchResult,
    double score,
    List<SignalComparisonResult> signalComparisons,
    List<String> changedSignals,
    MachineMatchResult machineMatch) {}
