-- Services (Service Catalog)
CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    team VARCHAR(255),
    on_call_schedule TEXT,
    repository_url TEXT,
    documentation_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- SLOs
CREATE TABLE slos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID REFERENCES services(id),
    name VARCHAR(255) NOT NULL,
    objective FLOAT NOT NULL,  -- e.g., 99.9
    window_days INT NOT NULL,   -- e.g., 30
    error_budget_remaining FLOAT,
    status VARCHAR(50),  -- healthy, warning, critical
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Incidents
CREATE TABLE incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    severity VARCHAR(50) NOT NULL,  -- critical, high, medium, low
    status VARCHAR(50) NOT NULL,    -- open, investigating, mitigated, resolved
    commander_user_id INT,
    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    detected_at TIMESTAMP,
    mitigated_at TIMESTAMP,
    resolved_at TIMESTAMP,
    mttr_seconds INT,
    root_cause TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Incident Services (many-to-many)
CREATE TABLE incident_services (
    incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,
    service_id UUID REFERENCES services(id),
    impact_level VARCHAR(50),  -- primary, secondary, tertiary
    PRIMARY KEY (incident_id, service_id)
);

-- Timeline Events
CREATE TABLE timeline_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,  -- alert, log_spike, pod_crash, metric_anomaly, user_action
    timestamp TIMESTAMP NOT NULL,
    source VARCHAR(100),  -- prometheus, loki, tempo, kubernetes, manual
    title VARCHAR(500),
    description TEXT,
    metadata JSONB,  -- flexible storage for evidence
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tasks
CREATE TABLE incident_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'open',  -- open, in_progress, done
    assigned_to INT,
    created_by INT,
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_severity ON incidents(severity);
CREATE INDEX idx_incidents_started ON incidents(started_at DESC);
CREATE INDEX idx_timeline_incident ON timeline_events(incident_id, timestamp);
CREATE INDEX idx_slos_service ON slos(service_id);