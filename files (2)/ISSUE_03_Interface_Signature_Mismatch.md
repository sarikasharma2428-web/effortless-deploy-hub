# Issue #3: Interface Signature Mismatch - PrometheusClient

**Priority:** 🔴 CRITICAL - COMPILATION FAILURE  
**Type:** Bug  
**Component:** Backend - Prometheus Integration  
**Status:** Open  

## Problem

The `PrometheusQueryClient` interface definition in `slo_service.go` doesn't match the actual implementation in `clients/prometheus.go`. This creates a **type mismatch** that will prevent compilation.

## Current Behavior

❌ Code fails to compile with error:
```
cannot use promClient (type *clients.PrometheusClient) as type PrometheusQueryClient in argument:
    *clients.PrometheusClient does not implement PrometheusQueryClient 
    (wrong type for Query method)
        have Query(context.Context, string, time.Time) (*clients.PrometheusResponse, error)
        want Query(context.Context, string, time.Time) (*QueryResult, error)
```

## Expected Behavior

✅ Interface and implementation should have matching signatures  
✅ Code should compile successfully  
✅ SLO service should query Prometheus correctly

## Evidence

### Interface Definition

**File:** `backend/services/slo_service.go:15-18`

```go
type PrometheusQueryClient interface {
    Query(ctx context.Context, query string, timestamp time.Time) (*QueryResult, error)
    //                                        ^^^^^^^^ expects timestamp
    QueryRange(ctx context.Context, query string, start, end time.Time, step time.Duration) (*QueryResult, error)
}
```

### Actual Implementation

**File:** `backend/clients/prometheus.go:42-70`

```go
// Query executes an instant query
func (c *PrometheusClient) Query(ctx context.Context, query string, timestamp time.Time) (*PrometheusResponse, error) {
    //                                                   ^^^^^^^^ accepts timestamp (CORRECT)
    params := url.Values{}
    params.Add("query", query)
    
    if !timestamp.IsZero() {
        params.Add("time", fmt.Sprintf("%d", timestamp.Unix()))
    } else {
        params.Add("time", fmt.Sprintf("%d", time.Now().Unix()))
    }
    // ... implementation
}
```

### Usage in SLO Service

**File:** `backend/services/slo_service.go:70-75`

```go
func (s *SLOService) CalculateSLO(ctx context.Context, sloID string) (*SLO, error) {
    // ...
    
    // Execute Prometheus query
    result, err := s.promClient.Query(ctx, slo.Query, end)
    //                                                  ^^^ passing timestamp (CORRECT)
    
    // ... parse result
}
```

## Root Cause

There are **THREE issues**:

1. **Return type mismatch**: Interface expects `*QueryResult`, implementation returns `*PrometheusResponse`
2. **Inconsistent naming**: Should both use same type name
3. **The interface was defined locally** when it should import the actual client types

## Solution

### Option 1: Import Client Types (Recommended)

**File:** `backend/services/slo_service.go`

```go
package services

import (
    "context"
    "database/sql"
    "fmt"
    "time"
    "github.com/sarikasharma2428-web/reliability-studio/clients"
)

type SLOService struct {
    db         *sql.DB
    promClient PrometheusQueryClient
}

// ✅ FIX: Use actual client types
type PrometheusQueryClient interface {
    Query(ctx context.Context, query string, timestamp time.Time) (*clients.PrometheusResponse, error)
    QueryRange(ctx context.Context, query string, start, end time.Time, step time.Duration) (*clients.PrometheusResponse, error)
}

// Update parsing code to use clients.PrometheusResponse
func (s *SLOService) CalculateSLO(ctx context.Context, sloID string) (*SLO, error) {
    // Get SLO configuration
    slo, err := s.GetSLO(ctx, sloID)
    if err != nil {
        return nil, fmt.Errorf("failed to get SLO: %w", err)
    }

    // Calculate time window
    end := time.Now()

    // Execute Prometheus query
    result, err := s.promClient.Query(ctx, slo.Query, end)
    if err != nil {
        return nil, fmt.Errorf("failed to execute SLO query: %w", err)
    }

    // ✅ Parse PrometheusResponse correctly
    if len(result.Data.Result) == 0 {
        return nil, fmt.Errorf("no data returned from SLO query")
    }

    if len(result.Data.Result[0].Value) < 2 {
        return nil, fmt.Errorf("invalid response format")
    }

    valueStr, ok := result.Data.Result[0].Value[1].(string)
    if !ok {
        return nil, fmt.Errorf("invalid value type in result")
    }

    var currentPercentage float64
    if _, err := fmt.Sscanf(valueStr, "%f", &currentPercentage); err != nil {
        return nil, fmt.Errorf("failed to parse SLO value: %w", err)
    }

    // Calculate error budget
    errorBudgetTotal := 100.0 - slo.TargetPercentage
    errorBudgetUsed := 100.0 - currentPercentage
    errorBudgetRemaining := ((errorBudgetTotal - errorBudgetUsed) / errorBudgetTotal) * 100

    // Determine status
    status := "healthy"
    if currentPercentage < slo.TargetPercentage {
        if errorBudgetRemaining < 25 {
            status = "critical"
        } else if errorBudgetRemaining < 50 {
            status = "warning"
        }
    }

    // Update SLO in database
    _, err = s.db.ExecContext(ctx, `
        UPDATE slos 
        SET current_percentage = $1,
            error_budget_remaining = $2,
            status = $3,
            last_calculated_at = $4,
            updated_at = $4
        WHERE id = $5
    `, currentPercentage, errorBudgetRemaining, status, time.Now(), sloID)

    if err != nil {
        return nil, fmt.Errorf("failed to update SLO: %w", err)
    }

    // Return updated SLO
    slo.CurrentPercentage = currentPercentage
    slo.ErrorBudgetRemaining = errorBudgetRemaining
    slo.Status = status
    slo.LastCalculatedAt = time.Now()

    return slo, nil
}
```

### Option 2: Remove Interface, Use Concrete Type

```go
type SLOService struct {
    db         *sql.DB
    promClient *clients.PrometheusClient  // ✅ Use concrete type
}

func NewSLOService(db *sql.DB, promClient *clients.PrometheusClient) *SLOService {
    return &SLOService{
        db:         db,
        promClient: promClient,
    }
}
```

**Recommendation:** Use Option 1 (interface with correct types) for better testability.

## Impact

**Severity: CRITICAL**
- 🚫 Code won't compile
- 🚫 Cannot test SLO calculations
- 🚫 Cannot deploy application
- ⚠️ Blocks all SLO-related features

## Testing

After fix:

```bash
# 1. Verify compilation
cd backend
go build ./...

# Expected: No errors

# 2. Test SLO creation
curl -X POST http://localhost:9000/api/slos \
  -H "Content-Type: application/json" \
  -d '{
    "service_id": "uuid-here",
    "name": "API Availability",
    "target_percentage": 99.9,
    "window_days": 30,
    "sli_type": "availability",
    "query": "sum(rate(http_requests_total{status!~\"5..\"}[5m])) / sum(rate(http_requests_total[5m])) * 100"
  }'

# Expected: SLO created successfully

# 3. Test SLO calculation
curl -X POST http://localhost:9000/api/slos/{slo-id}/calculate

# Expected: Current percentage calculated
# Expected: Error budget calculated
# Expected: Status determined (healthy/warning/critical)

# 4. Verify database update
docker exec -it reliability-postgres psql -U postgres -d reliability_studio
SELECT id, name, current_percentage, error_budget_remaining, status FROM slos;

# Expected: Values populated correctly
```

## Files to Modify

1. `backend/services/slo_service.go` - Update interface definition (line 15-18)
2. `backend/services/slo_service.go` - Update result parsing (line 82-95)

## Related Issues

- Blocks Issue #9 (SLO calculation logic errors - can't test until this compiles)
- Related to Issue #10 (unused time variable in SLO calculation)

## Additional Context

From `AUDIT_REPORT.md`:
> **CRITICAL ISSUE #7:** Interface signature mismatch between PrometheusClient interface (expects timestamp parameter) and actual implementation. This causes compilation failure.

## Acceptance Criteria

- [ ] Interface signature matches implementation
- [ ] Code compiles without errors
- [ ] SLO service successfully creates PrometheusClient
- [ ] Query() method works with timestamp parameter
- [ ] QueryRange() method works correctly
- [ ] SLO calculation completes successfully
- [ ] Error budget calculation uses correct data
- [ ] Status determination logic works
- [ ] Database update succeeds
- [ ] Add unit tests for SLO calculation

## Code Review Checklist

- [ ] Interface and implementation signatures match exactly
- [ ] Return types are consistent
- [ ] All imports are correct
- [ ] Error handling is comprehensive
- [ ] Type assertions are safe (check length before indexing)
- [ ] Nil checks where needed
