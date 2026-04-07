package com.example.deviceid.config;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.env.Environment;

/**
 * Pins the default datasource configuration to in-memory H2 with create-drop DDL.
 *
 * <p>The {@code spring.datasource.url} and {@code spring.jpa.hibernate.ddl-auto} properties are
 * env-driven via {@code DATABASE_URL} and {@code DDL_AUTO} so that demo prep can opt into file-mode
 * persistence (see README). This test guards against accidentally changing the defaults — file mode
 * has cross-test interference (H2 file lock) and would silently make {@code ./gradlew test} unable
 * to run alongside a live {@code bootRun}. The defaults must remain in-memory so tests stay clean
 * and dev iteration produces a fresh state on every restart.
 */
@SpringBootTest
class DatasourceDefaultTest {

  @Autowired private Environment environment;

  @Test
  void defaultDatasourceUrlIsInMemoryH2() {
    assertThat(environment.getProperty("spring.datasource.url")).isEqualTo("jdbc:h2:mem:deviceid");
  }

  @Test
  void defaultDdlAutoIsCreateDrop() {
    assertThat(environment.getProperty("spring.jpa.hibernate.ddl-auto")).isEqualTo("create-drop");
  }
}
