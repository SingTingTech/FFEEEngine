package com.safevalidator.start;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication(scanBasePackages = "com.safevalidator")
@EnableAsync
@MapperScan(basePackages = "com.safevalidator.**.mapper")
public class SafeValidatorApplication {

    public static void main(String[] args) {
        SpringApplication.run(SafeValidatorApplication.class, args);
    }
}
