package com.safevalidator.admin.security.jwt;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.Map;
import java.util.UUID;

@Component
public class JwtUtil {

    public static final String CLAIM_TYPE = "type";
    public static final String CLAIM_USERNAME = "username";
    public static final String TYPE_ACCESS = "access";
    public static final String TYPE_REFRESH = "refresh";

    private final JwtProperties props;
    private SecretKey key;

    public JwtUtil(JwtProperties props) {
        this.props = props;
    }

    private SecretKey key() {
        if (key == null) {
            byte[] bytes = props.getSecret().getBytes(StandardCharsets.UTF_8);
            if (bytes.length < 32) {
                throw new IllegalStateException("jwt.secret must be at least 256 bits (32 bytes).");
            }
            key = Keys.hmacShaKeyFor(bytes);
        }
        return key;
    }

    public String generateAccess(Long userId, String username, Map<String, Object> extraClaims) {
        return generate(userId, username, TYPE_ACCESS, props.getAccessTokenTtlSeconds(), extraClaims);
    }

    public String generateRefresh(Long userId, String username) {
        return generate(userId, username, TYPE_REFRESH, props.getRefreshTokenTtlSeconds(), Map.of());
    }

    private String generate(Long userId, String username, String type, long ttlSeconds, Map<String, Object> extraClaims) {
        Instant now = Instant.now();
        return Jwts.builder()
                .id(UUID.randomUUID().toString())
                .issuer(props.getIssuer())
                .subject(String.valueOf(userId))
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(ttlSeconds)))
                .claims(Map.of(
                        CLAIM_TYPE, type,
                        CLAIM_USERNAME, username,
                        "uid", userId
                ))
                .claims().add(extraClaims).and()
                .signWith(key())
                .compact();
    }

    public Claims parse(String token) {
        Jws<Claims> jws = Jwts.parser()
                .verifyWith(key())
                .requireIssuer(props.getIssuer())
                .build()
                .parseSignedClaims(token);
        return jws.getPayload();
    }

    public String getJti(String token) { return parse(token).getId(); }
    public Long getUserId(String token) { return parse(token).get("uid", Long.class); }
    public String getUsername(String token) { return parse(token).get(CLAIM_USERNAME, String.class); }
    public String getType(String token) { return parse(token).get(CLAIM_TYPE, String.class); }

    public long getTtlSeconds(String token) {
        Date exp = parse(token).getExpiration();
        long remaining = (exp.getTime() - System.currentTimeMillis()) / 1000;
        return Math.max(0, remaining);
    }
}
