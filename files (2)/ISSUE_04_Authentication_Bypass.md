# Issue #4: Authentication Bypass Vulnerability

**Priority:** 🔴 CRITICAL SECURITY  
**Type:** Security Vulnerability  
**Component:** Backend - Authentication Middleware  
**Status:** Open  
**CVE Risk:** HIGH  

## Problem

The authentication middleware logs a warning when no token is present but **allows the request to proceed anyway**. This means ALL protected endpoints are publicly accessible without authentication.

## Current Behavior

```bash
# No token required - endpoint accessible!
curl http://localhost:9000/api/incidents
# ✅ Returns data (SHOULD BE 401!)

curl http://localhost:9000/api/slos
# ✅ Returns data (SHOULD BE 401!)

curl http://localhost:9000/api/admin/users
# ✅ Returns sensitive data (CRITICAL!)
```

## Expected Behavior

```bash
# Request without token
curl http://localhost:9000/api/incidents
# ❌ 401 Unauthorized

# Request with invalid token
curl -H "Authorization: Bearer fake-token" http://localhost:9000/api/incidents
# ❌ 401 Unauthorized

# Request with valid token
curl -H "Authorization: Bearer <valid-jwt>" http://localhost:9000/api/incidents
# ✅ 200 OK (data returned)
```

## Evidence

**File:** `backend/middleware/middleware.go:12-23`

```go
func Auth(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        token := r.Header.Get("Authorization")
        if token == "" {
            // ❌ BUG: Just logs warning, doesn't block!
            log.Println("Warning: Request without Auth token")
        }
        next.ServeHTTP(w, r) // ⚠️ ALWAYS proceeds - NO VALIDATION!
    })
}
```

**File:** `backend/main.go:116-133`

All API routes use this broken middleware:

```go
// Protected routes
api := router.PathPrefix("/api").Subrouter()
api.Use(middleware.Auth)  // ⚠️ Doesn't actually protect anything!

// These are all accessible without authentication:
api.HandleFunc("/incidents", server.getIncidentsHandler).Methods("GET")
api.HandleFunc("/slos", server.getSLOsHandler).Methods("GET")
api.HandleFunc("/admin/users", server.getUsersHandler).Methods("GET") // 🚨 ADMIN ROUTE!
```

## Security Impact

**Severity: CRITICAL**
- 🚨 **Unauthorized Data Access:** Anyone can view all incidents
- 🚨 **Data Manipulation:** Anyone can create/modify/delete incidents
- 🚨 **Admin Access:** Admin endpoints publicly accessible
- 🚨 **No Audit Trail:** Can't track who made changes
- 🚨 **Compliance Violation:** GDPR, SOC2, ISO27001 requirements broken

### Attack Scenarios

#### Scenario 1: Data Exfiltration
```bash
# Attacker lists all incidents
curl http://victim-company.com:9000/api/incidents

# Attacker downloads all SLO data
curl http://victim-company.com:9000/api/slos

# Attacker accesses user list
curl http://victim-company.com:9000/api/admin/users
```

#### Scenario 2: Data Manipulation
```bash
# Attacker creates fake incident
curl -X POST http://victim-company.com:9000/api/incidents \
  -H "Content-Type: application/json" \
  -d '{
    "title": "FAKE: System Compromised",
    "severity": "critical",
    "service": "production-api"
  }'

# Attacker deletes real incidents
curl -X DELETE http://victim-company.com:9000/api/incidents/{id}

# Attacker modifies SLOs to hide problems
curl -X PATCH http://victim-company.com:9000/api/slos/{id} \
  -d '{"status": "healthy", "error_budget_remaining": 100}'
```

#### Scenario 3: Privilege Escalation
```bash
# Attacker accesses admin functions
curl http://victim-company.com:9000/api/admin/users

# Attacker could potentially create admin accounts
# (if registration endpoint exists)
```

## Root Cause

The middleware was implemented as a **placeholder** with the intention to add real authentication later, but the TODO was never completed.

**File:** `.env.example:28`
```bash
ENABLE_AUTHENTICATION=false  # Set to true when JWT is implemented
# ⚠️ Authentication was never implemented!
```

## Solution

### Implementation Plan

**File:** `backend/middleware/middleware.go`

```go
package middleware

import (
    "context"
    "database/sql"
    "encoding/json"
    "fmt"
    "log"
    "net/http"
    "os"
    "strings"
    "time"

    "github.com/golang-jwt/jwt/v5"
    "golang.org/x/crypto/bcrypt"
)

var JWT_SECRET = []byte(getEnv("JWT_SECRET", "change-this-in-production"))

type Claims struct {
    UserID   string   `json:"user_id"`
    Username string   `json:"username"`
    Roles    []string `json:"roles"`
    jwt.RegisteredClaims
}

type UserContextKey string
const UserContext UserContextKey = "user"

// ✅ FIXED: Auth middleware with real JWT validation
func Auth(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Get Authorization header
        authHeader := r.Header.Get("Authorization")
        if authHeader == "" {
            respondError(w, http.StatusUnauthorized, "Missing authorization token")
            return
        }

        // Check Bearer format
        parts := strings.Split(authHeader, " ")
        if len(parts) != 2 || parts[0] != "Bearer" {
            respondError(w, http.StatusUnauthorized, "Invalid authorization format. Use 'Bearer <token>'")
            return
        }

        tokenString := parts[1]
        claims := &Claims{}

        // Parse and validate token
        token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
            if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
                return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
            }
            return JWT_SECRET, nil
        })

        if err != nil || !token.Valid {
            respondError(w, http.StatusUnauthorized, "Invalid or expired token")
            return
        }

        // ✅ Add user to context for downstream handlers
        ctx := context.WithValue(r.Context(), UserContext, claims)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}

// RequireRole checks if user has required role
func RequireRole(requiredRole string) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            claims, ok := r.Context().Value(UserContext).(*Claims)
            if !ok {
                respondError(w, http.StatusUnauthorized, "Authentication required")
                return
            }

            authorized := false
            for _, role := range claims.Roles {
                if role == "admin" || role == requiredRole {
                    authorized = true
                    break
                }
            }

            if !authorized {
                respondError(w, http.StatusForbidden, fmt.Sprintf("Missing required role: %s", requiredRole))
                return
            }
            
            next.ServeHTTP(w, r)
        })
    }
}

// LoginHandler - Generate JWT tokens
func LoginHandler(db *sql.DB) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        var req struct {
            Username string `json:"username"`
            Password string `json:"password"`
        }
        
        if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
            respondError(w, http.StatusBadRequest, "Invalid request format")
            return
        }
        
        var user struct {
            ID           string
            Username     string
            PasswordHash string
            RolesJSON    string
        }

        err := db.QueryRow(`
            SELECT id, username, password_hash, roles::text 
            FROM users 
            WHERE username = $1 OR email = $1
        `, req.Username).Scan(&user.ID, &user.Username, &user.PasswordHash, &user.RolesJSON)

        if err == sql.ErrNoRows {
            respondError(w, http.StatusUnauthorized, "Invalid credentials")
            return
        } else if err != nil {
            log.Printf("Login error: %v", err)
            respondError(w, http.StatusInternalServerError, "Login failed")
            return
        }

        // Verify password
        if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
            respondError(w, http.StatusUnauthorized, "Invalid credentials")
            return
        }

        var roles []string
        json.Unmarshal([]byte(user.RolesJSON), &roles)

        // Generate JWT
        expirationTime := time.Now().Add(24 * time.Hour)
        claims := &Claims{
            UserID:   user.ID,
            Username: user.Username,
            Roles:    roles,
            RegisteredClaims: jwt.RegisteredClaims{
                ExpiresAt: jwt.NewNumericDate(expirationTime),
            },
        }

        token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
        tokenString, err := token.SignedString(JWT_SECRET)
        if err != nil {
            respondError(w, http.StatusInternalServerError, "Failed to generate token")
            return
        }

        // Update last login
        _, _ = db.Exec("UPDATE users SET last_login = NOW() WHERE id = $1", user.ID)

        respondJSON(w, http.StatusOK, map[string]interface{}{
            "token": tokenString,
            "user": map[string]interface{}{
                "id":       user.ID,
                "username": user.Username,
                "roles":    roles,
            },
        })
    }
}

// Helper functions
func respondError(w http.ResponseWriter, code int, message string) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(code)
    json.NewEncoder(w).Encode(map[string]string{"error": message})
}

func respondJSON(w http.ResponseWriter, code int, payload interface{}) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(code)
    json.NewEncoder(w).Encode(payload)
}

func getEnv(key, fallback string) string {
    if value, ok := os.LookupEnv(key); ok {
        return value
    }
    return fallback
}
```

### Update main.go Routes

**File:** `backend/main.go`

```go
// Public routes
router.HandleFunc("/health", server.healthHandler).Methods("GET")
router.HandleFunc("/api/auth/login", middleware.LoginHandler(db)).Methods("POST")

// Protected routes
api := router.PathPrefix("/api").Subrouter()
api.Use(middleware.Auth)  // ✅ Now actually validates tokens

// Admin routes with role check
admin := api.PathPrefix("/admin").Subrouter()
admin.Use(middleware.RequireRole("admin"))
admin.HandleFunc("/users", server.getUsersHandler).Methods("GET")
```

### Environment Configuration

**File:** `.env.example`

```bash
# Security
JWT_SECRET=generate-with-openssl-rand-hex-32
ENABLE_AUTHENTICATION=true

# Generate strong secret:
# openssl rand -hex 32
```

## Testing

### Test 1: Access Without Token
```bash
curl http://localhost:9000/api/incidents
# Expected: 401 Unauthorized
# Expected: {"error": "Missing authorization token"}
```

### Test 2: Access With Invalid Token
```bash
curl -H "Authorization: Bearer fake-token-123" \
     http://localhost:9000/api/incidents
# Expected: 401 Unauthorized
# Expected: {"error": "Invalid or expired token"}
```

### Test 3: Login and Get Token
```bash
curl -X POST http://localhost:9000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin-password"}'

# Expected: 200 OK
# Expected: {"token": "eyJhbG...", "user": {...}}
```

### Test 4: Access With Valid Token
```bash
TOKEN="<token-from-login>"

curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:9000/api/incidents

# Expected: 200 OK
# Expected: Incident data returned
```

### Test 5: Role-Based Access Control
```bash
# Viewer token accessing admin endpoint
curl -H "Authorization: Bearer $VIEWER_TOKEN" \
     http://localhost:9000/api/admin/users

# Expected: 403 Forbidden
# Expected: {"error": "Missing required role: admin"}

# Admin token accessing admin endpoint
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
     http://localhost:9000/api/admin/users

# Expected: 200 OK
# Expected: User data returned
```

## Files to Modify

1. `backend/middleware/middleware.go` - Implement real JWT validation
2. `backend/main.go` - Add login route, properly protect admin routes
3. `.env.example` - Add JWT_SECRET, update ENABLE_AUTHENTICATION
4. `frontend/src/app/api/backend.ts` - Add token to requests
5. `frontend/src/app/App.tsx` - Implement login UI (already exists!)

## Dependencies

**Add to go.mod:**
```go
require (
    github.com/golang-jwt/jwt/v5 v5.3.0
    golang.org/x/crypto v0.46.0
)
```

## Related Issues

- Blocks production deployment
- Related to Issue #6 (password hashing in seed data)
- Related to Issue #7 (CORS configuration)

## Acceptance Criteria

- [ ] Auth middleware validates JWT tokens
- [ ] Requests without tokens return 401
- [ ] Requests with invalid tokens return 401
- [ ] Requests with expired tokens return 401
- [ ] Login endpoint generates valid tokens
- [ ] Tokens include user ID, username, roles
- [ ] Role-based access control works
- [ ] Admin routes require "admin" role
- [ ] JWT_SECRET loaded from environment
- [ ] Frontend sends token in Authorization header
- [ ] Login UI works end-to-end
- [ ] Password hashing uses bcrypt
- [ ] Token expiration works (24 hours)
- [ ] Last login timestamp updated
- [ ] Security audit passed

## Security Best Practices

- [ ] Use strong JWT secret (32+ bytes, random)
- [ ] Store secret in environment, never commit
- [ ] Hash passwords with bcrypt (cost 10+)
- [ ] Use HTTPS in production
- [ ] Implement rate limiting on login endpoint
- [ ] Add refresh token mechanism
- [ ] Log authentication failures
- [ ] Implement account lockout after failed attempts
- [ ] Add CSRF protection
- [ ] Validate token on every request

## Additional Context

From `AUDIT_REPORT.md`:
> **CRITICAL SECURITY ISSUE #3:** Auth middleware allows unauthenticated requests. Just logs warning, doesn't block. All protected endpoints are publicly accessible.

**This is the #1 security priority** - the application cannot be deployed without fixing this.
