# Issue #2: Nil Pointer Dereference in Correlation Engine

**Priority:** 🔴 CRITICAL - RUNTIME CRASH  
**Type:** Bug  
**Component:** Backend - Correlation Engine  
**Status:** Open  

## Problem

The correlation engine can crash with a nil pointer dereference panic when attempting to correlate Kubernetes state. The `k8sClient` can be `nil` (when Kubernetes is unavailable or not configured), but the code attempts to use it without checking.

## Current Behavior

When an incident is created and correlation starts:
1. `CorrelateIncident()` is called
2. `correlateK8sState()` is invoked
3. Code attempts `e.k8sClient.GetPods()` without nil check
4. ❌ **PANIC:** nil pointer dereference
5. ❌ Application crashes

## Expected Behavior

When Kubernetes client is unavailable:
1. Correlation should skip Kubernetes state gracefully
2. Log a debug message about K8s being unavailable
3. Continue with other correlations (metrics, logs, traces)
4. Return success without panic

## Evidence

**File:** `backend/correlation/engine.go:82-88`

```go
func (e *CorrelationEngine) correlateK8sState(ctx context.Context, ic *IncidentContext) error {
    // ❌ BUG: k8sClient could be nil!
    pods, err := e.k8sClient.GetPods(ctx, ic.Namespace, ic.Service)
    // ^ PANIC if k8sClient is nil
    
    if err == nil {
        ic.AffectedPods = pods
    }
    return nil
}
```

**File:** `backend/main.go:64-67`

The client can be nil:
```go
k8sClient, err := clients.NewKubernetesClient()
if err != nil {
    log.Printf("Warning: Failed to initialize K8s client: %v", err)
    k8sClient = nil // ⚠️ Client is set to nil
}
```

**File:** `backend/correlation/engine.go:58`

Engine is created with potentially nil client:
```go
correlationEngine := correlation.NewCorrelationEngine(db, promClient, k8sClient, lokiClient)
// k8sClient can be nil here
```

## Impact

**Severity: CRITICAL**
- 🚫 Application crashes when processing incidents
- 🚫 No graceful degradation
- 🚫 Users in non-Kubernetes environments cannot use the plugin
- 🚫 Development environment crashes if K8s not available
- ⚠️ Correlation engine becomes unusable

## Reproduction Steps

1. Start application without Kubernetes configured
2. Create an incident via API:
```bash
curl -X POST http://localhost:9000/api/incidents \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Incident",
    "severity": "high",
    "service": "test-service"
  }'
```
3. Backend attempts correlation
4. ❌ PANIC: `runtime error: invalid memory address or nil pointer dereference`

## Root Cause

The correlation engine doesn't check if optional clients are available before using them. Kubernetes is an **optional** integration (not all users run K8s), but the code treats it as required.

## Solution

### Option 1: Nil Check (Recommended)

**File:** `backend/correlation/engine.go:82-88`

```go
func (e *CorrelationEngine) correlateK8sState(ctx context.Context, ic *IncidentContext) error {
    // ✅ FIX: Check if k8sClient is available
    if e.k8sClient == nil {
        // K8s integration is optional - skip gracefully
        return nil
    }
    
    pods, err := e.k8sClient.GetPods(ctx, ic.Namespace, ic.Service)
    if err == nil {
        ic.AffectedPods = pods
        
        // Add K8s correlations if pods are unhealthy
        for _, pod := range pods {
            if pod.Status != "Running" {
                ic.Correlations = append(ic.Correlations, Correlation{
                    Type:            "infrastructure",
                    SourceType:      "kubernetes",
                    SourceID:        pod.Name,
                    ConfidenceScore: 0.95,
                    Details: map[string]interface{}{
                        "status": pod.Status,
                        "reason": "Pod unhealthy",
                    },
                })
            }
        }
    }
    return nil
}
```

### Option 2: Interface with No-Op Implementation

Create a null object pattern:

```go
type NullK8sClient struct{}

func (n *NullK8sClient) GetPods(ctx context.Context, namespace, service string) ([]PodStatus, error) {
    return nil, nil
}

// In main.go:
if k8sClient == nil {
    k8sClient = &NullK8sClient{}
}
```

**Recommendation:** Use Option 1 (simple nil check) for clarity.

## Additional Fixes Needed

**File:** `backend/correlation/engine.go:68-78`

The main `CorrelateIncident` function should also handle errors better:

```go
func (e *CorrelationEngine) CorrelateIncident(ctx context.Context, incidentID, service, namespace string, startTime time.Time) (*IncidentContext, error) {
    ic := &IncidentContext{
        Service:   service,
        Namespace: namespace,
        StartTime: startTime,
    }

    // ✅ IMPROVED: Log errors instead of silently ignoring
    if err := e.correlateK8sState(ctx, ic); err != nil {
        fmt.Printf("Warning: Failed to correlate K8s state: %v\n", err)
    }
    if err := e.correlateMetrics(ctx, ic); err != nil {
        fmt.Printf("Warning: Failed to correlate metrics: %v\n", err)
    }
    if err := e.correlateLogs(ctx, ic); err != nil {
        fmt.Printf("Warning: Failed to correlate logs: %v\n", err)
    }
    if err := e.analyzeRootCause(ctx, ic); err != nil {
        fmt.Printf("Warning: Failed to analyze root cause: %v\n", err)
    }

    // Save correlations to database
    if err := e.saveCorrelations(ctx, incidentID, ic); err != nil {
        return ic, fmt.Errorf("failed to save correlations: %w", err)
    }

    return ic, nil
}
```

## Testing

### Test Case 1: Without Kubernetes
```bash
# Don't start Kubernetes
# Start backend
go run main.go

# Create incident
curl -X POST http://localhost:9000/api/incidents \
  -H "Content-Type: application/json" \
  -d '{"title": "Test", "severity": "high", "service": "api"}'

# Expected: Success (no crash)
# Expected: Correlation completes without K8s data
```

### Test Case 2: With Kubernetes
```bash
# Start Kubernetes
minikube start

# Start backend
go run main.go

# Create incident
curl -X POST http://localhost:9000/api/incidents \
  -H "Content-Type: application/json" \
  -d '{"title": "Test", "severity": "high", "service": "api"}'

# Expected: Success
# Expected: Correlation includes K8s pod data
```

### Test Case 3: Kubernetes Becomes Unavailable
```bash
# Start with K8s
# Stop K8s mid-operation
minikube stop

# Create incident
# Expected: Graceful handling (no crash)
```

## Files to Modify

1. `backend/correlation/engine.go` - Add nil checks in:
   - `correlateK8sState()` (line 82)
   - `CorrelateIncident()` - improve error logging (line 68-78)

## Related Issues

- Depends on Issue #1 (needs database to test correlations)
- Related to Issue #15 (incomplete handler implementations)

## Acceptance Criteria

- [ ] Add nil check in `correlateK8sState()` before using `k8sClient`
- [ ] Application doesn't crash when K8s is unavailable
- [ ] Correlation completes successfully without K8s
- [ ] Debug log message when K8s correlation is skipped
- [ ] Test with K8s disabled
- [ ] Test with K8s enabled
- [ ] Test with K8s becoming unavailable during operation
- [ ] Update correlation status to show "K8s: not available" in UI

## Additional Context

From `AUDIT_REPORT.md`:
> **CRITICAL ISSUE #2:** `k8sClient` can be nil but used without checking in `correlation/engine.go:82-88`. This causes runtime panic during incident correlation.

This is a **defensive programming** issue - optional dependencies should always be checked before use.
