module reliability-control-plane-backend

go 1.21

require (
    github.com/gorilla/mux v1.8.0
    github.com/lib/pq v1.10.9           // PostgreSQL
    github.com/google/uuid v1.6.0       // UUIDs
    go.uber.org/zap v1.26.0             // Logging
    github.com/jmoiron/sqlx v1.3.5      // SQL helpers
)