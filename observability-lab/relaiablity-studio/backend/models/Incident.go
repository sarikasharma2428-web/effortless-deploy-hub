package models

import (
    "time"
    "github.com/google/uuid"
)

type Incident struct {
    ID           uuid.UUID     `json:"id" db:"id"`
    Title        string        `json:"title" db:"title"`
    Description  string        `json:"description" db:"description"`
    Severity     string        `json:"severity" db:"severity"`
    Status       string        `json:"status" db:"status"`
    CommanderID  *int          `json:"commander_id,omitempty" db:"commander_user_id"`
    StartedAt    time.Time     `json:"started_at" db:"started_at"`
    DetectedAt   *time.Time    `json:"detected_at,omitempty" db:"detected_at"`
    MitigatedAt  *time.Time    `json:"mitigated_at,omitempty" db:"mitigated_at"`
    ResolvedAt   *time.Time    `json:"resolved_at,omitempty" db:"resolved_at"`
    MTTRSeconds  *int          `json:"mttr_seconds,omitempty" db:"mttr_seconds"`
    RootCause    string        `json:"root_cause,omitempty" db:"root_cause"`
    Services     []Service     `json:"services,omitempty"`
    Timeline     []TimelineEvent `json:"timeline,omitempty"`
    Tasks        []Task        `json:"tasks,omitempty"`
    CreatedAt    time.Time     `json:"created_at" db:"created_at"`
    UpdatedAt    time.Time     `json:"updated_at" db:"updated_at"`
}

type CreateIncidentRequest struct {
    Title       string   `json:"title" validate:"required"`
    Description string   `json:"description"`
    Severity    string   `json:"severity" validate:"required,oneof=critical high medium low"`
    ServiceIDs  []string `json:"service_ids"`
}

type UpdateIncidentRequest struct {
    Status      *string `json:"status,omitempty" validate:"omitempty,oneof=open investigating mitigated resolved"`
    CommanderID *int    `json:"commander_id,omitempty"`
    RootCause   *string `json:"root_cause,omitempty"`
}