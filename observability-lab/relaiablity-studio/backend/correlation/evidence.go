package correlation

type EvidenceCollector struct {
    // Collects all signals around incident time
}

func (ec *EvidenceCollector) CollectEvidence(incidentID string, timeRange TimeRange) (*Evidence, error) {
    // Parallel fetch from all sources
    metrics := ec.fetchMetrics(timeRange)
    logs := ec.fetchLogs(timeRange)
    traces := ec.fetchTraces(timeRange)
    k8sEvents := ec.fetchK8sEvents(timeRange)
    
    // Correlate by timestamp
    timeline := ec.buildTimeline(metrics, logs, traces, k8sEvents)
    
    // Detect root cause patterns
    rootCause := ec.analyzeRootCause(timeline)
    
    // Calculate blast radius
    impactedServices := ec.calculateBlastRadius(metrics, traces)
    
    return &Evidence{
        Timeline:         timeline,
        RootCause:        rootCause,
        ImpactedServices: impactedServices,
    }, nil
}