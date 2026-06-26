package com.safevalidator.admin.security;

import com.safevalidator.admin.security.jwt.JwtUtil;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Service
public class TokenBlacklistService {

    private static final String KEY_PREFIX = "jwt:blacklist:";

    private final StringRedisTemplate redisTemplate;
    private final JwtUtil jwtUtil;

    public TokenBlacklistService(StringRedisTemplate redisTemplate, JwtUtil jwtUtil) {
        this.redisTemplate = redisTemplate;
        this.jwtUtil = jwtUtil;
    }

    public void blacklist(String token) {
        String jti = jwtUtil.getJti(token);
        long ttl = jwtUtil.getTtlSeconds(token);
        if (ttl > 0) {
            redisTemplate.opsForValue().set(KEY_PREFIX + jti, "1", Duration.ofSeconds(ttl));
        }
    }

    public boolean isBlacklisted(String token) {
        String jti = jwtUtil.getJti(token);
        return Boolean.TRUE.equals(redisTemplate.hasKey(KEY_PREFIX + jti));
    }
}
