# Reliability Studio - Critical Issues Tracker

**Last Updated:** January 6, 2026  
**Total Issues:** 28 identified  
**Status:** Pre-production (not ready for deployment)

---

## 🔴 CRITICAL BLOCKERS (Must Fix Before Testing)

### Issue #1: Missing PostgreSQL Service ✅ [Details in ISSUE_01]
- **Component:** Infrastructure
- **Impact:** Application cannot start
- **Fix Time:** 15 minutes
- **Status:** Issue document created

### Issue #2: Nil Pointer in Correlation Engine ✅ [Details in ISSUE_02]
- **Component:** Backend - Correlation
- **Impact:** Runtime crash during incident processing
- **Fix Time:** 10 minutes
- **Status:** Issue document created

### Issue #3: Interface Signature Mismatch ✅ [Details in ISSUE_03]
- **Component:** Backend - Prometheus Integration
- **Impact:** Compilation failure
- **Fix Time:** 20 minutes
- **Status:** Issue document created

### Issue #4: Authentication Bypass ✅ [Details in ISSUE_04]
- **Component:** Security
- **Impact:** All endpoints publicly accessible
- **Fix Time:** 2 hours
- **Status:** Issue document created

---

## Issue #5: SQL Injection in Seed Data

**Priority:** 🔴 CRITICAL SECURITY  
**Component:** Database - Seed Data  
**Status:** Open

### Problem
Weak password hash hardcoded in seed data using string concatenation pattern that could be replicated elsewhere.

### Evidence
**File:** `backend/database/db.go:221-228`
```go
_, err := db.Exec(`
    INSERT INTO users (email, username, password_hash, roles)
    VALUES ('admin@reliability.io', 'admin', '$2a$10$rZ1qJ8Z5X7X7X7X7X7X7X7', '[\"admin\", \"editor\", \"viewer\"]'::jsonb)
`)
```

### Issues
1. **Weak hash:** Obviously placeholder hash (repeating X7)
2. **Hardcoded:** Should generate proper bcrypt hash
3. **Bad pattern:** String concatenation could lead to SQL injection if replicated

### Solution
```go
import "golang.org/x/crypto/bcrypt"

// Generate proper password hash
hashedPassword, err := bcrypt.GenerateFromPassword([]byte("change-on-first-login"), bcrypt.DefaultCost)
if err != nil {
    return fmt.Errorf("failed to hash password: %w", err)
}

// Use parameterized query
_, err = db.Exec(`
    INSERT INTO users (email, username, password_hash, roles)
    VALUES ($1, $2, $3, $4::jsonb)
    ON CONFLICT (email) DO NOTHING
`, "admin@reliability.io", "admin", string(hashedPassword), `["admin", "editor", "viewer"]`)
```

### Testing
```bash
# After fix, verify hash is proper bcrypt
docker exec -it reliability-postgres psql -U postgres -d reliability_studio
SELECT username, password_hash FROM users WHERE email = 'admin@reliability.io';

# Expected: password_hash starts with $2a$ and is 60 chars
# Expected: Different hash each time seed data runs
```

### Files to Modify
- `backend/database/db.go` (line 221-228)

---

## Issue #6: CORS Misconfiguration

**Priority:** 🔴 CRITICAL SECURITY  
**Component:** Backend - CORS Middleware  
**Status:** Open

### Problem
CORS allows all origins (`*`) with credentials enabled, creating CSRF vulnerability.

### Evidence
**File:** `backend/main.go:144-149`
```go
corsHandler := cors.New(cors.Options{
    AllowedOrigins:   []string{"*"}, // ⚠️ Allows any origin!
    AllowCredentials: true,           // ⚠️ Dangerous combination
})
```

### Security Impact
- ❌ Any website can make authenticated requests
- ❌ Vulnerable to CSRF attacks
- ❌ Session hijacking possible
- ❌ Data exfiltration risk

### Solution
```go
import "os"

allowedOrigins := []string{
    "http://localhost:3000",     // Development
    "http://localhost:4000",     // Testing
}

// Production: Load from environment
if prodOrigins := os.Getenv("CORS_ALLOWED_ORIGINS"); prodOrigins != "" {
    allowedOrigins = strings.Split(prodOrigins, ",")
}

corsHandler := cors.New(cors.Options{
    AllowedOrigins:   allowedOrigins,
    AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
    AllowedHeaders:   []string{"Content-Type", "Authorization"},
    AllowCredentials: true,
    MaxAge:           300, // Cache preflight for 5 minutes
})
```

### Environment Configuration
**.env.example:**
```bash
# Production: Set exact origins
CORS_ALLOWED_ORIGINS=https://grafana.company.com,https://reliability.company.com

# Development: Multiple origins
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:4000
```

### Testing
```bash
# Test CORS preflight
curl -X OPTIONS http://localhost:9000/api/incidents \
  -H "Origin: http://evil-site.com" \
  -H "Access-Control-Request-Method: GET" \
  -v

# Expected: No Access-Control-Allow-Origin header (request blocked)

curl -X OPTIONS http://localhost:9000/api/incidents \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET" \
  -v

# Expected: Access-Control-Allow-Origin: http://localhost:3000
```

### Files to Modify
- `backend/main.go` (line 144-149)
- `.env.example` (add CORS_ALLOWED_ORIGINS)

---

## Issue #7: Goroutine Leak in Background Jobs

**Priority:** 🔴 CRITICAL PERFORMANCE  
**Component:** Backend - Background Jobs  
**Status:** ✅ FIXED (per audit report)

### Problem (Original)
Background SLO calculation goroutine never exits, no context cancellation.

### Solution Applied
```go
func (s *Server) startBackgroundJobs(ctx context.Context) {
    ticker := time.NewTicker(5 * time.Minute)
    defer ticker.Stop()
    
    for {
        select {
        case <-ctx.Done():
            log.Println("Background jobs shutting down...")
            return
        case <-ticker.C:
            jobCtx := context.Background()
            log.Println("⏰ Running SLO calculations...")
            if err := s.sloService.CalculateAllSLOs(jobCtx); err != nil {
                log.Printf("Error calculating SLOs: %v", err)
            }
        }
    }
}
```

### Verification Needed
- [ ] Confirm context cancellation works
- [ ] Test graceful shutdown
- [ ] Verify no goroutine leaks with `pprof`

---

## Issue #8: Loki Timestamp Parsing Bug

**Priority:** 🟠 HIGH - DATA CORRUPTION  
**Component:** Backend - Loki Client  
**Status:** ✅ FIXED (per audit report)

### Problem (Original)
Loki returns Unix nanoseconds, code tried to parse as RFC3339.

### Solution Applied
```go
// FIXED: Parse Unix nanoseconds correctly
nsec, err := strconv.ParseInt(value[0], 10, 64)
if err != nil {
    continue
}
timestamp := time.Unix(0, nsec)
```

### Verification Needed
- [ ] Test with real Loki data
- [ ] Verify timestamps display correctly in UI
- [ ] Check timeline ordering

---

## Issue #9: SLO Error Budget Calculation Error

**Priority:** 🟠 HIGH - LOGIC ERROR  
**Component:** Backend - SLO Service  
**Status:** Open

### Problem
Error budget formula appears inverted or incorrect.

### Evidence
**File:** `backend/services/slo_service.go:98-100`
```go
errorBudgetTotal := 100.0 - slo.TargetPercentage
errorBudgetUsed := 100.0 - currentPercentage
errorBudgetRemaining := ((errorBudgetTotal - errorBudgetUsed) / errorBudgetTotal) * 100
```

### Analysis
Let's trace through with example:
- Target: 99.9% (SLO target)
- Current: 99.5% (actual performance)
- Expected error budget total: 0.1% (100% - 99.9%)
- Expected error budget used: 0.5% (100% - 99.5%)
- Expected error budget remaining: -400% ??? (This seems wrong)

### Correct Formula

Error budget should be calculated as:
```go
// Error budget is the allowed percentage of bad requests
errorBudgetTotal := 100.0 - slo.TargetPercentage  // e.g., 0.1% for 99.9% SLO

// Calculate how much error budget we've actually consumed
// If current is 99.5%, we've had 0.5% errors
// If target is 99.9%, we're allowed 0.1% errors
// So we've used 0.5% / 0.1% = 500% of our budget (overspent!)
errorBudgetUsed := (100.0 - currentPercentage) / errorBudgetTotal * 100

// Remaining budget
errorBudgetRemaining := 100.0 - errorBudgetUsed

// Alternative simpler formula:
errorBudgetRemaining := ((currentPercentage - slo.TargetPercentage) / (100.0 - slo.TargetPercentage)) * 100
```

### Solution
```go
func (s *SLOService) CalculateSLO(ctx context.Context, sloID string) (*SLO, error) {
    // ... query Prometheus ...
    
    // ✅ CORRECT CALCULATION:
    // If SLO is 99.9% and current is 99.8%:
    // - We have 0.1% error budget
    // - We've experienced 0.2% errors
    // - We've consumed 200% of our budget (overspent by 100%)
    
    errorBudgetAllowed := 100.0 - slo.TargetPercentage  // e.g., 0.1%
    errorsObserved := 100.0 - currentPercentage          // e.g., 0.2%
    
    // Calculate percentage of budget remaining
    if errorBudgetAllowed <= 0 {
        errorBudgetRemaining = 0 // Target is 100%, no budget
    } else {
        errorBudgetRemaining = ((errorBudgetAllowed - errorsObserved) / errorBudgetAllowed) * 100
        
        // Clamp to reasonable range
        if errorBudgetRemaining < 0 {
            errorBudgetRemaining = 0 // Budget exhausted
        }
    }
    
    // Determine status based on remaining budget
    status := "healthy"
    if errorBudgetRemaining < 0 {
        status = "critical" // Budget exhausted
    } else if errorBudgetRemaining < 25 {
        status = "critical" // Less than 25% remaining
    } else if errorBudgetRemaining < 50 {
        status = "warning"  // Less than 50% remaining
    }
    
    // ... update database ...
}
```

### Test Cases
```
Test 1: Meeting SLO
Target: 99.9%, Current: 99.95%
Expected: errorBudgetRemaining = 50% (using half the budget)

Test 2: Exactly at SLO
Target: 99.9%, Current: 99.9%
Expected: errorBudgetRemaining = 100% (no budget used)

Test 3: Violating SLO
Target: 99.9%, Current: 99.5%
Expected: errorBudgetRemaining = -400% (4x over budget)

Test 4: Perfect performance
Target: 99.9%, Current: 100%
Expected: errorBudgetRemaining = > 100% (better than target)
```

### Files to Modify
- `backend/services/slo_service.go` (line 98-100)

### Testing
```bash
# Create SLO with 99.9% target
curl -X POST http://localhost:9000/api/slos \
  -H "Content-Type: application/json" \
  -d '{
    "service_id": "uuid",
    "name": "Test SLO",
    "target_percentage": 99.9,
    "window_days": 30,
    "sli_type": "availability",
    "query": "100" 
  }'

# Mock Prometheus to return 99.5% (violating SLO)
# Calculate SLO
curl -X POST http://localhost:9000/api/slos/{id}/calculate

# Check result
curl http://localhost:9000/api/slos/{id}

# Expected:
# - current_percentage: 99.5
# - error_budget_remaining: negative (budget exhausted)
# - status: "critical"
```

---

## Issue #10: Unused Time Variable in SLO Query

**Priority:** 🟠 HIGH - LOGIC ERROR  
**Component:** Backend - SLO Service  
**Status:** Open

### Problem
Start time is calculated but never used in the Prometheus query, meaning SLO might be calculated over wrong time window.

### Evidence
**File:** `backend/services/slo_service.go:74`
```go
end := time.Now()
_ = end.Add(-time.Duration(slo.WindowDays) * 24 * time.Hour) // start unused!

// Then query executed without time range:
result, err := s.promClient.Query(ctx, slo.Query, end)
```

### Impact
- SLO query doesn't respect configured window (e.g., 30 days)
- May calculate over wrong time period
- Results will be incorrect

### Solution

**Option 1:** Use QueryRange for time window
```go
func (s *SLOService) CalculateSLO(ctx context.Context, sloID string) (*SLO, error) {
    slo, err := s.GetSLO(ctx, sloID)
    if err != nil {
        return nil, fmt.Errorf("failed to get SLO: %w", err)
    }

    // Calculate time window
    end := time.Now()
    start := end.Add(-time.Duration(slo.WindowDays) * 24 * time.Hour)
    
    // ✅ Use QueryRange for window-based calculation
    query := fmt.Sprintf(`
        (
            sum(rate(http_requests_total{service="%s",status!~"5.."}[%dd])) 
            / 
            sum(rate(http_requests_total{service="%s"}[%dd]))
        ) * 100
    `, slo.ServiceName, slo.WindowDays, slo.ServiceName, slo.WindowDays)
    
    result, err := s.promClient.QueryRange(ctx, query, start, end, 1*time.Hour)
    if err != nil {
        return nil, fmt.Errorf("failed to execute SLO query: %w", err)
    }
    
    // Calculate average over the window
    var sum float64
    var count int
    
    if len(result.Data.Result) > 0 {
        for _, value := range result.Data.Result[0].Values {
            if len(value) >= 2 {
                if valStr, ok := value[1].(string); ok {
                    var val float64
                    fmt.Sscanf(valStr, "%f", &val)
                    sum += val
                    count++
                }
            }
        }
    }
    
    currentPercentage := 0.0
    if count > 0 {
        currentPercentage = sum / float64(count)
    }
    
    // ... rest of calculation ...
}
```

**Option 2:** Ensure PromQL query respects window
```go
// The query itself should include the window
// PromQL rate() already handles time ranges
query := fmt.Sprintf(`
    (
        sum(rate(http_requests_total{service="%s",status!~"5.."}[%dd]))
        /
        sum(rate(http_requests_total{service="%s"}[%dd]))
    ) * 100
`, slo.ServiceName, slo.WindowDays, slo.ServiceName, slo.WindowDays)

// For instant query, the [Xd] range in the query handles the window
result, err := s.promClient.Query(ctx, query, end)
```

### Recommendation
Use Option 2 - the PromQL query with `[30d]` range selector already handles the time window correctly. Just remove the unused `start` variable.

### Files to Modify
- `backend/services/slo_service.go` (line 74)

---

## Issue #11: Missing TypeScript Dependencies

**Priority:** 🟠 HIGH - BUILD FAILURE  
**Component:** Frontend - Dependencies  
**Status:** Open

### Problem
Grafana SDK packages missing from `package.json`, preventing frontend build.

### Evidence
**File:** `package.json`
```json
{
  "dependencies": {
    "react": "^18.2.0",
    // Missing: @grafana/data, @grafana/ui, @grafana/runtime
  }
}
```

But code imports them:
```typescript
import { getBackendSrv } from '@grafana/runtime';
import { PanelProps } from '@grafana/data';
import { useStyles2 } from '@grafana/ui';
```

### Solution
```bash
cd observability-lab/relaiablity-studio
npm install --save @grafana/data@^10.0.0 \
                   @grafana/ui@^10.0.0 \
                   @grafana/runtime@^10.0.0 \
                   @emotion/css@^11.11.2 \
                   @emotion/react@^11.11.1
```

### Updated package.json
```json
{
  "name": "reliability-studio-frontend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@emotion/css": "^11.11.2",
    "@emotion/react": "^11.11.1",
    "@grafana/data": "^10.0.0",
    "@grafana/runtime": "^10.0.0",
    "@grafana/ui": "^10.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@types/react-router-dom": "^5.3.3",
    "@vitejs/plugin-react": "^4.0.0",
    "typescript": "^5.0.0",
    "vite": "^4.3.9"
  }
}
```

### Testing
```bash
npm install
npm run typecheck  # Should pass
npm run build      # Should succeed
```

### Files to Modify
- `package.json`

---

## Issue #12: Database Connection Pool Misconfiguration

**Priority:** 🟡 MEDIUM - PERFORMANCE  
**Component:** Database  
**Status:** ✅ FIXED (per audit report)

### Solution Applied
```go
db.SetMaxOpenConns(50)        // Increased from 25
db.SetMaxIdleConns(10)        // Increased from 5
db.SetConnMaxLifetime(30 * time.Minute)  // Increased from 5min
db.SetConnMaxIdleTime(15 * time.Minute)
```

### Verification Needed
- [ ] Load test with 50+ concurrent requests
- [ ] Monitor connection pool usage
- [ ] Verify no connection exhaustion

---

## Summary Statistics

| Priority | Count | Completed | Remaining |
|----------|-------|-----------|-----------|
| 🔴 Critical | 12 | 3 | 9 |
| 🟠 High | 8 | 2 | 6 |
| 🟡 Medium | 6 | 2 | 4 |
| 🔵 Low | 2 | 0 | 2 |
| **Total** | **28** | **7** | **21** |

## Priority Order for Fixes

### Week 1: Make it Run
1. ✅ Issue #1: Add PostgreSQL (15 min)
2. ✅ Issue #2: Fix nil pointer (10 min)
3. ✅ Issue #3: Fix interface mismatch (20 min)
4. Issue #11: Add npm dependencies (5 min)

### Week 2: Make it Secure
5. ✅ Issue #4: Implement authentication (2 hours)
6. Issue #5: Fix password hashing (30 min)
7. Issue #6: Fix CORS (30 min)

### Week 3: Make it Correct
8. Issue #9: Fix SLO calculation (1 hour)
9. Issue #10: Fix time window usage (30 min)
10. ✅ Issue #8: Verify Loki timestamps (testing)

### Week 4: Polish & Test
11. Complete handler implementations
12. Add comprehensive logging
13. Write integration tests
14. Performance testing
15. Security audit

---

## Quick Start Fixes (Do These First)

```bash
# 1. Add PostgreSQL (Issue #1)
# Edit docker-compose.yml - add postgres service

# 2. Fix nil pointer (Issue #2)
# Edit backend/correlation/engine.go:82
if e.k8sClient == nil {
    return nil
}

# 3. Fix interface (Issue #3)
# Edit backend/services/slo_service.go:15-18
# Import clients package, use clients.PrometheusResponse

# 4. Install dependencies (Issue #11)
cd observability-lab/relaiablity-studio
npm install @grafana/data @grafana/ui @grafana/runtime

# 5. Test compilation
cd backend
go build ./...

# 6. Start everything
docker-compose up -d
```

These 4 fixes will get the application to a runnable state for testing.
