Frontend Integration Guide
=========================

This document explains how to integrate the customer frontend with the backend API (signup, login, token usage, and roles).

Base URL
--------
- Default: `http://localhost:8080` (controlled by `server.port`)

Authentication / Authorization
------------------------------
- The backend uses JWT access tokens (short lived) and refresh tokens (long lived).
- Include the access token on protected requests using the header:
  - `Authorization: Bearer <access_token>`
- Access token claim `roles` contains a list of role names (e.g. `USER`, `ADMIN`). The server converts those to Spring authorities as `ROLE_<name>`.

Endpoints
---------
- Signup (create customer)
  - POST `/api/users`
  - Request JSON: `{ "name":"...", "phone":"...", "email":"...", "password":"..." }`
  - Response: `201 Created` with `UserResponse` JSON containing `id`, `name`, `email`, `roles` (a set), timestamps, etc.
  - Validation: `password` min 8 chars; email max 120 characters.

- Login
  - POST `/api/auth/login`
  - Request JSON: `{ "email":"...", "password":"..." }`
  - Response: `AuthResponse` JSON:
    - `token` (JWT access token)
    - `expiresAt` (ISO instant)
    - `refreshToken`
    - `refreshExpiresAt`
    - `userId`
    - `roles` (array of role names)

- Refresh access token
  - POST `/api/auth/refresh`
  - Request JSON: `{ "refreshToken":"..." }` (see DTO name `AuthRefreshRequest`)
  - Response: same shape as login (`AuthResponse`) with rotated refresh token

- Roles management (admin-only in practice)
  - GET `/api/roles` — list available roles
  - POST `/api/users/{userId}/roles/{roleName}` — assign role
  - DELETE `/api/users/{userId}/roles/{roleName}` — remove role

Default role behavior
---------------------
- New users are assigned the `USER` role by default. The backend seeds roles on startup via `RoleSeeder`.
  - Default seeded roles: `SUPER_ADMIN`, `STAFF`, `USER` (created on application startup if missing).

Errors and status codes
-----------------------
- Validation errors: `400 Bad Request` with a JSON body describing field errors.
- Business errors (e.g. invalid credentials, user inactive, email already registered): `400 Bad Request` with message.
- Authentication failures are surfaced as errors from the login endpoint (currently mapped to 400).

Client integration examples
---------------------------
1) Signup (JS / fetch):

```javascript
async function signup({ name, phone, email, password }) {
  const res = await fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, phone, email, password })
  });
  if (!res.ok) throw await res.json();
  return res.json();
}
```

2) Login and store tokens (JS):

```javascript
async function login({ email, password }) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) throw await res.json();
  const auth = await res.json();
  // store tokens (choose secure storage strategy for your app)
  localStorage.setItem('accessToken', auth.token);
  localStorage.setItem('refreshToken', auth.refreshToken);
  return auth;
}

function authFetch(input, options = {}) {
  const token = localStorage.getItem('accessToken');
  options.headers = { ...(options.headers || {}), 'Authorization': `Bearer ${token}` };
  return fetch(input, options);
}
```

3) Automatic refresh pattern (simple):

```javascript
async function refresh() {
  const refreshToken = localStorage.getItem('refreshToken');
  const res = await fetch('/api/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  });
  if (!res.ok) throw await res.json();
  const auth = await res.json();
  localStorage.setItem('accessToken', auth.token);
  localStorage.setItem('refreshToken', auth.refreshToken);
  return auth;
}
```

Security / CORS notes
---------------------
- The backend currently has no explicit CORS configuration. For local dev, either run frontend on the same origin (proxy) or enable CORS on the server.

Example: enable permissive CORS in Spring Boot (dev only)

```java
import org.springframework.context.annotation.Bean;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

@Bean
public CorsFilter corsFilter() {
  CorsConfiguration cfg = new CorsConfiguration();
  cfg.addAllowedOriginPattern("*");
  cfg.addAllowedHeader("*");
  cfg.addAllowedMethod("*");
  cfg.setAllowCredentials(true);
  UrlBasedCorsConfigurationSource src = new UrlBasedCorsConfigurationSource();
  src.registerCorsConfiguration("/**", cfg);
  return new CorsFilter(src);
}
```

Configuration values
--------------------
- JWT secret: `app.jwt.secret` (must be at least 32 chars)
- Access token expiration: `app.jwt.expiration-minutes` (default 120)
- Refresh token expiration: `app.jwt.refresh-expiration-days` (default 30)

Recommended frontend practices
------------------------------
- Store refresh tokens securely (consider httpOnly cookie for refresh token and keep access token in memory/localStorage depending on threat model).
- Use `roles` from `AuthResponse` to control UI (feature flags) but validate on the backend for security.
- Handle `400` responses from login/refresh by showing user-friendly messages and prompting re-login if needed.

Next steps I can do for you
--------------------------
- Start the backend and run example signup+login flows and paste real responses.
- Add a small CORS-permission configuration to the backend for local frontend development.
- Implement httpOnly cookie refresh flow (server + frontend changes).

---
File generated: `FRONTEND-INTEGRATION.md`
