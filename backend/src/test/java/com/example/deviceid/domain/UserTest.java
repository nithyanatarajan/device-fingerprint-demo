package com.example.deviceid.domain;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class UserTest {

  @Test
  void nameShouldBeStoredInLowercase() {
    User user = new User("TestUser");
    assertThat(user.getName()).isEqualTo("testuser");
  }

  @Test
  void alreadyLowercaseNameShouldBeUnchanged() {
    User user = new User("testuser");
    assertThat(user.getName()).isEqualTo("testuser");
  }

  @Test
  void mixedCaseNameShouldBeLowercased() {
    User user = new User("UserA");
    assertThat(user.getName()).isEqualTo("usera");
  }

  @Test
  void newUserShouldHaveNullIdAndCreatedAt() {
    User user = new User("testuser");
    assertThat(user.getId()).isNull();
    assertThat(user.getCreatedAt()).isNull();
  }

  @Test
  void prePersistShouldSetCreatedAt() {
    User user = new User("testuser");
    user.onPrePersist();
    assertThat(user.getCreatedAt()).isNotNull();
  }
}
