package com.example.deviceid.controller;

import com.example.deviceid.domain.Device;
import com.example.deviceid.domain.DeviceFingerprint;
import com.example.deviceid.domain.User;
import com.example.deviceid.dto.DeviceSummary;
import com.example.deviceid.dto.UserDetail;
import com.example.deviceid.dto.UserSummary;
import com.example.deviceid.repository.DeviceFingerprintRepository;
import com.example.deviceid.repository.DeviceRepository;
import com.example.deviceid.repository.UserRepository;
import java.util.List;
import java.util.Optional;
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

  /**
   * Number of leading hex characters of the machine signature surfaced in the device summary. Kept
   * short for compact UI display in the Tuning Console; the full signature is still in the database
   * if a deeper investigation needs it.
   */
  static final int MACHINE_SIGNATURE_DISPLAY_LENGTH = 16;

  private final UserRepository userRepository;
  private final DeviceRepository deviceRepository;
  private final DeviceFingerprintRepository fingerprintRepository;

  /** Creates the controller with required repositories. */
  public UserController(
      UserRepository userRepository,
      DeviceRepository deviceRepository,
      DeviceFingerprintRepository fingerprintRepository) {
    this.userRepository = userRepository;
    this.deviceRepository = deviceRepository;
    this.fingerprintRepository = fingerprintRepository;
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

  /** Returns detail for a single user. */
  @GetMapping("/{userId}")
  public UserDetail getUser(@PathVariable UUID userId) {
    User user =
        userRepository
            .findById(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    int deviceCount = deviceRepository.findByUser(user).size();
    return new UserDetail(user.getId(), user.getName(), deviceCount, user.getCreatedAt());
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
    Optional<DeviceFingerprint> latest =
        fingerprintRepository.findTopByDeviceOrderByCollectedAtDesc(device);
    String machineSignature = latest.map(this::truncateSignature).orElse(null);
    String publicIp = latest.map(DeviceFingerprint::getPublicIp).orElse(null);
    return new DeviceSummary(
        device.getId(),
        device.getLabel(),
        device.getCreatedAt(),
        device.getLastSeenAt(),
        device.getVisitCount(),
        machineSignature,
        publicIp);
  }

  private String truncateSignature(DeviceFingerprint fp) {
    String signature = fp.getMachineSignature();
    if (signature == null) {
      return null;
    }
    return signature.length() > MACHINE_SIGNATURE_DISPLAY_LENGTH
        ? signature.substring(0, MACHINE_SIGNATURE_DISPLAY_LENGTH)
        : signature;
  }
}
