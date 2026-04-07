package com.example.deviceid.dto;

import java.util.List;

/** Wrapper for the list of machine matches discovered during collection. */
public record MachineMatchResult(List<MachineMatch> matches) {}
