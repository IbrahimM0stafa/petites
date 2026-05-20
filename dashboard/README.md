# Petites Admin Dashboard

Angular admin application for Petites staff (`SUPER_ADMIN` and `STAFF` roles). Runs separately from the customer storefront in `../frontend`.

## Development server

```bash
npm install
ng serve
```

Open `http://localhost:4300/`. The dev server uses port **4300** so backend CORS (`http://localhost:4300`) applies without extra configuration.

## Backend configuration

API origin is set in `src/environments/`:

- `environment.ts` / `environment.development.ts` → `http://localhost:8080`
- `environment.staging.ts` and `environment.production.ts` for deployed APIs

Build configurations:

- `ng build --configuration development`
- `ng build --configuration staging`
- `ng build --configuration production`

## Routes

| Path | Description |
|------|-------------|
| `/login` | Staff sign in (no public signup) |
| `/` | Dashboard overview (requires auth + admin role) |
| `/users` | User list |
| `/users/:id` | User detail, deactivate / reactivate |

Sessions are stored under `petites.admin.auth.session` so they do not conflict with the customer app on port 4200.

## Admin access

Sign in with a backend user that has `STAFF` or `SUPER_ADMIN` role. Accounts with only `USER` are rejected after login.

With the backend running on the `dev` profile, these accounts are seeded automatically:

| Role | Email | Password |
|------|-------|----------|
| `SUPER_ADMIN` | `superadmin@petites.com` | `abcABC12$$` |
| `STAFF` | `staff@petites.com` | `abcABC12$$` |

Emails are stored lowercase. Disable seeding with `app.seed.admin-users.enabled=false` in `application-dev.properties`.

## Building

```bash
ng build
```

Output: `dist/dashboard`.
