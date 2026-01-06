package correlation

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"
)

type CorrelationEngine struct {
	db            *sql.DB
	promClient    PrometheusClient
	k8sClient     KubernetesClient
	lokiClient    LokiClient
}

type PrometheusClient interface {
	GetServiceAvailability(ctx context.Context, service string, window time.Duration) (float64, error)
	GetErrorRate(ctx context.Context, service string, window time.Duration) (float64, error)
	GetLatencyP99(ctx context.Context, service string, window time.Duration) (float64, error)
	GetCPUUsage(ctx context.Context, service string) (float64, error)
	GetMemoryUsage(ctx context.Context, service string) (float64, error)
	DetectAnomalies(ctx context.Context, service string) ([]string, error)
}

type KubernetesClient interface {
	GetPods(ctx context.Context, namespace, service string) ([]PodInfo, error)
	GetDeployments(ctx context.Context, namespace, service string) ([]DeploymentInfo, error)
	GetEvents(ctx context.Context, namespace, service string, since time.Time) ([]EventInfo, error)
	DetectPodIssues(ctx context.Context, namespace, service string) ([]string, error)
}

type LokiClient interface {
	QueryLogs(ctx context.Context, query string, start, end time.Time, limit int) ([]LogEntry, error)
	GetErrorLogs(ctx context.Context, service string, since time.Time, limit int) ([]LogEntry, error)
}

type PodInfo struct {
	Name     string
	Status   string
	Restarts int32
}

type DeploymentInfo struct {
	Name      string
	Replicas  int32
	Ready     int32
	Available int32
}

type EventInfo struct {
	Type      string
	Reason    string
	Message   string
	Timestamp time.Time
}

type LogEntry struct {
	Timestamp time.Time
	Message   string
	Level     string
}

type Correlation struct {
	ID              string                 `json:"id"`
	IncidentID      string                 `json:"incident_id"`
	Type            string                 `json:"type"`
	SourceType      string                 `json:"source_type"`
	SourceID        string                 `json:"source_id"`
	ConfidenceScore float64                `json:"confidence_score"`
	Details         map[string]interface{} `json:"details"`
	CreatedAt       time.Time              `json:"created_at"`
}

type IncidentContext struct {
	Service        string
	Namespace      string
	StartTime      time.Time
	Severity       string
	AffectedPods   []PodInfo
	K8sEvents      []EventInfo
	MetricAnomalies []string
	LogErrors      []LogEntry
	RootCauses     []string
}

// NewCorrelationEngine creates a new correlation engine
func NewCorrelationEngine(db *sql.DB, promClient PrometheusClient, k8sClient KubernetesClient, lokiClient LokiClient) *CorrelationEngine {
	return &CorrelationEngine{
		db:         db,
		promClient: promClient,
		k8sClient:  k8sClient,
		lokiClient: lokiClient,
	}
}

// CorrelateIncident performs comprehensive correlation for an incident
func (e *CorrelationEngine) CorrelateIncident(ctx context.Context, incidentID, service, namespace string, startTime time.Time) (*IncidentContext, error) {
	context := &IncidentContext{
		Service:   service,
		Namespace: namespace,
		StartTime: startTime,
	}

	// Run correlations in parallel
	errChan := make(chan error, 4)
	
	// 1. Correlate Kubernetes state
	go func() {
		if err := e.correlateK8sState(ctx, context); err != nil {
			errChan <- fmt.Errorf("k8s correlation failed: %w", err)
		} else {
			errChan <- nil
		}
	}()

	// 2. Correlate metrics
	go func() {
		if err := e.correlateMetrics(ctx, context); err != nil {
			errChan <- fmt.Errorf("metrics correlation failed: %w", err)
		} else {
			errChan <- nil
		}
	}()

	// 3. Correlate logs
	go func() {
		if err := e.correlateLogs(ctx, context); err != nil {
			errChan <- fmt.Errorf("logs correlation failed: %w", err)
		} else {
			errChan <- nil
		}
	}()

	// 4. Analyze root cause
	go func() {
		if err := e.analyzeRootCause(ctx, context); err != nil {
			errChan <- fmt.Errorf("root cause analysis failed: %w", err)
		} else {
			errChan <- nil
		}
	}()

	// Wait for all correlations
	for i := 0; i < 4; i++ {
		if err := <-errChan; err != nil {
			// Log but don't fail entire correlation
			fmt.Printf("Correlation error: %v\n", err)
		}
	}

	// Save correlations to database
	if err := e.saveCorrelations(ctx, incidentID, context); err != nil {
		return context, fmt.Errorf("failed to save correlations: %w", err)
	}

	return context, nil
}

// correlateK8sState correlates Kubernetes state with the incident
func (e *CorrelationEngine) correlateK8sState(ctx context.Context, ic *IncidentContext) error {
	// Get pods
	pods, err := e.k8sClient.GetPods(ctx, ic.Namespace, ic.Service)
	if err == nil {
		ic.AffectedPods = pods
	}

	// Get deployments
	deployments, err := e.k8sClient.GetDeployments(ctx, ic.Namespace, ic.Service)
	if err == nil {
		for _, dep := range deployments {
			if dep.Ready < dep.Replicas {
				ic.RootCauses = append(ic.RootCauses, 
					fmt.Sprintf("Deployment %s has insufficient ready replicas: %d/%d", 
						dep.Name, dep.Ready, dep.Replicas))
			}
		}
	}

	// Get events
	events, err := e.k8sClient.GetEvents(ctx, ic.Namespace, ic.Service, ic.StartTime.Add(-10*time.Minute))
	if err == nil {
		ic.K8sEvents = events
		
		for _, event := range events {
			if event.Type == "Warning" {
				ic.RootCauses = append(ic.RootCauses, 
					fmt.Sprintf("K8s Warning: %s - %s", event.Reason, event.Message))
			}
		}
	}

	// Detect pod issues
	issues, err := e.k8sClient.DetectPodIssues(ctx, ic.Namespace, ic.Service)
	if err == nil {
		ic.RootCauses = append(ic.RootCauses, issues...)
	}

	return nil
}

// correlateMetrics correlates metrics with the incident
func (e *CorrelationEngine) correlateMetrics(ctx context.Context, ic *IncidentContext) error {
	window := 5 * time.Minute

	// Check availability
	availability, err := e.promClient.GetServiceAvailability(ctx, ic.Service, window)
	if err == nil && availability < 99.0 {
		ic.RootCauses = append(ic.RootCauses, 
			fmt.Sprintf("Low availability: %.2f%%", availability))
	}

	// Check error rate
	errorRate, err := e.promClient.GetErrorRate(ctx, ic.Service, window)
	if err == nil && errorRate > 1.0 {
		ic.RootCauses = append(ic.RootCauses, 
			fmt.Sprintf("High error rate: %.2f%%", errorRate))
	}

	// Check latency
	latency, err := e.promClient.GetLatencyP99(ctx, ic.Service, window)
	if err == nil && latency > 1000 {
		ic.RootCauses = append(ic.RootCauses, 
			fmt.Sprintf("High latency: %.0fms", latency))
	}

	// Check CPU
	cpu, err := e.promClient.GetCPUUsage(ctx, ic.Service)
	if err == nil && cpu > 80.0 {
		ic.RootCauses = append(ic.RootCauses, 
			fmt.Sprintf("High CPU usage: %.1f%%", cpu))
	}

	// Check memory
	memory, err := e.promClient.GetMemoryUsage(ctx, ic.Service)
	if err == nil && memory > 1024 {
		ic.RootCauses = append(ic.RootCauses, 
			fmt.Sprintf("High memory usage: %.0fMB", memory))
	}

	// Detect anomalies
	anomalies, err := e.promClient.DetectAnomalies(ctx, ic.Service)
	if err == nil {
		ic.MetricAnomalies = anomalies
		ic.RootCauses = append(ic.RootCauses, anomalies...)
	}

	return nil
}

// correlateLogs correlates logs with the incident
func (e *CorrelationEngine) correlateLogs(ctx context.Context, ic *IncidentContext) error {
	// Get error logs
	errorLogs, err := e.lokiClient.GetErrorLogs(ctx, ic.Service, ic.StartTime.Add(-5*time.Minute), 100)
	if err == nil {
		ic.LogErrors = errorLogs

		// Analyze error patterns
		errorPatterns := make(map[string]int)
		for _, log := range errorLogs {
			// Simple pattern extraction (first 50 chars of error)
			pattern := log.Message
			if len(pattern) > 50 {
				pattern = pattern[:50]
			}
			errorPatterns[pattern]++
		}

		// Add high-frequency errors to root causes
		for pattern, count := range errorPatterns {
			if count > 5 {
				ic.RootCauses = append(ic.RootCauses, 
					fmt.Sprintf("Frequent error pattern (%d occurrences): %s...", count, pattern))
			}
		}
	}

	return nil
}

// analyzeRootCause performs root cause analysis
func (e *CorrelationEngine) analyzeRootCause(ctx context.Context, ic *IncidentContext) error {
	// Analyze patterns and determine most likely root cause
	
	// Priority 1: K8s pod issues
	for _, pod := range ic.AffectedPods {
		if pod.Status != "Running" {
			ic.RootCauses = append([]string{
				fmt.Sprintf("PRIMARY: Pod %s is %s", pod.Name, pod.Status),
			}, ic.RootCauses...)
			break
		}
		if pod.Restarts > 5 {
			ic.RootCauses = append([]string{
				fmt.Sprintf("PRIMARY: Pod %s has excessive restarts (%d)", pod.Name, pod.Restarts),
			}, ic.RootCauses...)
			break
		}
	}

	// Priority 2: Critical K8s events
	for _, event := range ic.K8sEvents {
		if event.Type == "Warning" && strings.Contains(strings.ToLower(event.Reason), "oom") {
			ic.RootCauses = append([]string{
				fmt.Sprintf("PRIMARY: Out of Memory - %s", event.Message),
			}, ic.RootCauses...)
			break
		}
		if event.Type == "Warning" && strings.Contains(strings.ToLower(event.Reason), "backoff") {
			ic.RootCauses = append([]string{
				fmt.Sprintf("PRIMARY: CrashLoopBackOff - %s", event.Message),
			}, ic.RootCauses...)
			break
		}
	}

	// Determine severity based on impact
	if len(ic.AffectedPods) > 0 {
		runningPods := 0
		for _, pod := range ic.AffectedPods {
			if pod.Status == "Running" {
				runningPods++
			}
		}
		
		impactPercent := float64(len(ic.AffectedPods)-runningPods) / float64(len(ic.AffectedPods)) * 100
		
		if impactPercent > 50 {
			ic.Severity = "critical"
		} else if impactPercent > 25 {
			ic.Severity = "high"
		} else if impactPercent > 10 {
			ic.Severity = "medium"
		} else {
			ic.Severity = "low"
		}
	}

	return nil
}

// saveCorrelations saves correlation data to database
func (e *CorrelationEngine) saveCorrelations(ctx context.Context, incidentID string, ic *IncidentContext) error {
	// Save K8s correlations
	if len(ic.AffectedPods) > 0 {
		for _, pod := range ic.AffectedPods {
			confidence := 0.8
			if pod.Status != "Running" {
				confidence = 0.95
			}

			_, err := e.db.ExecContext(ctx, `
				INSERT INTO correlations (incident_id, correlation_type, source_type, source_id, confidence_score, details)
				VALUES ($1, $2, $3, $4, $5, $6)
			`, incidentID, "kubernetes", "pod", pod.Name, confidence, 
				fmt.Sprintf(`{"status": "%s", "restarts": %d}`, pod.Status, pod.Restarts))
			
			if err != nil {
				return err
			}
		}
	}

	// Save metric correlations
	if len(ic.MetricAnomalies) > 0 {
		for _, anomaly := range ic.MetricAnomalies {
			_, err := e.db.ExecContext(ctx, `
				INSERT INTO correlations (incident_id, correlation_type, source_type, source_id, confidence_score, details)
				VALUES ($1, $2, $3, $4, $5, $6)
			`, incidentID, "metrics", "anomaly", anomaly, 0.75, 
				fmt.Sprintf(`{"description": "%s"}`, anomaly))
			
			if err != nil {
				return err
			}
		}
	}

	// Save log correlations
	if len(ic.LogErrors) > 0 {
		_, err := e.db.ExecContext(ctx, `
			INSERT INTO correlations (incident_id, correlation_type, source_type, source_id, confidence_score, details)
			VALUES ($1, $2, $3, $4, $5, $6)
		`, incidentID, "logs", "error_pattern", fmt.Sprintf("%d_errors", len(ic.LogErrors)), 0.70,
			fmt.Sprintf(`{"count": %d}`, len(ic.LogErrors)))
		
		if err != nil {
			return err
		}
	}

	return nil
}

// GetCorrelations retrieves correlations for an incident
func (e *CorrelationEngine) GetCorrelations(ctx context.Context, incidentID string) ([]Correlation, error) {
	rows, err := e.db.QueryContext(ctx, `
		SELECT id, incident_id, correlation_type, source_type, source_id, confidence_score, details, created_at
		FROM correlations
		WHERE incident_id = $1
		ORDER BY confidence_score DESC, created_at DESC
	`, incidentID)
	
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var correlations []Correlation
	for rows.Next() {
		var c Correlation
		var detailsJSON string
		
		err := rows.Scan(&c.ID, &c.IncidentID, &c.Type, &c.SourceType, &c.SourceID, &c.ConfidenceScore, &detailsJSON, &c.CreatedAt)
		if err != nil {
			continue
		}

		// Parse details JSON
		c.Details = make(map[string]interface{})
		// Simplified parsing for this example
		c.Details["raw"] = detailsJSON

		correlations = append(correlations, c)
	}

	return correlations, nil
}