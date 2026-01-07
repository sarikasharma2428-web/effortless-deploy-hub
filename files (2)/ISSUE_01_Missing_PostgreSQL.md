# Issue #1: Missing PostgreSQL Service in docker-compose

**Priority:** 🔴 CRITICAL - BLOCKER  
**Type:** Bug  
**Component:** Infrastructure  
**Status:** Open  

## Problem

The application cannot start because PostgreSQL database service is missing from `docker-compose.yml`. The backend expects to connect to PostgreSQL on startup but the service doesn't exist.

## Current Behavior

When running `docker-compose up`:
- ✅ Grafana starts successfully
- ✅ Prometheus starts successfully
- ✅ Loki starts successfully
- ✅ Tempo starts successfully
- ❌ Backend crashes with "failed to connect to database" error
- ❌ No PostgreSQL container exists

## Expected Behavior

PostgreSQL should be included as a service in docker-compose and the backend should connect successfully on startup.

## Evidence

**File:** `observability-lab/relaiablity-studio/docker/docker-compose.yml`

Current services:
```yaml
services:
  grafana:
    image: grafana/grafana:latest
    # ... config
    
  prometheus:
    image: prom/prometheus
    # ... config
    
  loki:
    image: grafana/loki:latest
    # ... config
    
  tempo:
    image: grafana/tempo:latest
    # ... config
    
  # ❌ NO POSTGRESQL SERVICE!
```

**File:** `backend/database/db.go:18-29`

The application expects PostgreSQL:
```go
func Connect(config *Config) (*sql.DB, error) {
    dsn := fmt.Sprintf(
        "host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
        config.Host, config.Port, config.User, config.Password, config.DBName, config.SSLMode,
    )

    db, err := sql.Open("postgres", dsn)
    if err != nil {
        return nil, fmt.Errorf("failed to open database: %w", err)
    }
    // ...
}
```

**File:** `.env.example`

Database configuration exists:
```bash
DB_HOST=postgres
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=reliability_studio
DB_SSLMODE=disable
```

## Impact

- 🚫 Application cannot start
- 🚫 No data persistence
- 🚫 Cannot test incident management
- 🚫 Cannot test SLO tracking
- 🚫 Blocks all development work

## Solution

Add PostgreSQL service to `docker-compose.yml`:

```yaml
services:
  # ... existing services ...

  postgres:
    image: postgres:15-alpine
    container_name: reliability-postgres
    environment:
      POSTGRES_DB: reliability_studio
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build: ./backend
    container_name: reliability-backend
    ports:
      - "9000:9000"
    environment:
      DB_HOST: postgres
      DB_PORT: 5432
      DB_USER: postgres
      DB_PASSWORD: postgres
      DB_NAME: reliability_studio
      PROMETHEUS_URL: http://prometheus:9090
      LOKI_URL: http://loki:3100
      TEMPO_URL: http://tempo:3200
    depends_on:
      postgres:
        condition: service_healthy
      prometheus:
        condition: service_started
      loki:
        condition: service_started
      tempo:
        condition: service_started

volumes:
  postgres_data:
```

## Testing Steps

After fix:
1. Run `docker-compose down -v` (clean volumes)
2. Run `docker-compose up -d`
3. Check logs: `docker-compose logs backend`
4. Expected: "✅ Connected to PostgreSQL database"
5. Expected: "✅ Database schema initialized successfully"
6. Access health endpoint: `curl http://localhost:9000/health`
7. Expected response:
```json
{
  "status": "healthy",
  "database": "healthy",
  "prometheus": "healthy",
  "loki": "healthy"
}
```

## Related Issues

- Blocks Issue #2 (Nil pointer in correlation engine - needs DB to test)
- Blocks Issue #5 (Authentication - needs DB for user storage)
- Required for Issue #9 (SLO calculation - needs DB to store SLOs)

## Files to Modify

1. `observability-lab/relaiablity-studio/docker/docker-compose.yml` - Add postgres service
2. Consider adding `backend` service definition to docker-compose

## Additional Context

From `AUDIT_REPORT.md`:
> **CRITICAL ISSUE #1:** Application requires PostgreSQL but no database service exists in docker-compose. This is the first blocker preventing application startup.

## Acceptance Criteria

- [ ] PostgreSQL 15 service added to docker-compose
- [ ] Proper healthcheck configured
- [ ] Data volume for persistence
- [ ] Backend service depends on postgres being healthy
- [ ] Backend connects successfully on startup
- [ ] Schema automatically initializes
- [ ] Seed data loads successfully
- [ ] Health endpoint returns database: "healthy"
