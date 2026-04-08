package com.example.deviceid.dto;

import com.example.deviceid.domain.MatchResult;
import java.util.List;
import java.util.UUID;

/**
 * Response payload after processing a collected fingerprint.
 *
 * <p>{@code fingerprintId} is the UUID of the fingerprint row the backend just persisted for this
 * visit. Exposed so the frontend can query per-signal distinctiveness for this specific fingerprint
 * via {@code GET /api/signals/distinctiveness?fingerprintId=...} without having to re-query the
 * user's latest fingerprint.
 */
public record CollectResponse(
    UUID userId,
    UUID deviceId,
    UUID fingerprintId,
    String deviceLabel,
    MatchResult matchResult,
    double score,
    List<SignalComparisonResult> signalComparisons,
    List<String> changedSignals,
    MachineMatchResult machineMatch) {}
