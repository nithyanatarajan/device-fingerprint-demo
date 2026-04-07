package com.example.deviceid.dto;

/**
 * Counts of synthetic {@code demo-user-*} data currently in the database. Used by the Tuning
 * Console's clear-confirmation dialog.
 */
public record AdminSeedSummary(int users, int devices, int fingerprints) {}
