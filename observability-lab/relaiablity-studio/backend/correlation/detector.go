package correlation

import (
    "context"
    "time"
    "go.uber.org/zap"
    "reliability-control-plane-backend/services"
    "reliability-control-plane-backend/models"
)

type Detector struct {
    logger           *zap.Logger
    prometheusClient *services.PrometheusClient
    lokiClient       *services.LokiClient
    k8sClient        *services.K8sClient
    incidentService  *services.IncidentService
}

func NewDetector() *Detector {
    return &Detector{
        logger:           zap.L(),
        prometheusClient: services.NewPrometheusClient(),
        lokiClient:       services.NewLokiClient(),
        k8sClient:        services.NewK8sClient(),
        incidentService:  services.NewIncidentService(),
    }
}

func (d *Detector) Start() {
    ctx := context.Background()
    ticker := time.NewTicker(30 * time.Second)
    defer ticker.Stop()
    
    d.logger.Info("Starting automated incident detection")
    
    for {
        select {
        case <-ticker.C:
            d.runDetection(ctx)
        case <-ctx.Done():
            return
        }
    }
}

func (d *Detector) runDetection(ctx context.Context) {
    // Check for high error rates
    if anomaly := d.detectErrorRateSpike(ctx); anomaly != nil {
        d.createIncidentFromAnomaly(ctx, anomaly)
    }
    
    // Check for pod crashes
    if pods := d.detectPodCrashes(ctx); len(pods) > 0 {
        d.createIncidentFromPodCrashes(ctx, pods)
    }
    
    // Check for log error spikes
    if spike := d.detectLogErrorSpike(ctx); spike != nil {
        d.createIncidentFromLogSpike(ctx, spike)
    }
}

func (d *Detector) detectErrorRateSpike(ctx context.Context) *Anomaly {
    query := `
        sum(rate(http_requests_total{status=~"5.."}[5m])) 
        / 
        sum(rate(http_requests_total[5m])) > 0.05
    `
    
    result, err := d.prometheusClient.Query(ctx, query)
    if err != nil {
        d.logger.Error("Failed to query Prometheus", zap.Error(err))
        return nil
    }
    
    if len(result.Data.Result) > 0 {
        return &Anomaly{
            Type:    "high_error_rate",
            Metric:  "http_requests_total",
            Value:   result.Data.Result[0].Value[1],
            Labels:  result.Data.Result[0].Metric,
        }
    }
    
    return nil
}

func (d *Detector) createIncidentFromAnomaly(ctx context.Context, anomaly *Anomaly) {
    // Create incident automatically
    incident := models.CreateIncidentRequest{
        Title:       "High Error Rate Detected",
        Description: fmt.Sprintf("Error rate spike detected: %v", anomaly.Value),
        Severity:    "high",
        ServiceIDs:  []string{anomaly.Labels["service"]},
    }
    
    created, err := d.incidentService.Create(ctx, incident)
    if err != nil {
        d.logger.Error("Failed to create incident", zap.Error(err))
        return
    }
    
    // Add timeline event
    d.incidentService.AddTimelineEvent(ctx, created.ID, models.TimelineEvent{
        Type:        "detection",
        Source:      "automated",
        Title:       "Anomaly detected by correlation engine",
        Description: fmt.Sprintf("Error rate: %v", anomaly.Value),
        Metadata:    anomaly.Labels,
    })
    
    d.logger.Info("Created incident from anomaly", 
        zap.String("incident_id", created.ID.String()),
        zap.String("type", anomaly.Type),
    )
}