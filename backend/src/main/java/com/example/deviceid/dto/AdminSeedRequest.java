package com.example.deviceid.dto;

/**
 * Admin seed request from the Tuning Console's Demo Data form.
 *
 * <p>{@code userName} must start with the {@code demo-user-} prefix (enforced server-side). {@code
 * browser} is one of {@code chrome}, {@code firefox}, {@code safari} (case-insensitive). {@code
 * vpn} controls which public IP the synthetic visit is recorded against. {@code incognito} picks
 * the canonical incognito payload variant for the chosen browser.
 */
public record AdminSeedRequest(String userName, String browser, boolean vpn, boolean incognito) {}
