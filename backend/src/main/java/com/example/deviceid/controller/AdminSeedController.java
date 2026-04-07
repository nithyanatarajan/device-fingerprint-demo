package com.example.deviceid.controller;

import com.example.deviceid.dto.AdminSeedRequest;
import com.example.deviceid.dto.AdminSeedSummary;
import com.example.deviceid.dto.CollectResponse;
import com.example.deviceid.service.AdminSeedService;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Endpoints behind the Tuning Console's Demo Data form. */
@RestController
@RequestMapping("/api/admin/seed")
public class AdminSeedController {

  private final AdminSeedService adminSeedService;

  /** Creates the controller with the seed service. */
  public AdminSeedController(AdminSeedService adminSeedService) {
    this.adminSeedService = adminSeedService;
  }

  /**
   * Runs one synthetic visit and returns the live {@link CollectResponse} the page would render.
   */
  @PostMapping
  public CollectResponse seed(@RequestBody AdminSeedRequest request) {
    return adminSeedService.seed(request);
  }

  /** Counts of {@code demo-user-*} data currently stored. */
  @GetMapping("/summary")
  public AdminSeedSummary summary() {
    return adminSeedService.summary();
  }

  /** Cascading-deletes every {@code demo-user-*} user along with their devices and fingerprints. */
  @DeleteMapping
  public AdminSeedSummary clearAll() {
    return adminSeedService.clearAll();
  }
}
