package com.example.deviceid.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Locale;
import java.util.UUID;

/** A registered user who can own multiple devices. */
@Entity
@Table(name = "users")
public class User {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Column(unique = true, nullable = false)
  private String name;

  @Column(nullable = false)
  private Instant createdAt;

  /** JPA requires a no-arg constructor. */
  protected User() {}

  /** Creates a user with the given name, stored in lowercase. */
  public User(String name) {
    this.name = name.toLowerCase(Locale.ROOT);
  }

  @PrePersist
  void onPrePersist() {
    this.createdAt = Instant.now();
  }

  public UUID getId() {
    return id;
  }

  public String getName() {
    return name;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }
}
