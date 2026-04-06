package com.example.deviceid.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.example.deviceid.domain.User;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class UserRepositoryTest {

  @Autowired private UserRepository userRepository;

  @Test
  void findByNameShouldReturnUserWhenExists() {
    User user = new User("testuser");
    userRepository.saveAndFlush(user);

    Optional<User> found = userRepository.findByName("testuser");

    assertThat(found).isPresent();
    assertThat(found.get().getName()).isEqualTo("testuser");
  }

  @Test
  void findByNameShouldReturnEmptyForUnknownName() {
    Optional<User> found = userRepository.findByName("unknown");

    assertThat(found).isEmpty();
  }

  @Test
  void findByNameShouldBeCaseSensitiveAtDbLevel() {
    User user = new User("testuser");
    userRepository.saveAndFlush(user);

    // The entity stores lowercase, so searching with uppercase won't match
    Optional<User> found = userRepository.findByName("TESTUSER");

    assertThat(found).isEmpty();
  }
}
