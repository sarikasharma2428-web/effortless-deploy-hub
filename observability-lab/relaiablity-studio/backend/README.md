# Reliability Studio Backend

A comprehensive reliability control plane for incident management, SLO tracking, and service observability.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Reliability Studio                       │
├──────────────────┬──────────────────┬──────────────────────┤
│   Frontend UI    │   Backend API    │   Observability      │
│   (React/Next)   │   (Go/Postgres)  │   (Prometheus/Loki)  │
└──────────────────┴──────────────────┴──────────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Go 1.22+ (for local development)
- PostgreSQL 15+ (if running without Docker)

### Running with Docker Compose

```bash
# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f backend

# Stop all services
docker-compose down
```

### Services & Ports

| Service     | Port | Description                |
|-------------|------|----------------------------|
| Backend API | 9000 | REST API                   |
| PostgreSQL  | 5432 | Database                   |
| Prometheus  | 9090 | Metrics collection         |
| Loki        | 3100 | Log aggregation            |
| Tempo       | 3200 | Distributed tracing        |
| Grafana     | 3000 | Visualization dashboard    |

### Local Development

```bash
# Install dependencies
cd backend
go mod download

# Set environment variables
export DATABASE_URL="postgres://rcp_user:changeme@localhost:5432/reliability_control_plane?sslmode=disable"
export PROMETHEUS_URL="http://localhost:9090"
export LOKI_URL="http://localhost:3100"
export TEMPO_URL="http://localhost:3200"

# Run migrations (creates tables)
go run main.go

# Build and run
go build -o backend
./backend
```

## 📡 API Endpoints

### Incidents

```bash
# List all incidents
GET /api/incidents?status=open&severity=critical

# Create incident
POST /api/incidents
{
  "title": "Payment Service Down",
  "description": "500 errors on /api/payments",
  "severity": "critical",
  "service_ids": ["uuid-here"]
}

# Get incident details
GET /api/incidents/{id}

# Update incident
PATCH /api/incidents/{id}
{
  "status": "investigating",
  "root_cause": "Database connection pool exhausted"
}

# Get incident timeline
GET /api/incidents/{id}/timeline

# Add timeline event
POST /api/incidents/{id}/timeline
{
  "type": "metric_anomaly",
  "source": "prometheus",
  "title": "Error rate spike detected",
  "description": "Error rate increased to 15%"
}
```

### Services

```bash
# List services
GET /api/services

# Create service
POST /api/services
{
  "name": "payment-service",
  "team": "payments-team",
  "repository_url": "https://github.com/org/payment-service"
}

# Get service
GET /api/services/{id}

# Get service incidents
GET /api/services/{id}/incidents
```

### SLOs

```bash
# List SLOs
GET /api/slos

# Create SLO
POST /api/slos
{
  "service_id": "uuid-here",
  "name": "API Availability",
  "objective": 99.9,
  "window_days": 30
}

# Update SLO
PATCH /api/slos/{id}
{
  "error_budget_remaining": 85.5,
  "status": "healthy"
}
```

## 🗄️ Database Schema

### Tables
- **services**: Service catalog
- **slos**: Service Level Objectives
- **incidents**: Incident records
- **incident_services**: Links incidents to services
- **timeline_events**: Incident timeline
- **incident_tasks**: Action items

## 🔧 Configuration

Environment variables:

```bash
DATABASE_URL=postgres://user:pass@host:5432/dbname?sslmode=disable
PROMETHEUS_URL=http://prometheus:9090
LOKI_URL=http://loki:3100
TEMPO_URL=http://tempo:3200
PORT=9000
```

## 📊 Observability Integration

The backend integrates with:

1. **Prometheus**: Queries metrics for SLO calculation and anomaly detection
2. **Loki**: Analyzes logs for error patterns and root cause analysis
3. **Tempo**: Traces distributed transactions for performance analysis
4. **Kubernetes**: Monitors pod health and cluster events

## 🧪 Testing

```bash
# Run tests
go test ./...

# Test specific package
go test ./services

# With coverage
go test -cover ./...

# Test API endpoints
curl http://localhost:9000/health
curl http://localhost:9000/api/incidents
```

## 🔐 Security

- CORS middleware for cross-origin requests
- Request logging for audit trails
- Panic recovery for graceful error handling
- Input validation on all endpoints
- SQL injection prevention via prepared statements

## 📈 Next Steps

### Planned Features
1. **Automated Incident Detection**: Correlation engine that auto-creates incidents
2. **AI-Powered Root Cause Analysis**: ML-based pattern detection
3. **Slack/PagerDuty Integration**: Incident notifications
4. **Grafana Authentication**: SSO integration
5. **Postmortem Generation**: Auto-generate incident reports
6. **SLO Burn Rate Alerts**: Proactive budget warnings

### Development Roadmap
- [ ] WebSocket support for real-time updates
- [ ] GraphQL API layer
- [ ] Multi-tenancy support
- [ ] Advanced RBAC
- [ ] Incident playbooks
- [ ] On-call rotation management

## 🤝 Contributing

1. Create feature branch: `git checkout -b feature/amazing-feature`
2. Commit changes: `git commit -m 'Add amazing feature'`
3. Push to branch: `git push origin feature/amazing-feature`
4. Open Pull Request

## 📝 License

MIT License - see LICENSE file for details

## 🆘 Troubleshooting

### Database connection failed
```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# View logs
docker-compose logs postgres

# Restart database
docker-compose restart postgres
```

### Backend won't start
```bash
# Check environment variables
printenv | grep DATABASE_URL

# Verify database schema
docker exec -it reliability-postgres psql -U rcp_user -d reliability_control_plane -c "\dt"

# Run migrations manually
docker exec -it reliability-backend go run main.go
```

### API returns 500 errors
```bash
# Check backend logs
docker-compose logs -f backend

# Test database connectivity
curl http://localhost:9000/health
```

## 📞 Support

For issues and questions:
- GitHub Issues: [Create an issue]
- Documentation: [Link to docs]
- Slack: [Your Slack channel]