package correlation

import "reliability-studio-backend/models"

type IncidentContext struct {
    Incident   models.Incident `json:"incident"`
    Timeline   []Event         `json:"timeline"`
    Impact     ImpactSummary   `json:"impact"`
    Metrics    any             `json:"metrics"`
    Logs       any             `json:"logs"`
    Traces     any             `json:"traces"`
    Kubernetes any             `json:"kubernetes"`
}

type Event struct {
    Time    string `json:"time"`
    Source  string `json:"source"`
    Message string `json:"message"`
}
