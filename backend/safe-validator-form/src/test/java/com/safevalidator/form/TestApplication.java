package com.safevalidator.form;

import org.flywaydb.core.Flyway;
import org.mybatis.spring.annotation.MapperScan;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.flyway.FlywayAutoConfiguration;
import org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration;
import org.springframework.context.event.ContextRefreshedEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.EnableAsync;

import javax.sql.DataSource;

/**
 * Test-only Spring Boot entry point. Excludes security and Flyway autoconfiguration;
 * runs migrations manually from src/test/resources/db/migration via a
 * ContextRefreshedEvent listener so the schema is in place before any test executes.
 */
@SpringBootApplication(
        scanBasePackages = "com.safevalidator",
        exclude = { SecurityAutoConfiguration.class, FlywayAutoConfiguration.class }
)
@EnableAsync
@MapperScan(basePackages = "com.safevalidator.**.mapper")
public class TestApplication {

    private static final Logger log = LoggerFactory.getLogger(TestApplication.class);

    private final DataSource dataSource;

    public TestApplication(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @EventListener(ContextRefreshedEvent.class)
    public void onContextRefreshed(ContextRefreshedEvent ev) {
        Flyway flyway = Flyway.configure()
                .dataSource(dataSource)
                .locations("classpath:db/migration")
                .baselineOnMigrate(true)
                .load();
        var result = flyway.migrate();
        log.info("Flyway: applied {} migrations (success={})",
                result.migrationsExecuted, result.success);
    }
}