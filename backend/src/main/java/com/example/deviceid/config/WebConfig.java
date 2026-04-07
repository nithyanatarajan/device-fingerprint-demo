package com.example.deviceid.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Web configuration including CORS settings.
 *
 * <p>Allowed origins:
 *
 * <ul>
 *   <li>{@code http://localhost:*} — local frontend dev server on any port
 *   <li>{@code https://*.ngrok-free.app}, {@code https://*.ngrok-free.dev}, {@code
 *       https://*.ngrok.app}, {@code https://*.ngrok.dev}, {@code https://*.ngrok.io} — public
 *       ngrok tunnels used by the {@code npm run demo} workflow. ngrok rotates between several root
 *       domains for free-tier subdomains, so all of them are allowed.
 * </ul>
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

  @Override
  public void addCorsMappings(CorsRegistry registry) {
    registry
        .addMapping("/api/**")
        .allowedOriginPatterns(
            "http://localhost:*",
            "https://*.ngrok-free.app",
            "https://*.ngrok-free.dev",
            "https://*.ngrok.app",
            "https://*.ngrok.dev",
            "https://*.ngrok.io")
        .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS");
  }
}
