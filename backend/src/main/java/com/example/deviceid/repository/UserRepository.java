package com.example.deviceid.repository;

import com.example.deviceid.domain.User;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Repository for managing User persistence. */
public interface UserRepository extends JpaRepository<User, UUID> {

  /** Finds a user by their unique name. */
  Optional<User> findByName(String name);
}
