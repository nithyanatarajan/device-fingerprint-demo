package com.example.deviceid.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** A snapshot of browser/device signals collected at a point in time. */
@Entity
@Table(name = "device_fingerprints")
@SuppressWarnings("MemberName")
public class DeviceFingerprint {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  private Device device;

  @Column(nullable = false)
  private Instant collectedAt;

  @Lob
  @Column(columnDefinition = "TEXT")
  private String rawSignals;

  // Individual signal fields
  private String canvasHash;

  private String webglRenderer;
  private String screenResolution;
  private Integer colorDepth;
  private Double pixelRatio;
  private String timezone;
  private String locale;
  private String platform;

  @Column(length = 1024)
  private String userAgent;

  private Integer hardwareConcurrency;
  private Double deviceMemory;
  private Integer touchSupport;

  @Column(length = 2048)
  private String codecSupport;

  private Boolean dntEnabled;
  private Boolean cookieEnabled;

  /** JPA requires a no-arg constructor. */
  protected DeviceFingerprint() {}

  /** Creates a fingerprint associated with the given device. */
  public DeviceFingerprint(Device device) {
    this.device = device;
  }

  @PrePersist
  void onPrePersist() {
    this.collectedAt = Instant.now();
  }

  public UUID getId() {
    return id;
  }

  public Device getDevice() {
    return device;
  }

  public Instant getCollectedAt() {
    return collectedAt;
  }

  public String getRawSignals() {
    return rawSignals;
  }

  public void setRawSignals(String rawSignals) {
    this.rawSignals = rawSignals;
  }

  public String getCanvasHash() {
    return canvasHash;
  }

  public void setCanvasHash(String canvasHash) {
    this.canvasHash = canvasHash;
  }

  public String getWebglRenderer() {
    return webglRenderer;
  }

  public void setWebglRenderer(String webglRenderer) {
    this.webglRenderer = webglRenderer;
  }

  public String getScreenResolution() {
    return screenResolution;
  }

  public void setScreenResolution(String screenResolution) {
    this.screenResolution = screenResolution;
  }

  public Integer getColorDepth() {
    return colorDepth;
  }

  public void setColorDepth(Integer colorDepth) {
    this.colorDepth = colorDepth;
  }

  public Double getPixelRatio() {
    return pixelRatio;
  }

  public void setPixelRatio(Double pixelRatio) {
    this.pixelRatio = pixelRatio;
  }

  public String getTimezone() {
    return timezone;
  }

  public void setTimezone(String timezone) {
    this.timezone = timezone;
  }

  public String getLocale() {
    return locale;
  }

  public void setLocale(String locale) {
    this.locale = locale;
  }

  public String getPlatform() {
    return platform;
  }

  public void setPlatform(String platform) {
    this.platform = platform;
  }

  public String getUserAgent() {
    return userAgent;
  }

  public void setUserAgent(String userAgent) {
    this.userAgent = userAgent;
  }

  public Integer getHardwareConcurrency() {
    return hardwareConcurrency;
  }

  public void setHardwareConcurrency(Integer hardwareConcurrency) {
    this.hardwareConcurrency = hardwareConcurrency;
  }

  public Double getDeviceMemory() {
    return deviceMemory;
  }

  public void setDeviceMemory(Double deviceMemory) {
    this.deviceMemory = deviceMemory;
  }

  public Integer getTouchSupport() {
    return touchSupport;
  }

  public void setTouchSupport(Integer touchSupport) {
    this.touchSupport = touchSupport;
  }

  public String getCodecSupport() {
    return codecSupport;
  }

  public void setCodecSupport(String codecSupport) {
    this.codecSupport = codecSupport;
  }

  public Boolean getDntEnabled() {
    return dntEnabled;
  }

  public void setDntEnabled(Boolean dntEnabled) {
    this.dntEnabled = dntEnabled;
  }

  public Boolean getCookieEnabled() {
    return cookieEnabled;
  }

  public void setCookieEnabled(Boolean cookieEnabled) {
    this.cookieEnabled = cookieEnabled;
  }
}
