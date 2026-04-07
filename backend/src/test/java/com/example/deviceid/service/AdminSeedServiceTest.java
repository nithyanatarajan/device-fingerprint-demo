package com.example.deviceid.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.example.deviceid.dto.AdminSeedRequest;
import com.example.deviceid.dto.AdminSeedSummary;
import com.example.deviceid.dto.CollectResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@SpringBootTest
@Transactional
class AdminSeedServiceTest {

  @Autowired private AdminSeedService adminSeedService;

  @Test
  void seedCreatesSyntheticUserAndReturnsCollectResponse() {
    CollectResponse response =
        adminSeedService.seed(new AdminSeedRequest("demo-user-alpha", "chrome", false, false));

    assertThat(response.userId()).isNotNull();
    assertThat(response.deviceId()).isNotNull();
    assertThat(response.deviceLabel()).isNotBlank();

    AdminSeedSummary summary = adminSeedService.summary();
    assertThat(summary.users()).isEqualTo(1);
    assertThat(summary.devices()).isEqualTo(1);
    assertThat(summary.fingerprints()).isEqualTo(1);
  }

  @Test
  void seedRejectsUserNameWithoutDemoPrefix() {
    assertThatThrownBy(
            () -> adminSeedService.seed(new AdminSeedRequest("nithya", "chrome", false, false)))
        .isInstanceOf(ResponseStatusException.class)
        .extracting(e -> ((ResponseStatusException) e).getStatusCode())
        .isEqualTo(HttpStatus.BAD_REQUEST);
  }

  @Test
  void seedRejectsUnknownBrowser() {
    assertThatThrownBy(
            () ->
                adminSeedService.seed(
                    new AdminSeedRequest("demo-user-alpha", "edge", false, false)))
        .isInstanceOf(ResponseStatusException.class)
        .extracting(e -> ((ResponseStatusException) e).getStatusCode())
        .isEqualTo(HttpStatus.BAD_REQUEST);
  }

  @Test
  void seedSupportsAllBrowserAndIncognitoCombinations() {
    adminSeedService.seed(new AdminSeedRequest("demo-user-a", "chrome", false, false));
    adminSeedService.seed(new AdminSeedRequest("demo-user-b", "chrome", true, true));
    adminSeedService.seed(new AdminSeedRequest("demo-user-c", "firefox", false, false));
    adminSeedService.seed(new AdminSeedRequest("demo-user-d", "firefox", false, true));
    adminSeedService.seed(new AdminSeedRequest("demo-user-e", "safari", false, false));
    adminSeedService.seed(new AdminSeedRequest("demo-user-f", "safari", false, true));

    assertThat(adminSeedService.summary().users()).isEqualTo(6);
  }

  @Test
  void seedTwiceForSameUserAndBrowserMatchesExistingDevice() {
    adminSeedService.seed(new AdminSeedRequest("demo-user-alpha", "chrome", false, false));
    adminSeedService.seed(new AdminSeedRequest("demo-user-alpha", "chrome", false, false));

    AdminSeedSummary summary = adminSeedService.summary();
    assertThat(summary.users()).isEqualTo(1);
    // Same template = same fingerprint -> SAME_DEVICE match -> no new device created.
    assertThat(summary.devices()).isEqualTo(1);
    assertThat(summary.fingerprints()).isEqualTo(2);
  }

  @Test
  void summaryReturnsZeroWhenNoDemoData() {
    assertThat(adminSeedService.summary()).isEqualTo(new AdminSeedSummary(0, 0, 0));
  }

  @Test
  void clearAllDeletesAllDemoUsersAndReturnsCounts() {
    adminSeedService.seed(new AdminSeedRequest("demo-user-alpha", "chrome", false, false));
    adminSeedService.seed(new AdminSeedRequest("demo-user-beta", "firefox", false, false));

    AdminSeedSummary cleared = adminSeedService.clearAll();
    assertThat(cleared.users()).isEqualTo(2);
    assertThat(cleared.devices()).isEqualTo(2);
    assertThat(cleared.fingerprints()).isEqualTo(2);

    assertThat(adminSeedService.summary()).isEqualTo(new AdminSeedSummary(0, 0, 0));
  }
}
