# Part 3: Security & Admin APIs

**Phase:** 3 of 7
**Tasks:** 3.1 – 3.16
**End state:** Backend boots, `POST /auth/login` returns JWT, user CRUD + role CRUD + audit logging all work via REST.

**Pre-requisite:** Phase 2 complete.

---

## Task 3.1: JwtProperties + JwtUtil

**Files:**
- Create: `backend/safe-validator-admin/src/main/java/com/safevalidator/admin/security/jwt/JwtProperties.java`
- Create: `backend/safe-validator-admin/src/main/java/com/safevalidator/admin/security/jwt/JwtUtil.java`
- Create: `backend/safe-validator-admin/src/main/java/com/safevalidator/admin/config/AdminConfig.java`

- [ ] **Step 1: Create JWT package directories**

```bash
mkdir -p /home/cris/dev/safeValidator/backend/safe-validator-admin/src/main/java/com/safevalidator/admin/security/jwt
mkdir -p /home/cris/dev/safeValidator/backend/safe-validator-admin/src/main/java/com/safevalidator/admin/config
```

- [ ] **Step 2: Create JwtProperties**

```java
package com.safevalidator.admin.security.jwt;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Data
@ConfigurationProperties(prefix = "jwt")
public class JwtProperties {
    private String secret;
    private long accessTokenTtlSeconds;
    private long refreshTokenTtlSeconds;
    private String issuer;
}
```

- [ ] **Step 3: Create JwtUtil**

```java
package com.safevalidator.admin.security.jwt;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.Map;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class JwtUtil {

    public static final String CLAIM_TYPE = "type";
    public static final String CLAIM_USERNAME = "username";
    public static final String TYPE_ACCESS = "access";
    public static final String TYPE_REFRESH = "refresh";

    private final JwtProperties props;
    private SecretKey key;

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

    public String getJti(String token) {
        return parse(token).getId();
    }

    public Long getUserId(String token) {
        return parse(token).get("uid", Long.class);
    }

    public String getUsername(String token) {
        return parse(token).get(CLAIM_USERNAME, String.class);
    }

    public String getType(String token) {
        return parse(token).get(CLAIM_TYPE, String.class);
    }

    public long getTtlSeconds(String token) {
        Date exp = parse(token).getExpiration();
        long remaining = (exp.getTime() - System.currentTimeMillis()) / 1000;
        return Math.max(0, remaining);
    }
}
```

- [ ] **Step 4: Create AdminConfig to enable @ConfigurationProperties**

```java
package com.safevalidator.admin.config;

import com.safevalidator.admin.security.jwt.JwtProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(JwtProperties.class)
public class AdminConfig {
}
```

- [ ] **Step 5: Verify compile + commit**

```bash
cd /home/cris/dev/safeValidator/backend
mvn -pl safe-validator-admin compile
cd backend
git add safe-validator-admin
git commit -m "feat(admin): add JwtProperties and JwtUtil"
```

---

## Task 3.2: RedisConfig

**Files:**
- Create: `backend/safe-validator-common/src/main/java/com/safevalidator/common/config/CommonRedisConfig.java`

- [ ] **Step 1: Create config package**

```bash
mkdir -p /home/cris/dev/safeValidator/backend/safe-validator-common/src/main/java/com/safevalidator/common/config
```

- [ ] **Step 2: Create CommonRedisConfig**

```java
package com.safevalidator.common.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.StringRedisSerializer;

@Configuration
public class CommonRedisConfig {

    @Bean
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory factory, ObjectMapper objectMapper) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(factory);

        StringRedisSerializer keySer = new StringRedisSerializer();
        GenericJackson2JsonRedisSerializer valSer = new GenericJackson2JsonRedisSerializer(objectMapper);

        template.setKeySerializer(keySer);
        template.setHashKeySerializer(keySer);
        template.setValueSerializer(valSer);
        template.setHashValueSerializer(valSer);
        template.afterPropertiesSet();
        return template;
    }
}
```

- [ ] **Step 3: Verify compile + commit**

```bash
cd /home/cris/dev/safeValidator/backend
mvn -pl safe-validator-common compile
cd backend
git add safe-validator-common
git commit -m "feat(common): add CommonRedisConfig with Jackson JSON serialization"
```

---

## Task 3.3: SecurityUtils

**Files:**
- Create: `backend/safe-validator-common/src/main/java/com/safevalidator/common/security/SecurityUtils.java`

- [ ] **Step 1: Create security package**

```bash
mkdir -p /home/cris/dev/safeValidator/backend/safe-validator-common/src/main/java/com/safevalidator/common/security
```

- [ ] **Step 2: Create SecurityUtils**

```java
package com.safevalidator.common.security;

import com.safevalidator.common.exception.BizException;
import com.safevalidator.common.api.ErrorCode;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public final class SecurityUtils {

    private SecurityUtils() {}

    public static Long currentUserId() {
        return currentUserIdOrNull()
                .orElseThrow(() -> new BizException(ErrorCode.UNAUTHORIZED));
    }

    public static java.util.Optional<Long> currentUserIdOrNull() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return java.util.Optional.empty();
        }
        Object principal = auth.getPrincipal();
        if (principal instanceof AuthenticatedUser u) {
            return java.util.Optional.ofNullable(u.userId());
        }
        return java.util.Optional.empty();
    }

    public record AuthenticatedUser(Long userId, String username) {}
}
```

- [ ] **Step 3: Verify compile + commit**

```bash
cd /home/cris/dev/safeValidator/backend
mvn -pl safe-validator-common compile
cd backend
git add safe-validator-common
git commit -m "feat(common): add SecurityUtils to access current authenticated user"
```

---

## Task 3.4: JwtAuthenticationFilter

**Files:**
- Create: `backend/safe-validator-admin/src/main/java/com/safevalidator/admin/security/JwtAuthenticationFilter.java`

- [ ] **Step 1: Create JwtAuthenticationFilter**

```java
package com.safevalidator.admin.security;

import com.safevalidator.admin.security.jwt.JwtUtil;
import com.safevalidator.common.security.SecurityUtils.AuthenticatedUser;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String AUTH_HEADER = "Authorization";
    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtUtil jwtUtil;
    private final StringRedisTemplate redisTemplate;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {

        String header = request.getHeader(AUTH_HEADER);
        if (!StringUtils.hasText(header) || !header.startsWith(BEARER_PREFIX)) {
            chain.doFilter(request, response);
            return;
        }

        String token = header.substring(BEARER_PREFIX.length());

        try {
            String jti = jwtUtil.getJti(token);
            if (Boolean.TRUE.equals(redisTemplate.hasKey("jwt:blacklist:" + jti))) {
                log.debug("Blacklisted token: {}", jti);
                chain.doFilter(request, response);
                return;
            }

            Claims claims = jwtUtil.parse(token);
            if (!JwtUtil.TYPE_ACCESS.equals(claims.get(JwtUtil.CLAIM_TYPE))) {
                chain.doFilter(request, response);
                return;
            }

            Long userId = claims.get("uid", Long.class);
            String username = claims.get(JwtUtil.CLAIM_USERNAME, String.class);

            AuthenticatedUser principal = new AuthenticatedUser(userId, username);

            UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                    principal,
                    null,
                    List.of(new SimpleGrantedAuthority("ROLE_USER"))
            );
            auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
            SecurityContextHolder.getContext().setAuthentication(auth);
        } catch (JwtException ex) {
            log.debug("Invalid JWT: {}", ex.getMessage());
            SecurityContextHolder.clearContext();
        }

        chain.doFilter(request, response);
    }
}
```

- [ ] **Step 2: Verify compile + commit**

```bash
cd /home/cris/dev/safeValidator/backend
mvn -pl safe-validator-admin compile
cd backend
git add safe-validator-admin
git commit -m "feat(admin): add JwtAuthenticationFilter with blacklist check"
```

---

## Task 3.5: TokenBlacklistService

**Files:**
- Create: `backend/safe-validator-admin/src/main/java/com/safevalidator/admin/security/TokenBlacklistService.java`

- [ ] **Step 1: Create service**

```java
package com.safevalidator.admin.security;

import com.safevalidator.admin.security.jwt.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Service
@RequiredArgsConstructor
public class TokenBlacklistService {

    private static final String KEY_PREFIX = "jwt:blacklist:";

    private final StringRedisTemplate redisTemplate;
    private final JwtUtil jwtUtil;

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
```

- [ ] **Step 2: Verify compile + commit**

```bash
cd /home/cris/dev/safeValidator/backend
mvn -pl safe-validator-admin compile
cd backend
git add safe-validator-admin
git commit -m "feat(admin): add TokenBlacklistService using Redis"
```

---

## Task 3.6: SecurityConfig

**Files:**
- Create: `backend/safe-validator-admin/src/main/java/com/safevalidator/admin/security/SecurityConfig.java`

- [ ] **Step 1: Create SecurityConfig**

```java
package com.safevalidator.admin.security;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(c -> c.configurationSource(corsConfigurationSource()))
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers(
                    "/auth/login",
                    "/auth/refresh",
                    "/v3/api-docs/**",
                    "/swagger-ui/**",
                    "/swagger-ui.html",
                    "/actuator/health",
                    "/error"
                ).permitAll()
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration cfg = new CorsConfiguration();
        cfg.setAllowedOriginPatterns(List.of(
            "http://localhost:5173",
            "http://localhost:5174",
            "http://127.0.0.1:*"
        ));
        cfg.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        cfg.setAllowedHeaders(List.of("*"));
        cfg.setExposedHeaders(List.of("Authorization", "X-Total-Count"));
        cfg.setAllowCredentials(true);
        cfg.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", cfg);
        return source;
    }
}
```

- [ ] **Step 2: Verify compile + commit**

```bash
cd /home/cris/dev/safeValidator/backend
mvn -pl safe-validator-admin compile
cd backend
git add safe-validator-admin
git commit -m "feat(admin): add SecurityConfig with JWT filter and CORS"
```

---

## Task 3.7: SysUser entity + mapper

**Files:**
- Create: `backend/safe-validator-admin/src/main/java/com/safevalidator/admin/entity/SysUser.java`
- Create: `backend/safe-validator-admin/src/main/java/com/safevalidator/admin/mapper/SysUserMapper.java`

- [ ] **Step 1: Create directories**

```bash
mkdir -p /home/cris/dev/safeValidator/backend/safe-validator-admin/src/main/java/com/safevalidator/admin/entity
mkdir -p /home/cris/dev/safeValidator/backend/safe-validator-admin/src/main/java/com/safevalidator/admin/mapper
```

- [ ] **Step 2: Create SysUser entity**

```java
package com.safevalidator.admin.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.safevalidator.common.entity.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("sys_user")
public class SysUser extends BaseEntity {

    @TableId(type = IdType.ASSIGN_ID)
    private Long id;

    private String username;
    private String password;
    private String realName;
    private String email;
    private String phone;
    private Integer status;
    private LocalDateTime lastLoginAt;
}
```

- [ ] **Step 3: Create SysUserMapper**

```java
package com.safevalidator.admin.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.safevalidator.admin.entity.SysUser;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface SysUserMapper extends BaseMapper<SysUser> {
}
```

- [ ] **Step 4: Verify compile + commit**

```bash
cd /home/cris/dev/safeValidator/backend
mvn -pl safe-validator-admin compile
cd backend
git add safe-validator-admin
git commit -m "feat(admin): add SysUser entity and mapper"
```

---

## Task 3.8: SysRole + SysPermission entities and mappers

**Files:**
- Create: `backend/safe-validator-admin/src/main/java/com/safevalidator/admin/entity/SysRole.java`
- Create: `backend/safe-validator-admin/src/main/java/com/safevalidator/admin/entity/SysPermission.java`
- Create: `backend/safe-validator-admin/src/main/java/com/safevalidator/admin/mapper/SysRoleMapper.java`
- Create: `backend/safe-validator-admin/src/main/java/com/safevalidator/admin/mapper/SysPermissionMapper.java`
- Create: `backend/safe-validator-admin/src/main/java/com/safevalidator/admin/mapper/SysUserRoleMapper.java`
- Create: `backend/safe-validator-admin/src/main/java/com/safevalidator/admin/mapper/SysRolePermissionMapper.java`

- [ ] **Step 1: Create SysRole entity**

```java
package com.safevalidator.admin.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.safevalidator.common.entity.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("sys_role")
public class SysRole extends BaseEntity {
    @TableId(type = IdType.ASSIGN_ID)
    private Long id;
    private String code;
    private String name;
    private String description;
    private Integer status;
}
```

- [ ] **Step 2: Create SysPermission entity**

```java
package com.safevalidator.admin.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.safevalidator.common.entity.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("sys_permission")
public class SysPermission extends BaseEntity {
    @TableId(type = IdType.ASSIGN_ID)
    private Long id;
    private Long parentId;
    private String code;
    private String name;
    private String type;
    private String path;
    private String icon;
    private Integer sortOrder;
}
```

- [ ] **Step 3: Create SysRoleMapper + SysPermissionMapper + SysUserRoleMapper + SysRolePermissionMapper**

```java
// SysRoleMapper.java
package com.safevalidator.admin.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.safevalidator.admin.entity.SysRole;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface SysRoleMapper extends BaseMapper<SysRole> {
}
```

```java
// SysPermissionMapper.java
package com.safevalidator.admin.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.safevalidator.admin.entity.SysPermission;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface SysPermissionMapper extends BaseMapper<SysPermission> {
}
```

```java
// SysUserRoleMapper.java
package com.safevalidator.admin.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface SysUserRoleMapper {
    int insert(@Param("userId") Long userId, @Param("roleId") Long roleId);
    int deleteByUserId(@Param("userId") Long userId);
}
```

Create `backend/safe-validator-admin/src/main/resources/mapper/SysUserRoleMapper.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN" "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="com.safevalidator.admin.mapper.SysUserRoleMapper">

    <insert id="insert">
        INSERT INTO sys_user_role (user_id, role_id) VALUES (#{userId}, #{roleId})
    </insert>

    <delete id="deleteByUserId">
        DELETE FROM sys_user_role WHERE user_id = #{userId}
    </delete>

</mapper>
```

```java
// SysRolePermissionMapper.java
package com.safevalidator.admin.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface SysRolePermissionMapper {
    int insert(@Param("roleId") Long roleId, @Param("permissionId") Long permissionId);
    int deleteByRoleId(@Param("roleId") Long roleId);
}
```

Create `backend/safe-validator-admin/src/main/resources/mapper/SysRolePermissionMapper.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN" "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="com.safevalidator.admin.mapper.SysRolePermissionMapper">

    <insert id="insert">
        INSERT INTO sys_role_permission (role_id, permission_id) VALUES (#{roleId}, #{permissionId})
    </insert>

    <delete id="deleteByRoleId">
        DELETE FROM sys_role_permission WHERE role_id = #{roleId}
    </delete>

</mapper>
```

- [ ] **Step 4: Verify compile + commit**

```bash
cd /home/cris/dev/safeValidator/backend
mvn -pl safe-validator-admin compile
cd backend
git add safe-validator-admin
git commit -m "feat(admin): add SysRole, SysPermission entities and association mappers"
```

---

## Task 3.9: MyBatis-Plus MetaObjectHandler

**Files:**
- Create: `backend/safe-validator-common/src/main/java/com/safevalidator/common/mybatis/MybatisAutoFillHandler.java`

- [ ] **Step 1: Create mybatis package**

```bash
mkdir -p /home/cris/dev/safeValidator/backend/safe-validator-common/src/main/java/com/safevalidator/common/mybatis
```

- [ ] **Step 2: Create MetaObjectHandler**

```java
package com.safevalidator.common.mybatis;

import com.baomidou.mybatisplus.core.handlers.MetaObjectHandler;
import com.safevalidator.common.security.SecurityUtils;
import org.apache.ibatis.reflection.MetaObject;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
public class MybatisAutoFillHandler implements MetaObjectHandler {

    @Override
    public void insertFill(MetaObject metaObject) {
        LocalDateTime now = LocalDateTime.now();
        Long uid = SecurityUtils.currentUserIdOrNull().orElse(0L);

        strictInsertFill(metaObject, "createTime", LocalDateTime.class, now);
        strictInsertFill(metaObject, "updateTime", LocalDateTime.class, now);
        strictInsertFill(metaObject, "createBy", Long.class, uid);
        strictInsertFill(metaObject, "updateBy", Long.class, uid);
        strictInsertFill(metaObject, "deleted", Integer.class, 0);
    }

    @Override
    public void updateFill(MetaObject metaObject) {
        Long uid = SecurityUtils.currentUserIdOrNull().orElse(0L);

        strictUpdateFill(metaObject, "updateTime", LocalDateTime.class, LocalDateTime.now());
        strictUpdateFill(metaObject, "updateBy", Long.class, uid);
    }
}
```

- [ ] **Step 3: Verify compile + commit**

```bash
cd /home/cris/dev/safeValidator/backend
mvn -pl safe-validator-common compile
cd backend
git add safe-validator-common
git commit -m "feat(common): add MybatisAutoFillHandler for audit fields"
```

---

## Task 3.10: AuthService + DTOs

**Files:**
- Create: `backend/safe-validator-admin/src/main/java/com/safevalidator/admin/dto/LoginRequest.java`
- Create: `backend/safe-validator-admin/src/main/java/com/safevalidator/admin/dto/LoginResponse.java`
- Create: `backend/safe-validator-admin/src/main/java/com/safevalidator/admin/dto/RefreshRequest.java`
- Create: `backend/safe-validator-admin/src/main/java/com/safevalidator/admin/service/AuthService.java`
- Create: `backend/safe-validator-admin/src/main/java/com/safevalidator/admin/controller/AuthController.java`

- [ ] **Step 1: Create packages**

```bash
mkdir -p /home/cris/dev/safeValidator/backend/safe-validator-admin/src/main/java/com/safevalidator/admin/dto
mkdir -p /home/cris/dev/safeValidator/backend/safe-validator-admin/src/main/java/com/safevalidator/admin/service
mkdir -p /home/cris/dev/safeValidator/backend/safe-validator-admin/src/main/java/com/safevalidator/admin/controller
```

- [ ] **Step 2: Create DTOs**

```java
// LoginRequest.java
package com.safevalidator.admin.dto;

import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        @NotBlank String username,
        @NotBlank String password
) {}
```

```java
// LoginResponse.java
package com.safevalidator.admin.dto;

public record LoginResponse(
        String accessToken,
        String refreshToken,
        long expiresIn,
        UserInfo user
) {
    public record UserInfo(Long id, String username, String realName, java.util.List<String> roles) {}
}
```

```java
// RefreshRequest.java
package com.safevalidator.admin.dto;

import jakarta.validation.constraints.NotBlank;

public record RefreshRequest(@NotBlank String refreshToken) {}
```

- [ ] **Step 3: Create AuthService**

```java
package com.safevalidator.admin.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.safevalidator.admin.dto.LoginRequest;
import com.safevalidator.admin.dto.LoginResponse;
import com.safevalidator.admin.dto.LoginResponse.UserInfo;
import com.safevalidator.admin.dto.RefreshRequest;
import com.safevalidator.admin.entity.SysPermission;
import com.safevalidator.admin.entity.SysRole;
import com.safevalidator.admin.entity.SysUser;
import com.safevalidator.admin.mapper.SysPermissionMapper;
import com.safevalidator.admin.mapper.SysRoleMapper;
import com.safevalidator.admin.mapper.SysUserMapper;
import com.safevalidator.admin.security.TokenBlacklistService;
import com.safevalidator.admin.security.jwt.JwtProperties;
import com.safevalidator.admin.security.jwt.JwtUtil;
import com.safevalidator.common.api.ErrorCode;
import com.safevalidator.common.exception.BizException;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final SysUserMapper userMapper;
    private final SysRoleMapper roleMapper;
    private final SysPermissionMapper permissionMapper;
    private final JwtUtil jwtUtil;
    private final JwtProperties jwtProps;
    private final PasswordEncoder passwordEncoder;
    private final TokenBlacklistService blacklistService;

    @Transactional
    public LoginResponse login(LoginRequest req) {
        SysUser user = userMapper.selectOne(
                new LambdaQueryWrapper<SysUser>().eq(SysUser::getUsername, req.username())
        );
        if (user == null) {
            throw new BizException(ErrorCode.USER_PASSWORD_INVALID);
        }
        if (!passwordEncoder.matches(req.password(), user.getPassword())) {
            throw new BizException(ErrorCode.USER_PASSWORD_INVALID);
        }
        if (user.getStatus() != null && user.getStatus() == 0) {
            throw new BizException(ErrorCode.USER_DISABLED);
        }

        List<SysRole> roles = queryUserRoles(user.getId());

        List<String> permissions = queryUserPermissions(user.getId());

        String access = jwtUtil.generateAccess(user.getId(), user.getUsername(),
                java.util.Map.of("perms", permissions));
        String refresh = jwtUtil.generateRefresh(user.getId(), user.getUsername());

        user.setLastLoginAt(LocalDateTime.now());
        userMapper.updateById(user);

        List<String> roleCodes = roles.stream().map(SysRole::getCode).toList();
        return new LoginResponse(
                access,
                refresh,
                jwtProps.getAccessTokenTtlSeconds(),
                new UserInfo(user.getId(), user.getUsername(), user.getRealName(), roleCodes)
        );
    }

    public LoginResponse refresh(RefreshRequest req) {
        Claims claims;
        try {
            claims = jwtUtil.parse(req.refreshToken());
        } catch (JwtException ex) {
            throw new BizException(ErrorCode.TOKEN_INVALID);
        }
        if (!JwtUtil.TYPE_REFRESH.equals(claims.get(JwtUtil.CLAIM_TYPE))) {
            throw new BizException(ErrorCode.TOKEN_INVALID);
        }

        Long userId = claims.get("uid", Long.class);
        SysUser user = userMapper.selectById(userId);
        if (user == null || user.getStatus() == 0) {
            throw new BizException(ErrorCode.USER_NOT_FOUND);
        }

        List<String> permissions = queryUserPermissions(userId);
        List<String> roleCodes = queryUserRoles(userId).stream().map(SysRole::getCode).toList();

        String access = jwtUtil.generateAccess(user.getId(), user.getUsername(),
                java.util.Map.of("perms", permissions));

        return new LoginResponse(
                access,
                req.refreshToken(),
                jwtProps.getAccessTokenTtlSeconds(),
                new UserInfo(user.getId(), user.getUsername(), user.getRealName(), roleCodes)
        );
    }

    public void logout(String accessToken) {
        if (accessToken != null && !accessToken.isBlank()) {
            blacklistService.blacklist(accessToken);
        }
    }

    private List<SysRole> queryUserRoles(Long userId) {
        return roleMapper.queryRolesByUserId(userId);
    }

    private List<String> queryUserPermissions(Long userId) {
        return permissionMapper.queryPermissionsByUserId(userId).stream()
                .map(SysPermission::getCode)
                .toList();
    }
}
```

**Note:** `queryRolesByUserId` and `queryPermissionsByUserId` are added below.

- [ ] **Step 4: Add role/permission query methods to mappers**

Modify `SysRoleMapper.java` to add:

```java
package com.safevalidator.admin.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.safevalidator.admin.entity.SysRole;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface SysRoleMapper extends BaseMapper<SysRole> {
    List<SysRole> queryRolesByUserId(@Param("userId") Long userId);
}
```

Create `backend/safe-validator-admin/src/main/resources/mapper/SysRoleMapper.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN" "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="com.safevalidator.admin.mapper.SysRoleMapper">

    <resultMap id="roleMap" type="com.safevalidator.admin.entity.SysRole">
        <id property="id" column="id"/>
        <result property="code" column="code"/>
        <result property="name" column="name"/>
        <result property="description" column="description"/>
        <result property="status" column="status"/>
    </resultMap>

    <select id="queryRolesByUserId" resultMap="roleMap">
        SELECT r.id, r.code, r.name, r.description, r.status
        FROM sys_role r
        INNER JOIN sys_user_role ur ON ur.role_id = r.id
        WHERE ur.user_id = #{userId} AND r.deleted = 0
    </select>

</mapper>
```

Modify `SysPermissionMapper.java`:

```java
package com.safevalidator.admin.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.safevalidator.admin.entity.SysPermission;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface SysPermissionMapper extends BaseMapper<SysPermission> {
    List<SysPermission> queryPermissionsByUserId(@Param("userId") Long userId);
}
```

Create `backend/safe-validator-admin/src/main/resources/mapper/SysPermissionMapper.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN" "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="com.safevalidator.admin.mapper.SysPermissionMapper">

    <select id="queryPermissionsByUserId" resultType="com.safevalidator.admin.entity.SysPermission">
        SELECT DISTINCT p.id, p.parent_id, p.code, p.name, p.type, p.path, p.icon, p.sort_order
        FROM sys_permission p
        INNER JOIN sys_role_permission rp ON rp.permission_id = p.id
        INNER JOIN sys_user_role ur ON ur.role_id = rp.role_id
        WHERE ur.user_id = #{userId} AND p.deleted = 0
        ORDER BY p.sort_order
    </select>

</mapper>
```

- [ ] **Step 5: Create AuthController**

```java
package com.safevalidator.admin.controller;

import com.safevalidator.admin.dto.LoginRequest;
import com.safevalidator.admin.dto.LoginResponse;
import com.safevalidator.admin.dto.RefreshRequest;
import com.safevalidator.admin.service.AuthService;
import com.safevalidator.common.api.Result;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public Result<LoginResponse> login(@Valid @RequestBody LoginRequest req) {
        return Result.ok(authService.login(req));
    }

    @PostMapping("/refresh")
    public Result<LoginResponse> refresh(@Valid @RequestBody RefreshRequest req) {
        return Result.ok(authService.refresh(req));
    }

    @PostMapping("/logout")
    public Result<Void> logout(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        String token = (header != null && header.startsWith("Bearer ")) ? header.substring(7) : null;
        authService.logout(token);
        return Result.ok();
    }
}
```

- [ ] **Step 6: Verify compile + commit**

```bash
cd /home/cris/dev/safeValidator/backend
mvn -pl safe-validator-admin compile
cd backend
git add safe-validator-admin
git commit -m "feat(admin): add AuthService and AuthController with JWT login/logout/refresh"
```

---

## Task 3.11: UserService + UserController

**Files:**
- Create: `backend/safe-validator-admin/src/main/java/com/safevalidator/admin/dto/UserCreateRequest.java`
- Create: `backend/safe-validator-admin/src/main/java/com/safevalidator/admin/dto/UserUpdateRequest.java`
- Create: `backend/safe-validator-admin/src/main/java/com/safevalidator/admin/dto/UserVO.java`
- Create: `backend/safe-validator-admin/src/main/java/com/safevalidator/admin/service/UserService.java`
- Create: `backend/safe-validator-admin/src/main/java/com/safevalidator/admin/controller/UserController.java`

- [ ] **Step 1: Create DTOs**

```java
// UserCreateRequest.java
package com.safevalidator.admin.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

public record UserCreateRequest(
        @NotBlank @Size(min = 3, max = 64) String username,
        @NotBlank @Size(min = 6, max = 64) String password,
        String realName,
        @Email String email,
        String phone,
        Integer status,
        List<Long> roleIds
) {}
```

```java
// UserUpdateRequest.java
package com.safevalidator.admin.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

import java.util.List;

public record UserUpdateRequest(
        @Size(min = 3, max = 64) String username,
        String password,           // optional: if present, reset password
        String realName,
        @Email String email,
        String phone,
        Integer status,
        List<Long> roleIds
) {}
```

```java
// UserVO.java
package com.safevalidator.admin.dto;

import java.time.LocalDateTime;
import java.util.List;

public record UserVO(
        Long id,
        String username,
        String realName,
        String email,
        String phone,
        Integer status,
        LocalDateTime lastLoginAt,
        LocalDateTime createTime,
        List<String> roles
) {}
```

- [ ] **Step 2: Create UserService**

```java
package com.safevalidator.admin.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.safevalidator.admin.dto.UserCreateRequest;
import com.safevalidator.admin.dto.UserUpdateRequest;
import com.safevalidator.admin.dto.UserVO;
import com.safevalidator.admin.entity.SysRole;
import com.safevalidator.admin.entity.SysUser;
import com.safevalidator.admin.mapper.SysRoleMapper;
import com.safevalidator.admin.mapper.SysUserMapper;
import com.safevalidator.admin.mapper.SysUserRoleMapper;
import com.safevalidator.common.api.ErrorCode;
import com.safevalidator.common.api.PageQuery;
import com.safevalidator.common.api.PageResult;
import com.safevalidator.common.exception.BizException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {

    private final SysUserMapper userMapper;
    private final SysRoleMapper roleMapper;
    private final SysUserRoleMapper userRoleMapper;
    private final PasswordEncoder passwordEncoder;

    public PageResult<UserVO> page(PageQuery query) {
        IPage<SysUser> page = new Page<>(query.pageNum(), query.pageSize());
        LambdaQueryWrapper<SysUser> wrapper = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(query.keyword())) {
            wrapper.like(SysUser::getUsername, query.keyword())
                    .or().like(SysUser::getRealName, query.keyword());
        }
        wrapper.orderByDesc(SysUser::getCreateTime);
        IPage<SysUser> result = userMapper.selectPage(page, wrapper);

        List<UserVO> vos = result.getRecords().stream().map(this::toVO).toList();
        return PageResult.of(vos, result.getTotal(), query.pageNum(), query.pageSize());
    }

    public UserVO getById(Long id) {
        SysUser user = userMapper.selectById(id);
        if (user == null) throw new BizException(ErrorCode.USER_NOT_FOUND);
        return toVO(user);
    }

    @Transactional
    public Long create(UserCreateRequest req) {
        Long existing = userMapper.selectCount(
                new LambdaQueryWrapper<SysUser>().eq(SysUser::getUsername, req.username())
        );
        if (existing > 0) throw new BizException(ErrorCode.USERNAME_DUPLICATE);

        SysUser user = new SysUser();
        user.setUsername(req.username());
        user.setPassword(passwordEncoder.encode(req.password()));
        user.setRealName(req.realName());
        user.setEmail(req.email());
        user.setPhone(req.phone());
        user.setStatus(req.status() == null ? 1 : req.status());
        userMapper.insert(user);

        if (req.roleIds() != null && !req.roleIds().isEmpty()) {
            for (Long roleId : req.roleIds()) {
                userRoleMapper.insert(user.getId(), roleId);
            }
        }
        return user.getId();
    }

    @Transactional
    public void update(Long id, UserUpdateRequest req) {
        SysUser user = userMapper.selectById(id);
        if (user == null) throw new BizException(ErrorCode.USER_NOT_FOUND);

        if (StringUtils.hasText(req.password())) {
            user.setPassword(passwordEncoder.encode(req.password()));
        }
        if (StringUtils.hasText(req.username())) user.setUsername(req.username());
        if (req.realName() != null) user.setRealName(req.realName());
        if (req.email() != null) user.setEmail(req.email());
        if (req.phone() != null) user.setPhone(req.phone());
        if (req.status() != null) user.setStatus(req.status());
        userMapper.updateById(user);

        if (req.roleIds() != null) {
            userRoleMapper.deleteByUserId(id);
            for (Long roleId : req.roleIds()) {
                userRoleMapper.insert(id, roleId);
            }
        }
    }

    @Transactional
    public void delete(Long id) {
        SysUser user = userMapper.selectById(id);
        if (user == null) throw new BizException(ErrorCode.USER_NOT_FOUND);
        userMapper.deleteById(id);
        userRoleMapper.deleteByUserId(id);
    }

    private UserVO toVO(SysUser user) {
        List<SysRole> roles = roleMapper.queryRolesByUserId(user.getId());
        List<String> roleNames = roles == null ? Collections.emptyList()
                : roles.stream().map(SysRole::getName).toList();
        return new UserVO(
                user.getId(),
                user.getUsername(),
                user.getRealName(),
                user.getEmail(),
                user.getPhone(),
                user.getStatus(),
                user.getLastLoginAt(),
                user.getCreateTime(),
                roleNames
        );
    }
}
```

- [ ] **Step 3: Create UserController**

```java
package com.safevalidator.admin.controller;

import com.safevalidator.admin.dto.UserCreateRequest;
import com.safevalidator.admin.dto.UserUpdateRequest;
import com.safevalidator.admin.dto.UserVO;
import com.safevalidator.admin.service.UserService;
import com.safevalidator.common.api.PageQuery;
import com.safevalidator.common.api.PageResult;
import com.safevalidator.common.api.Result;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/admin/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping
    @PreAuthorize("hasAuthority('system:user:list')")
    public Result<PageResult<UserVO>> page(PageQuery query) {
        return Result.ok(userService.page(query));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('system:user:list')")
    public Result<UserVO> get(@PathVariable Long id) {
        return Result.ok(userService.getById(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('system:user:create')")
    public Result<Long> create(@Valid @RequestBody UserCreateRequest req) {
        return Result.ok(userService.create(req));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('system:user:update')")
    public Result<Void> update(@PathVariable Long id, @Valid @RequestBody UserUpdateRequest req) {
        userService.update(id, req);
        return Result.ok();
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('system:user:delete')")
    public Result<Void> delete(@PathVariable Long id) {
        userService.delete(id);
        return Result.ok();
    }
}
```

- [ ] **Step 4: Verify compile + commit**

```bash
cd /home/cris/dev/safeValidator/backend
mvn -pl safe-validator-admin compile
cd backend
git add safe-validator-admin
git commit -m "feat(admin): add UserService and UserController with CRUD"
```

---

## Task 3.12: RoleService + RoleController

**Files:**
- Create: `backend/safe-validator-admin/src/main/java/com/safevalidator/admin/dto/RoleRequest.java`
- Create: `backend/safe-validator-admin/src/main/java/com/safevalidator/admin/dto/RoleVO.java`
- Create: `backend/safe-validator-admin/src/main/java/com/safevalidator/admin/service/RoleService.java`
- Create: `backend/safe-validator-admin/src/main/java/com/safevalidator/admin/controller/RoleController.java`

- [ ] **Step 1: Create DTOs**

```java
// RoleRequest.java
package com.safevalidator.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

public record RoleRequest(
        @NotBlank @Size(max = 64) String code,
        @NotBlank @Size(max = 128) String name,
        String description,
        Integer status,
        List<Long> permissionIds
) {}
```

```java
// RoleVO.java
package com.safevalidator.admin.dto;

import java.util.List;

public record RoleVO(
        Long id,
        String code,
        String name,
        String description,
        Integer status,
        List<Long> permissionIds
) {}
```

- [ ] **Step 2: Create RoleService**

```java
package com.safevalidator.admin.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.safevalidator.admin.dto.RoleRequest;
import com.safevalidator.admin.dto.RoleVO;
import com.safevalidator.admin.entity.SysRole;
import com.safevalidator.admin.mapper.SysRoleMapper;
import com.safevalidator.admin.mapper.SysRolePermissionMapper;
import com.safevalidator.common.api.ErrorCode;
import com.safevalidator.common.api.PageQuery;
import com.safevalidator.common.api.PageResult;
import com.safevalidator.common.exception.BizException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RoleService {

    private final SysRoleMapper roleMapper;
    private final SysRolePermissionMapper rolePermissionMapper;

    public PageResult<RoleVO> page(PageQuery query) {
        IPage<SysRole> page = new Page<>(query.pageNum(), query.pageSize());
        LambdaQueryWrapper<SysRole> wrapper = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(query.keyword())) {
            wrapper.like(SysRole::getName, query.keyword())
                    .or().like(SysRole::getCode, query.keyword());
        }
        wrapper.orderByDesc(SysRole::getCreateTime);
        IPage<SysRole> result = roleMapper.selectPage(page, wrapper);

        List<RoleVO> vos = result.getRecords().stream().map(this::toVO).toList();
        return PageResult.of(vos, result.getTotal(), query.pageNum(), query.pageSize());
    }

    public List<RoleVO> listAll() {
        List<SysRole> roles = roleMapper.selectList(
                new LambdaQueryWrapper<SysRole>()
                        .eq(SysRole::getStatus, 1)
                        .orderByAsc(SysRole::getCode)
        );
        return roles.stream().map(this::toVO).toList();
    }

    @Transactional
    public Long create(RoleRequest req) {
        Long existing = roleMapper.selectCount(
                new LambdaQueryWrapper<SysRole>().eq(SysRole::getCode, req.code())
        );
        if (existing > 0) throw new BizException(ErrorCode.ROLE_NAME_DUPLICATE);

        SysRole role = new SysRole();
        role.setCode(req.code());
        role.setName(req.name());
        role.setDescription(req.description());
        role.setStatus(req.status() == null ? 1 : req.status());
        roleMapper.insert(role);

        if (req.permissionIds() != null) {
            for (Long pid : req.permissionIds()) {
                rolePermissionMapper.insert(role.getId(), pid);
            }
        }
        return role.getId();
    }

    @Transactional
    public void update(Long id, RoleRequest req) {
        SysRole role = roleMapper.selectById(id);
        if (role == null) throw new BizException(ErrorCode.ROLE_NOT_FOUND);

        role.setName(req.name());
        role.setDescription(req.description());
        if (req.status() != null) role.setStatus(req.status());
        roleMapper.updateById(role);

        if (req.permissionIds() != null) {
            rolePermissionMapper.deleteByRoleId(id);
            for (Long pid : req.permissionIds()) {
                rolePermissionMapper.insert(id, pid);
            }
        }
    }

    @Transactional
    public void delete(Long id) {
        SysRole role = roleMapper.selectById(id);
        if (role == null) throw new BizException(ErrorCode.ROLE_NOT_FOUND);
        roleMapper.deleteById(id);
        rolePermissionMapper.deleteByRoleId(id);
    }

    private RoleVO toVO(SysRole role) {
        List<Long> permIds = rolePermissionMapper.selectList(new LambdaQueryWrapper<>()).stream()
                .filter(p -> true)
                .map(p -> p.getRoleId())
                .filter(rid -> rid.equals(role.getId()))
                .toList();
        // simple: load all permission IDs for this role via custom query would be better;
        // for now permissionIds empty (UI loads permissions separately for edit dialog)
        return new RoleVO(role.getId(), role.getCode(), role.getName(),
                role.getDescription(), role.getStatus(), List.of());
    }
}
```

**Note:** The `toVO` permissionIds loading is simplified for now; a follow-up task adds `selectPermissionIdsByRoleId` to the mapper if needed. The admin UI loads role→permission assignment via a separate endpoint.

- [ ] **Step 3: Add permission-id query to mapper**

Add to `SysRolePermissionMapper.java`:

```java
List<Long> selectPermissionIdsByRoleId(@Param("roleId") Long roleId);
```

Add to `SysRolePermissionMapper.xml`:

```xml
<select id="selectPermissionIdsByRoleId" resultType="java.lang.Long">
    SELECT permission_id FROM sys_role_permission WHERE role_id = #{roleId}
</select>
```

Then update `RoleService.toVO`:

```java
private RoleVO toVO(SysRole role) {
    List<Long> permIds = rolePermissionMapper.selectPermissionIdsByRoleId(role.getId());
    return new RoleVO(role.getId(), role.getCode(), role.getName(),
            role.getDescription(), role.getStatus(), permIds);
}
```

- [ ] **Step 4: Create RoleController**

```java
package com.safevalidator.admin.controller;

import com.safevalidator.admin.dto.RoleRequest;
import com.safevalidator.admin.dto.RoleVO;
import com.safevalidator.admin.service.RoleService;
import com.safevalidator.common.api.PageQuery;
import com.safevalidator.common.api.PageResult;
import com.safevalidator.common.api.Result;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/admin/roles")
@RequiredArgsConstructor
public class RoleController {

    private final RoleService roleService;

    @GetMapping
    @PreAuthorize("hasAuthority('system:role:list')")
    public Result<PageResult<RoleVO>> page(PageQuery query) {
        return Result.ok(roleService.page(query));
    }

    @GetMapping("/all")
    public Result<List<RoleVO>> listAll() {
        return Result.ok(roleService.listAll());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('system:role:create')")
    public Result<Long> create(@Valid @RequestBody RoleRequest req) {
        return Result.ok(roleService.create(req));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('system:role:update')")
    public Result<Void> update(@PathVariable Long id, @Valid @RequestBody RoleRequest req) {
        roleService.update(id, req);
        return Result.ok();
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('system:role:delete')")
    public Result<Void> delete(@PathVariable Long id) {
        roleService.delete(id);
        return Result.ok();
    }
}
```

- [ ] **Step 5: Verify compile + commit**

```bash
cd /home/cris/dev/safeValidator/backend
mvn -pl safe-validator-admin compile
cd backend
git add safe-validator-admin
git commit -m "feat(admin): add RoleService and RoleController"
```

---

## Task 3.13: PermissionController (read-only)

**Files:**
- Create: `backend/safe-validator-admin/src/main/java/com/safevalidator/admin/dto/PermissionNode.java`
- Create: `backend/safe-validator-admin/src/main/java/com/safevalidator/admin/service/PermissionService.java`
- Create: `backend/safe-validator-admin/src/main/java/com/safevalidator/admin/controller/PermissionController.java`

- [ ] **Step 1: Create DTO**

```java
// PermissionNode.java
package com.safevalidator.admin.dto;

import java.util.List;

public record PermissionNode(
        Long id,
        Long parentId,
        String code,
        String name,
        String type,
        String path,
        String icon,
        Integer sortOrder,
        List<PermissionNode> children
) {}
```

- [ ] **Step 2: Create PermissionService**

```java
package com.safevalidator.admin.service;

import com.safevalidator.admin.dto.PermissionNode;
import com.safevalidator.admin.entity.SysPermission;
import com.safevalidator.admin.mapper.SysPermissionMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PermissionService {

    private final SysPermissionMapper permissionMapper;

    public List<PermissionNode> tree() {
        List<SysPermission> all = permissionMapper.selectList(null);
        Map<Long, List<SysPermission>> byParent = all.stream()
                .collect(Collectors.groupingBy(SysPermission::getParentId));

        return buildChildren(0L, byParent);
    }

    private List<PermissionNode> buildChildren(Long parentId, Map<Long, List<SysPermission>> byParent) {
        List<SysPermission> children = byParent.getOrDefault(parentId, List.of());
        List<PermissionNode> nodes = new ArrayList<>();
        for (SysPermission p : children) {
            nodes.add(new PermissionNode(
                    p.getId(), p.getParentId(), p.getCode(), p.getName(),
                    p.getType(), p.getPath(), p.getIcon(), p.getSortOrder(),
                    buildChildren(p.getId(), byParent)
            ));
        }
        return nodes;
    }
}
```

- [ ] **Step 3: Create PermissionController**

```java
package com.safevalidator.admin.controller;

import com.safevalidator.admin.dto.PermissionNode;
import com.safevalidator.admin.service.PermissionService;
import com.safevalidator.common.api.Result;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/admin/permissions")
@RequiredArgsConstructor
public class PermissionController {

    private final PermissionService permissionService;

    @GetMapping("/tree")
    public Result<List<PermissionNode>> tree() {
        return Result.ok(permissionService.tree());
    }
}
```

- [ ] **Step 4: Verify compile + commit**

```bash
cd /home/cris/dev/safeValidator/backend
mvn -pl safe-validator-admin compile
cd backend
git add safe-validator-admin
git commit -m "feat(admin): add PermissionController exposing permission tree"
```

---

## Task 3.14: Audit log async infrastructure

**Files:**
- Create: `backend/safe-validator-admin/src/main/java/com/safevalidator/admin/entity/SysAuditLog.java`
- Create: `backend/safe-validator-admin/src/main/java/com/safevalidator/admin/mapper/SysAuditLogMapper.java`
- Create: `backend/safe-validator-admin/src/main/java/com/safevalidator/admin/audit/AuditExecutorConfig.java`
- Create: `backend/safe-validator-admin/src/main/java/com/safevalidator/admin/audit/AuditService.java`
- Create: `backend/safe-validator-admin/src/main/java/com/safevalidator/admin/audit/AuditAspect.java`

- [ ] **Step 1: Create entity**

```java
// SysAuditLog.java
package com.safevalidator.admin.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.io.Serializable;
import java.time.LocalDateTime;

@Data
@TableName("sys_audit_log")
public class SysAuditLog implements Serializable {
    @TableId(type = IdType.ASSIGN_ID)
    private Long id;
    private Long userId;
    private String username;
    private String module;
    private String action;
    private String resourceId;
    private String method;
    private String path;
    private String ip;
    private String userAgent;
    private Integer status;
    private String errorMsg;
    private Long costMs;
    private LocalDateTime createTime;

    @TableLogic
    @TableField("deleted")
    private Integer deleted;
}
```

```java
// SysAuditLogMapper.java
package com.safevalidator.admin.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.safevalidator.admin.entity.SysAuditLog;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface SysAuditLogMapper extends BaseMapper<SysAuditLog> {
}
```

- [ ] **Step 2: Create audit executor config**

```bash
mkdir -p /home/cris/dev/safeValidator/backend/safe-validator-admin/src/main/java/com/safevalidator/admin/audit
```

```java
// AuditExecutorConfig.java
package com.safevalidator.admin.audit;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

@Configuration
@EnableAsync
public class AuditExecutorConfig {

    @Bean("auditExecutor")
    public Executor auditExecutor() {
        ThreadPoolTaskExecutor exec = new ThreadPoolTaskExecutor();
        exec.setCorePoolSize(2);
        exec.setMaxPoolSize(8);
        exec.setQueueCapacity(1000);
        exec.setThreadNamePrefix("audit-");
        exec.setRejectedExecutionHandler((r, e) -> {
            // On overflow, run on caller thread (don't drop)
            r.run();
        });
        exec.initialize();
        return exec;
    }
}
```

- [ ] **Step 3: Create AuditService**

```java
// AuditService.java
package com.safevalidator.admin.audit;

import com.safevalidator.admin.entity.SysAuditLog;
import com.safevalidator.admin.mapper.SysAuditLogMapper;
import com.safevalidator.common.security.SecurityUtils;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditService {

    private final SysAuditLogMapper auditLogMapper;

    @Async("auditExecutor")
    public void record(String module, String action, String resourceId, boolean success, String errorMsg, long costMs) {
        try {
            SysAuditLog logEntry = new SysAuditLog();
            logEntry.setUserId(SecurityUtils.currentUserIdOrNull().orElse(null));
            logEntry.setModule(module);
            logEntry.setAction(action);
            logEntry.setResourceId(resourceId);
            logEntry.setStatus(success ? 1 : 0);
            logEntry.setErrorMsg(errorMsg);
            logEntry.setCostMs(costMs);
            logEntry.setCreateTime(LocalDateTime.now());

            ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs != null) {
                HttpServletRequest req = attrs.getRequest();
                logEntry.setMethod(req.getMethod());
                logEntry.setPath(req.getRequestURI());
                logEntry.setIp(req.getRemoteAddr());
                logEntry.setUserAgent(req.getHeader("User-Agent"));
            }

            auditLogMapper.insert(logEntry);
        } catch (Exception ex) {
            AuditService.log.error("Failed to record audit log", ex);
        }
    }
}
```

- [ ] **Step 4: Create AuditAspect**

```java
// AuditAspect.java
package com.safevalidator.admin.audit;

import com.safevalidator.common.security.SecurityUtils;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Pointcut;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Slf4j
@Aspect
@Component
@RequiredArgsConstructor
public class AuditAspect {

    private final AuditService auditService;

    @Pointcut("@annotation(org.springframework.security.access.prepost.PreAuthorize)")
    public void protectedEndpoint() {}

    @Around("protectedEndpoint()")
    public Object audit(ProceedingJoinPoint pjp) throws Throwable {
        long start = System.currentTimeMillis();
        String module = "unknown";
        String action = pjp.getSignature().getName();
        boolean success = true;
        String errorMsg = null;

        try {
            Object result = pjp.proceed();
            return result;
        } catch (Throwable ex) {
            success = false;
            errorMsg = ex.getMessage();
            throw ex;
        } finally {
            long cost = System.currentTimeMillis() - start;
            try {
                auditService.record(module, action, null, success, errorMsg, cost);
            } catch (Exception ignored) {}
        }
    }
}
```

- [ ] **Step 5: Verify compile + commit**

```bash
cd /home/cris/dev/safeValidator/backend
mvn -pl safe-validator-admin compile
cd backend
git add safe-validator-admin
git commit -m "feat(admin): add async audit logging with AOP"
```

---

## Task 3.15: Phase 3 partial verification

- [ ] **Step 1: Build all modules**

```bash
cd /home/cris/dev/safeValidator/backend
mvn clean compile
```

Expected: `BUILD SUCCESS`

- [ ] **Step 2: Confirm key files**

```bash
find safe-validator-admin/src/main/java -type f -name "*.java" | sort
```

Expected to include: AuthService, AuthController, UserService, UserController, RoleService, RoleController, PermissionController, AuditService, AuditAspect, JwtAuthenticationFilter, SecurityConfig, JwtUtil.

---

## Task 3.16: Live API smoke test

- [ ] **Step 1: Start postgres + redis containers**

```bash
docker run -d --name sv-postgres -e POSTGRES_DB=safe_validator -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16-alpine
docker run -d --name sv-redis -p 6379:6379 redis:7-alpine
```

- [ ] **Step 2: Run backend**

```bash
cd /home/cris/dev/safeValidator/backend
DB_PASSWORD=postgres \
JWT_SECRET=this-is-a-test-secret-for-development-only-32bytes \
mvn -pl safe-validator-start spring-boot:run
```

Wait until you see `Started SafeValidatorApplication`. (This task depends on Task 4.x — if Spring Boot cannot start yet because main class is missing, complete Phase 4 first.)

- [ ] **Step 3: Test login endpoint**

```bash
curl -X POST http://localhost:8080/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"admin123"}'
```

Expected: JSON with `accessToken`, `refreshToken`, `user`.

- [ ] **Step 4: Test user list**

```bash
TOKEN=$(curl -s -X POST http://localhost:8080/auth/login -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"admin123"}' | jq -r '.data.accessToken')
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/admin/users
```

Expected: Page result with admin user.

- [ ] **Step 5: Test logout + blacklist**

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" http://localhost:8080/auth/logout
# Same token should now be rejected
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/admin/users
```

Expected: 401 (blacklisted).

- [ ] **Step 6: Stop backend and containers**

```bash
# Ctrl-C the backend
docker stop sv-postgres sv-redis && docker rm sv-postgres sv-redis
```

**Phase 3 partial complete.** Proceed to [Part 4](./2026-06-25-infrastructure-layer-part4-form-start.md) to add the Spring Boot main class and complete the boot.
