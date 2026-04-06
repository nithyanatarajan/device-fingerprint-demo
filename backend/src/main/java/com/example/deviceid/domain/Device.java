package com.example.deviceid.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** A device associated with a user, identified by fingerprint matching. */
@Entity
@Table(name = "devices")
public class Device {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  private User user;

  @Column(nullable = false)
  private String label;

  @Column(nullable = false)
  private Instant createdAt;

  @Column(nullable = false)
  private Instant lastSeenAt;

  @Column(nullable = false)
  private int visitCount;

  /** JPA requires a no-arg constructor. */
  protected Device() {}

  /** Creates a device for the given user with the specified label. */
  public Device(User user, String label) {
    this.user = user;
    this.label = label;
    this.visitCount = 1;
  }

  @PrePersist
  void onPrePersist() {
    Instant now = Instant.now();
    this.createdAt = now;
    this.lastSeenAt = now;
  }

  /** Records a new visit, incrementing the count and updating last-seen time. */
  public void recordVisit() {
    this.visitCount++;
    this.lastSeenAt = Instant.now();
  }

  public UUID getId() {
    return id;
  }

  public User getUser() {
    return user;
  }

  public String getLabel() {
    return label;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public Instant getLastSeenAt() {
    return lastSeenAt;
  }

  public int getVisitCount() {
    return visitCount;
  }
}
