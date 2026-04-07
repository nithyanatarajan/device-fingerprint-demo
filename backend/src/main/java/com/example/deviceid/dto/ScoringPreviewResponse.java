package com.example.deviceid.dto;

import java.util.List;

/** Response payload for the ripple-effect preview endpoint. */
public record ScoringPreviewResponse(List<UserPreview> users, PreviewSummary summary) {}
