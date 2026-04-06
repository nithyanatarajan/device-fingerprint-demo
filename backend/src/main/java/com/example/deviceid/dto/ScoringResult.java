package com.example.deviceid.dto;

import com.example.deviceid.domain.MatchResult;
import java.util.List;

/** Aggregated scoring result from comparing two fingerprints. */
public record ScoringResult(
    double score, MatchResult matchResult, List<SignalComparisonResult> signalComparisons) {}
