package com.example.deviceid.controller;

import com.example.deviceid.dto.SignalDistinctivenessResponse;
import com.example.deviceid.service.SignalDistinctivenessService;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** REST endpoints for per-signal distinctiveness lookups. */
@RestController
@RequestMapping("/api/signals")
public class SignalsController {

  private final SignalDistinctivenessService distinctivenessService;

  /** Creates the controller with the distinctiveness service. */
  public SignalsController(SignalDistinctivenessService distinctivenessService) {
    this.distinctivenessService = distinctivenessService;
  }

  /**
   * Returns per-signal distinctiveness stats for the given fingerprint against the current
   * fingerprint table. Drives the Collect-page Distinctiveness panel.
   */
  @GetMapping("/distinctiveness")
  public SignalDistinctivenessResponse getDistinctiveness(
      @RequestParam("fingerprintId") UUID fingerprintId) {
    return distinctivenessService.computeFor(fingerprintId);
  }
}
