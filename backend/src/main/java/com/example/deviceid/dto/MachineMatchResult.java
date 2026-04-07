package com.example.deviceid.dto;

import java.util.List;

/**
 * Tiered machine match result returned by collection.
 *
 * <p>{@code strongMatches}: hardware + timezone + locale + publicIp all align.
 *
 * <p>{@code possibleMatches}: hardware + timezone + locale align but publicIp differs (e.g., VPN,
 * café, mobile hotspot, roamed Wi-Fi).
 *
 * <p>Both lists are always non-null; either may be empty.
 */
public record MachineMatchResult(
    List<MachineMatch> strongMatches, List<MachineMatch> possibleMatches) {}
