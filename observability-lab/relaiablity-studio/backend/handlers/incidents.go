package handlers

import (
    "encoding/json"
    "net/http"
    "github.com/gorilla/mux"
    "github.com/sarikasharma2428-web/reliability-studio/models"
    "github.com/sarikasharma2428-web/reliability-studio/services"
)

// GET /api/incidents
func ListIncidents(w http.ResponseWriter, r *http.Request) {
    status := r.URL.Query().Get("status")  // filter by status
    severity := r.URL.Query().Get("severity")
    
    incidents, err := services.GetIncidents(status, severity)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
    
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(incidents)
}

// POST /api/incidents
func CreateIncident(w http.ResponseWriter, r *http.Request) {
    var req models.CreateIncidentRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, "Invalid request", http.StatusBadRequest)
        return
    }
    
    incident, err := services.CreateIncident(req)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
    
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusCreated)
    json.NewEncoder(w).Encode(incident)
}

// GET /api/incidents/:id
func GetIncident(w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r)
    id := vars["id"]
    
    incident, err := services.GetIncidentByID(id)
    if err != nil {
        http.Error(w, "Incident not found", http.StatusNotFound)
        return
    }
    
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(incident)
}

// PATCH /api/incidents/:id
func UpdateIncident(w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r)
    id := vars["id"]
    
    var updates models.UpdateIncidentRequest
    if err := json.NewDecoder(r.Body).Decode(&updates); err != nil {
        http.Error(w, "Invalid request", http.StatusBadRequest)
        return
    }
    
    incident, err := services.UpdateIncident(id, updates)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
    
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(incident)
}

// POST /api/incidents/:id/timeline
func AddTimelineEvent(w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r)
    incidentID := vars["id"]
    
    var event models.TimelineEvent
    if err := json.NewDecoder(r.Body).Decode(&event); err != nil {
        http.Error(w, "Invalid request", http.StatusBadRequest)
        return
    }
    
    event.IncidentID = incidentID
    if err := services.AddTimelineEvent(event); err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
    
    w.WriteHeader(http.StatusCreated)
    json.NewEncoder(w).Encode(event)
}