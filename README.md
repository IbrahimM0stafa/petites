# Petites

E-commerce platform built with Angular 19 (storefront + admin dashboard) and Spring Boot 3.5 (backend API), backed by PostgreSQL.

---

## Architecture

```
                        ┌─────────────────────────────────────┐
                        │           Linux VPS / Host           │
                        │                                     │
  petites.com ──────────┤► :80  ┌─────────────┐              │
                        │       │  frontend   │──┐           │
                        │       │  (nginx)    │  │           │
                        │       └─────────────┘  │           │
                        │                        │ petites-net│
  admin.petites.com ────┤► :8081┌─────────────┐  │ (docker)  │
                        │       │  dashboard  │──┤           │
                        │       │  (nginx)    │  │           │
                        │       └─────────────┘  │           │
                        │                        ▼           │
                        │       ┌─────────────────────┐      │
                        │       │   backend (:8080)   │      │
                        │       │   Spring Boot API   │      │
                        │       └────────┬────────────┘      │
                        │                │                    │
                        │       ┌────────▼────────────┐      │
                        │       │    db (:5432)       │      │
                        │       │   PostgreSQL 16     │      │
                        │       │   [pgdata volume]   │      │
                        │       └─────────────────────┘      │
                        └─────────────────────────────────────┘
```

**Key design decisions:**

- **Backend is NOT exposed** to the host — only the Nginx containers can reach it via the Docker network (`petites-net`). This is more secure.
- **Nginx reverse-proxies** `/api/` requests from the Angular apps to `http://backend:8080/api/`.
- **PostgreSQL data** is stored in a named Docker volume (`petites-pgdata`) that survives container restarts and recreation.
- **Health checks** ensure ordered startup: DB → Backend → Frontend/Dashboard.

---

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) ≥ 24.0
- [Docker Compose](https://docs.docker.com/compose/install/) ≥ 2.20 (included with Docker Desktop)
- 2 GB+ RAM on the host machine
- A domain name with DNS configured (for production)

---

## Quick Start (Local Development)

```bash
# 1. Clone the repository
git clone https://github.com/your-org/petites.git
cd petites

# 2. Create your environment file
cp .env.example .env

# 3. Edit .env with your values
#    For local dev, you only NEED to set:
#      SPRING_PROFILES_ACTIVE=dev
#      DB_DDL_AUTO=update
#      JWT_SECRET=<any 64-char hex string>
#      CLOUDINARY_* values

# 4. Build and start all services
docker compose up -d --build

# 5. Check service health
docker compose ps

# 6. Access the apps
#    Storefront:  http://localhost
#    Dashboard:   http://localhost:8081
#    Backend API: http://localhost/api/categories (via Nginx proxy)
```

### Stopping Services

```bash
# Stop all containers (data is preserved in volume)
docker compose down

# Stop and remove everything INCLUDING data
docker compose down -v   # ⚠️ This deletes the database!
```

---

## Build Process

The project uses **multi-stage Docker builds** to produce optimized, small production images:

### Backend (Spring Boot)

| Stage | Image | Purpose |
|-------|-------|---------|
| **build** | `eclipse-temurin:21-jdk-alpine` | Compiles Java, runs Maven, produces JAR |
| **runtime** | `eclipse-temurin:21-jre-alpine` | Runs the JAR with minimal footprint |

- Maven dependencies are cached in a separate layer → rebuilds only redownload if `pom.xml` changes.
- The runtime image includes `curl` for health checks.
- Runs as non-root user `appuser`.

### Frontend & Dashboard (Angular)

| Stage | Image | Purpose |
|-------|-------|---------|
| **build** | `node:22-alpine` | Installs deps, runs `ng build --configuration=production` |
| **serve** | `nginx:alpine` | Serves static files, proxies `/api/` to backend |

- `npm ci` uses lockfile for deterministic installs.
- Final image is ~40 MB (just Nginx + static HTML/JS/CSS).
- Nginx handles gzip compression, security headers, and SPA routing.

---

## Production Deployment (Linux VPS)

### 1. Server Setup

```bash
# Install Docker on Ubuntu/Debian
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Log out and back in

# Install Docker Compose plugin (if not included)
sudo apt-get install docker-compose-plugin
```

### 2. Deploy the Application

```bash
# Clone or pull the latest code
git clone https://github.com/your-org/petites.git
cd petites

# Create production .env
cp .env.example .env
nano .env   # Fill in production secrets

# Generate a secure JWT secret
openssl rand -hex 32
# Paste the output as JWT_SECRET in .env

# Build and start
docker compose up -d --build

# Verify all services are healthy
docker compose ps
docker compose logs -f   # Watch logs (Ctrl+C to exit)
```

### 3. Configure DNS & Reverse Proxy

Since the dashboard uses a separate subdomain (`admin.petites.com`), configure your DNS:

| Record | Type | Value |
|--------|------|-------|
| `petites.com` | A | `<your-vps-ip>` |
| `admin.petites.com` | A | `<your-vps-ip>` |

Then set up an **external Nginx reverse proxy** on the VPS for SSL termination:

```bash
sudo apt-get install nginx certbot python3-certbot-nginx
```

Create `/etc/nginx/sites-available/petites`:

```nginx
# Storefront
server {
    server_name petites.com www.petites.com;

    location / {
        proxy_pass http://127.0.0.1:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Admin Dashboard
server {
    server_name admin.petites.com;

    location / {
        proxy_pass http://127.0.0.1:8081;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/petites /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Get SSL certificates (free, auto-renewing)
sudo certbot --nginx -d petites.com -d www.petites.com -d admin.petites.com
```

### 4. Firewall

```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP (for Let's Encrypt)
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

---

## Backup & Restore PostgreSQL Data

### Create a Backup

```bash
# Dump the database to a SQL file
docker compose exec db pg_dump -U ${POSTGRES_USER:-petites} ${POSTGRES_DB:-petites} > backup_$(date +%Y%m%d_%H%M%S).sql

# Or create a compressed backup
docker compose exec db pg_dump -U ${POSTGRES_USER:-petites} -Fc ${POSTGRES_DB:-petites} > backup_$(date +%Y%m%d_%H%M%S).dump
```

### Restore from Backup

```bash
# From SQL file
cat backup_20260611_120000.sql | docker compose exec -T db psql -U ${POSTGRES_USER:-petites} ${POSTGRES_DB:-petites}

# From compressed dump
cat backup_20260611_120000.dump | docker compose exec -T db pg_restore -U ${POSTGRES_USER:-petites} -d ${POSTGRES_DB:-petites} --clean --if-exists
```

### Automated Backups (Cron)

```bash
# Add to crontab: daily backup at 2 AM, keep last 7 days
crontab -e
```

```
0 2 * * * cd /path/to/petites && docker compose exec -T db pg_dump -U petites -Fc petites > /backups/petites_$(date +\%Y\%m\%d).dump && find /backups -name "petites_*.dump" -mtime +7 -delete
```

---

## CI/CD Integration

The existing [Jenkinsfile](./Jenkinsfile) can be extended. Here's how the Docker workflow fits:

### GitHub Actions Example

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to VPS
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /opt/petites
            git pull origin main
            docker compose up -d --build
            docker compose ps
```

### Jenkins (Extending Existing Pipeline)

Update the Deploy stage in `Jenkinsfile`:

```groovy
stage('Deploy') {
  steps {
    sh 'docker compose up -d --build'
    sh 'docker compose ps'
  }
}
```

---

## Environment Variables Reference

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `SPRING_PROFILES_ACTIVE` | Spring profile (`dev` / `prod`) | `prod` | Yes |
| `PORT` | Backend server port | `8080` | No |
| `POSTGRES_DB` | Database name | — | Yes |
| `POSTGRES_USER` | Database username | — | Yes |
| `POSTGRES_PASSWORD` | Database password | — | Yes |
| `DB_DDL_AUTO` | Hibernate DDL strategy | `validate` | No |
| `JWT_SECRET` | JWT signing key (64-char hex) | — | Yes |
| `JWT_ISSUER` | JWT issuer claim | `petites-backend` | No |
| `JWT_EXPIRATION_MINUTES` | Access token TTL | `120` | No |
| `JWT_REFRESH_EXPIRATION_DAYS` | Refresh token TTL | `30` | No |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | — | Yes |
| `CLOUDINARY_API_KEY` | Cloudinary API key | — | Yes |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | — | Yes |
| `CORS_ALLOWED_ORIGINS` | Allowed CORS origins (comma-sep) | `http://localhost,...` | No |
| `FRONTEND_PORT` | Host port for storefront | `80` | No |
| `DASHBOARD_PORT` | Host port for dashboard | `8081` | No |

---

## Troubleshooting

### Container won't start

```bash
# Check logs for a specific service
docker compose logs backend
docker compose logs db

# Check if ports are already in use
sudo lsof -i :80
sudo lsof -i :8081
```

### Database connection errors

```bash
# Verify the database is healthy
docker compose exec db pg_isready -U petites

# Connect to the database directly
docker compose exec db psql -U petites -d petites
```

### Rebuild from scratch

```bash
docker compose down
docker compose build --no-cache
docker compose up -d
```

### Check disk usage

```bash
# Volume sizes
docker system df -v

# Prune unused images
docker image prune -a
```