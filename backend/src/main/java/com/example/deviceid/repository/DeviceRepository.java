package com.example.deviceid.repository;

import com.example.deviceid.domain.Device;
import com.example.deviceid.domain.User;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Repository for managing Device persistence. */
public interface DeviceRepository extends JpaRepository<Device, UUID> {

  /** Finds all devices belonging to a user. */
  List<Device> findByUser(User user);
}
