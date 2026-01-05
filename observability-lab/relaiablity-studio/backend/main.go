package main

import (
    "log"
    "net/http"
    "github.com/gorilla/mux"
    "reliability-control-plane-backend/config"
    "reliability-control-plane-backend/database"
    "reliability-control-plane-backend/handlers"
    "reliability-control-plane-backend/middleware"
    "reliability-control-plane-backend/correlation"
)

func main() {
    // Load configuration
    cfg := config.Load()
    
    // Initialize database
    if err := database.Init(cfg.DatabaseURL); err != nil {
        log.Fatal("Failed to connect to database:", err)
    }
    
    // Run migrations
    if err := database.Migrate(); err != nil {
        log.Fatal("Failed to run migrations:", err)
    }
    
    // Start correlation engine
    detector := correlation.NewDetector()
    go detector.Start()
    
    // Setup router
    r := mux.NewRouter()
    
    // Middleware
    r.Use(middleware.CORS)
    r.Use(middleware.Logging)
    r.Use(middleware.RateLimit)
    // r.Use(middleware.Auth) // Enable when Grafana auth is ready
    
    // Health check
    r.HandleFunc("/health", handlers.HealthCheck).Methods("GET")
    
    // API routes
    api := r.PathPrefix("/api").Subrouter()
    
    // Incidents
    api.HandleFunc("/incidents", handlers.ListIncidents).Methods("GET")
    api.HandleFunc("/incidents", handlers.CreateIncident).Methods("POST")
    api.HandleFunc("/incidents/{id}", handlers.GetIncident).Methods("GET")
    api.HandleFunc("/incidents/{id}", handlers.UpdateIncident).Methods("PATCH")
    api.HandleFunc("/incidents/{id}/timeline", handlers.GetTimeline).Methods("GET")
    api.HandleFunc("/incidents/{id}/timeline", handlers.AddTimelineEvent).Methods("POST")
    api.HandleFunc("/incidents/{id}/tasks", handlers.ListTasks).Methods("GET")
    api.HandleFunc("/incidents/{id}/tasks", handlers.CreateTask).Methods("POST")
    
    // Services
    api.HandleFunc("/services", handlers.ListServices).Methods("GET")
    api.HandleFunc("/services", handlers.CreateService).Methods("POST")
    api.HandleFunc("/services/{id}", handlers.GetService).Methods("GET")
    api.HandleFunc("/services/{id}/slos", handlers.GetServiceSLOs).Methods("GET")
    api.HandleFunc("/services/{id}/incidents", handlers.GetServiceIncidents).Methods("GET")
    
    // SLOs
    api.HandleFunc("/slos", handlers.ListSLOs).Methods("GET")
    api.HandleFunc("/slos", handlers.CreateSLO).Methods("POST")
    api.HandleFunc("/slos/{id}", handlers.GetSLO).Methods("GET")
    api.HandleFunc("/slos/{id}", handlers.UpdateSLO).Methods("PATCH")
    api.HandleFunc("/slos/{id}/history", handlers.GetSLOHistory).Methods("GET")
    
    log.Printf("Reliability Control Plane backend starting on :9000")
    log.Fatal(http.ListenAndServe(":9000", r))
}