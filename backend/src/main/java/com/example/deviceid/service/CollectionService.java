package com.example.deviceid.service;

import com.example.deviceid.domain.Device;
import com.example.deviceid.domain.DeviceFingerprint;
import com.example.deviceid.domain.MatchResult;
import com.example.deviceid.domain.User;
import com.example.deviceid.dto.CollectRequest;
import com.example.deviceid.dto.CollectResponse;
import com.example.deviceid.dto.MachineMatchResult;
import com.example.deviceid.dto.ScoringResult;
import com.example.deviceid.dto.SignalComparisonResult;
import com.example.deviceid.repository.DeviceFingerprintRepository;
import com.example.deviceid.repository.DeviceRepository;
import com.example.deviceid.repository.UserRepository;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Orchestrates fingerprint collection, device matching, and user management. */
@Service
@Transactional
public class CollectionService {

  private final UserRepository userRepository;
  private final DeviceRepository deviceRepository;
  private final DeviceFingerprintRepository fingerprintRepository;
  private final ScoringEngine scoringEngine;
  private final ScoringConfigService scoringConfigService;
  private final DeviceLabelGenerator labelGenerator;
  private final MachineSignatureService machineSignatureService;
  private final MachineMatchService machineMatchService;

  /** Creates the collection service with required dependencies. */
  public CollectionService(
      UserRepository userRepository,
      DeviceRepository deviceRepository,
      DeviceFingerprintRepository fingerprintRepository,
      ScoringEngine scoringEngine,
      ScoringConfigService scoringConfigService,
      DeviceLabelGenerator labelGenerator,
      MachineSignatureService machineSignatureService,
      MachineMatchService machineMatchService) {
    this.userRepository = userRepository;
    this.deviceRepository = deviceRepository;
    this.fingerprintRepository = fingerprintRepository;
    this.scoringEngine = scoringEngine;
    this.scoringConfigService = scoringConfigService;
    this.labelGenerator = labelGenerator;
    this.machineSignatureService = machineSignatureService;
    this.machineMatchService = machineMatchService;
  }

  /** Collects a fingerprint, matches against known devices, and returns the result. */
  public CollectResponse collect(CollectRequest request, String publicIp) {
    User user = findOrCreateUser(request.name());
    DeviceFingerprint incoming = buildFingerprint(request, null);
    List<Device> devices = deviceRepository.findByUser(user);

    Device bestDevice = null;
    ScoringResult bestResult = null;
    double bestScore = -1;

    Map<String, Double> weights = scoringConfigService.getEnabledWeights();
    double sameThreshold = scoringConfigService.getSameDeviceThreshold();
    double driftThreshold = scoringConfigService.getDriftThreshold();

    for (Device device : devices) {
      Optional<DeviceFingerprint> latestFp =
          fingerprintRepository.findTopByDeviceOrderByCollectedAtDesc(device);
      if (latestFp.isEmpty()) {
        continue;
      }

      ScoringResult result =
          scoringEngine.score(latestFp.get(), incoming, weights, sameThreshold, driftThreshold);
      if (result.score() > bestScore) {
        bestScore = result.score();
        bestDevice = device;
        bestResult = result;
      }
    }

    if (bestResult != null && bestResult.matchResult() != MatchResult.NEW_DEVICE) {
      bestDevice.recordVisit();
      deviceRepository.save(bestDevice);

      DeviceFingerprint savedFp = buildFingerprint(request, bestDevice);
      savedFp.setMachineSignature(machineSignatureService.computeSignature(savedFp));
      savedFp.setPublicIp(publicIp);
      DeviceFingerprint persistedFp = fingerprintRepository.save(savedFp);

      List<String> changedSignals = findChangedSignals(bestResult.signalComparisons());
      MachineMatchResult machineMatch = machineMatchService.findMatches(persistedFp);

      return new CollectResponse(
          user.getId(),
          bestDevice.getId(),
          persistedFp.getId(),
          bestDevice.getLabel(),
          bestResult.matchResult(),
          bestResult.score(),
          bestResult.signalComparisons(),
          changedSignals,
          machineMatch);
    }

    // New device
    String label = labelGenerator.generate(request.userAgent(), request.platform());
    Device newDevice = new Device(user, label);
    deviceRepository.save(newDevice);

    DeviceFingerprint savedFp = buildFingerprint(request, newDevice);
    savedFp.setMachineSignature(machineSignatureService.computeSignature(savedFp));
    savedFp.setPublicIp(publicIp);
    DeviceFingerprint persistedFp = fingerprintRepository.save(savedFp);

    MachineMatchResult machineMatch = machineMatchService.findMatches(persistedFp);

    return new CollectResponse(
        user.getId(),
        newDevice.getId(),
        persistedFp.getId(),
        newDevice.getLabel(),
        MatchResult.NEW_DEVICE,
        0.0,
        Collections.emptyList(),
        Collections.emptyList(),
        machineMatch);
  }

  private User findOrCreateUser(String name) {
    String normalizedName = name.toLowerCase(Locale.ROOT);
    return userRepository
        .findByName(normalizedName)
        .orElseGet(
            () -> {
              User newUser = new User(name);
              return userRepository.save(newUser);
            });
  }

  private DeviceFingerprint buildFingerprint(CollectRequest request, Device device) {
    DeviceFingerprint fp = new DeviceFingerprint(device);
    fp.setCanvasHash(request.canvasHash());
    fp.setWebglRenderer(request.webglRenderer());
    fp.setScreenResolution(request.screenResolution());
    fp.setColorDepth(request.colorDepth());
    fp.setPixelRatio(request.pixelRatio());
    fp.setTimezone(request.timezone());
    fp.setLocale(request.locale());
    fp.setPlatform(request.platform());
    fp.setUserAgent(request.userAgent());
    fp.setHardwareConcurrency(request.hardwareConcurrency());
    fp.setDeviceMemory(request.deviceMemory());
    fp.setTouchSupport(request.touchSupport());
    fp.setCodecSupport(request.codecSupport());
    fp.setDntEnabled(request.dntEnabled());
    fp.setCookieEnabled(request.cookieEnabled());
    fp.setFontHash(request.fontHash());
    return fp;
  }

  private List<String> findChangedSignals(List<SignalComparisonResult> comparisons) {
    List<String> changed = new ArrayList<>();
    for (SignalComparisonResult comparison : comparisons) {
      if (comparison.score() < 1.0) {
        changed.add(comparison.signalName());
      }
    }
    return changed;
  }
}
