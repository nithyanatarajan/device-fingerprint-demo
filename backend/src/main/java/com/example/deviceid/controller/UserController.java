package com.example.deviceid.controller;

import com.example.deviceid.domain.Device;
import com.example.deviceid.domain.User;
import com.example.deviceid.dto.DeviceSummary;
import com.example.deviceid.dto.UserSummary;
import com.example.deviceid.repository.DeviceRepository;
import com.example.deviceid.repository.UserRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/** REST endpoints for querying users and their devices. */
@RestController
@RequestMapping("/api/users")
public class UserController {

  private final UserRepository userRepository;
  private final DeviceRepository deviceRepository;

  /** Creates the controller with required repositories. */
  public UserController(UserRepository userRepository, DeviceRepository deviceRepository) {
    this.userRepository = userRepository;
    this.deviceRepository = deviceRepository;
  }

  /** Lists all users with their device counts. */
  @GetMapping
  public List<UserSummary> listUsers() {
    return userRepository.findAll().stream()
        .map(
            user -> {
              int deviceCount = deviceRepository.findByUser(user).size();
              return new UserSummary(user.getId(), user.getName(), deviceCount);
            })
        .toList();
  }

  /** Lists all devices for a specific user. */
  @GetMapping("/{userId}/devices")
  public List<DeviceSummary> listDevices(@PathVariable UUID userId) {
    User user =
        userRepository
            .findById(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

    return deviceRepository.findByUser(user).stream().map(this::toDeviceSummary).toList();
  }

  private DeviceSummary toDeviceSummary(Device device) {
    return new DeviceSummary(
        device.getId(),
        device.getLabel(),
        device.getCreatedAt(),
        device.getLastSeenAt(),
        device.getVisitCount());
  }
}
