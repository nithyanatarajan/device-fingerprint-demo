package com.example.deviceid.domain;

/** Classification result of a fingerprint comparison. */
public enum MatchResult {
  SAME_DEVICE,
  DRIFT_DETECTED,
  NEW_DEVICE
}
