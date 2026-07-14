package com.safevalidator.admin.controller;

import com.safevalidator.admin.dto.LoginRequest;
import com.safevalidator.admin.dto.LoginResponse;
import com.safevalidator.admin.dto.RefreshRequest;
import com.safevalidator.admin.dto.ThirdPartyTokenRequest;
import com.safevalidator.admin.dto.ThirdPartyTokenResponse;
import com.safevalidator.admin.service.AuthService;
import com.safevalidator.admin.service.ThirdPartyAuthService;
import com.safevalidator.common.api.Result;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final ThirdPartyAuthService thirdPartyAuthService;

    public AuthController(AuthService authService, ThirdPartyAuthService thirdPartyAuthService) {
        this.authService = authService;
        this.thirdPartyAuthService = thirdPartyAuthService;
    }

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

    /**
     * Issue an access token for an external system (e.g. an OA) acting
     * on behalf of one of its users. Open endpoint — auth is by appId /
     * appSecret in the request body. Rate-limit at the gateway in
     * production; the underlying DB lookup + BCrypt compare is cheap but
     * still want to prevent credential stuffing.
     */
    @PostMapping("/third-party-token")
    public Result<ThirdPartyTokenResponse> thirdPartyToken(@Valid @RequestBody ThirdPartyTokenRequest req) {
        return Result.ok(thirdPartyAuthService.issueToken(req));
    }
}