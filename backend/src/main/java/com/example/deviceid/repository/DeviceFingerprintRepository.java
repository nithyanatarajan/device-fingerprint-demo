package com.example.deviceid.repository;

import com.example.deviceid.domain.Device;
import com.example.deviceid.domain.DeviceFingerprint;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Repository for managing DeviceFingerprint persistence. */
public interface DeviceFingerprintRepository extends JpaRepository<DeviceFingerprint, UUID> {

  /** Finds all fingerprints for a device, ordered by collection time descending. */
  List<DeviceFingerprint> findByDeviceOrderByCollectedAtDesc(Device device);

  /** Finds the most recent fingerprint for a device. */
  Optional<DeviceFingerprint> findTopByDeviceOrderByCollectedAtDesc(Device device);

  /** Finds all fingerprints sharing the given machine signature. */
  List<DeviceFingerprint> findByMachineSignature(String machineSignature);
}
