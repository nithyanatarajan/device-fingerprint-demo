package com.example.deviceid.dto;

/** Request payload for collecting a device fingerprint. */
public record CollectRequest(
    String name,
    String canvasHash,
    String webglRenderer,
    String screenResolution,
    Integer colorDepth,
    Double pixelRatio,
    String timezone,
    String locale,
    String platform,
    String userAgent,
    Integer hardwareConcurrency,
    Double deviceMemory,
    Integer touchSupport,
    String codecSupport,
    Boolean dntEnabled,
    Boolean cookieEnabled) {}
