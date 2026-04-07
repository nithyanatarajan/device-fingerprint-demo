package com.example.deviceid.controller;

import com.example.deviceid.dto.CollectRequest;
import com.example.deviceid.dto.CollectResponse;
import com.example.deviceid.service.CollectionService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** REST endpoint for collecting device fingerprints. */
@RestController
@RequestMapping("/api")
public class CollectionController {

  private final CollectionService collectionService;

  /** Creates the controller with the collection service. */
  public CollectionController(CollectionService collectionService) {
    this.collectionService = collectionService;
  }

  /** Collects a fingerprint and returns the match result. */
  @PostMapping("/collect")
  public CollectResponse collect(
      @RequestBody CollectRequest request, HttpServletRequest httpRequest) {
    String ip = resolveClientIp(httpRequest);
    return collectionService.collect(request, ip);
  }

  private String resolveClientIp(HttpServletRequest req) {
    String forwarded = req.getHeader("X-Forwarded-For");
    if (forwarded != null && !forwarded.isBlank()) {
      int comma = forwarded.indexOf(',');
      return comma == -1 ? forwarded.trim() : forwarded.substring(0, comma).trim();
    }
    return req.getRemoteAddr();
  }
}
