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

var JWT_SECRET = []byte(getEnv("JWT_SECRET", "reliability-studio-super-secret-key"))

type Claims struct {
	UserID   string   `json:"user_id"`
	Username string   `json:"username"`
	Roles    []string `json:"roles"`
	jwt.RegisteredClaims
}

type UserContextKey string

const UserContext UserContextKey = "user"

// Auth middleware - FIXED: Now performs real JWT validation
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

		// Add user to context for downstream handlers
		ctx := context.WithValue(r.Context(), UserContext, claims)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// Logging middleware
func Logging(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()
        wrapped := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}
        next.ServeHTTP(wrapped, r)
        
        duration := time.Since(start)
        log.Printf("📊 %s %s %d %v", r.Method, r.URL.Path, wrapped.statusCode, duration)
    })
}

// Recovery middleware - IMPROVED: Better panic handling
func Recovery(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        defer func() {
            if err := recover(); err != nil {
                log.Printf("🚨 PANIC RECOVERED: %v\nPath: %s %s", err, r.Method, r.URL.Path)
                
                w.Header().Set("Content-Type", "application/json")
                w.WriteHeader(http.StatusInternalServerError)
                json.NewEncoder(w).Encode(map[string]string{
                    "error": "Internal server error",
                    "message": "An unexpected error occurred",
                })
            }
        }()
        next.ServeHTTP(w, r)
    })
}

// RateLimit middleware - IMPROVED: Added basic rate limiting structure
func RateLimit(requestsPerMinute int) func(http.Handler) http.Handler {
    // TODO: Implement proper rate limiting with token bucket or sliding window
    // For now, this is a placeholder
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            // Rate limiting logic would go here
            // Example: Check client IP against rate limit store
            // if exceeded, return 429 Too Many Requests
            next.ServeHTTP(w, r)
        })
    }
}

// LoginHandler - Real authentication with database and JWT
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

// RegisterHandler - Real registration with password hashing
func RegisterHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Username string `json:"username"`
			Email    string `json:"email"`
			Password string `json:"password"`
		}
		
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			respondError(w, http.StatusBadRequest, "Invalid request format")
			return
		}

		if req.Username == "" || req.Email == "" || req.Password == "" {
			respondError(w, http.StatusBadRequest, "All fields are required")
			return
		}
		
		// Hash password
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			respondError(w, http.StatusInternalServerError, "Failed to process password")
			return
		}

		// Default role: viewer
		rolesJSON := `["viewer"]`

		// Insert into database
		var userID string
		err = db.QueryRow(`
			INSERT INTO users (username, email, password_hash, roles)
			VALUES ($1, $2, $3, $4::jsonb)
			RETURNING id
		`, req.Username, req.Email, string(hashedPassword), rolesJSON).Scan(&userID)

		if err != nil {
			if strings.Contains(err.Error(), "unique_violation") || strings.Contains(err.Error(), "duplicate key") {
				respondError(w, http.StatusConflict, "Username or email already exists")
				return
			}
			log.Printf("Registration error: %v", err)
			respondError(w, http.StatusInternalServerError, "Registration failed")
			return
		}
		
		respondJSON(w, http.StatusCreated, map[string]interface{}{
			"status":   "user created",
			"user_id":  userID,
			"username": req.Username,
		})
	}
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
				if role == "admin" || role == requiredRole { // Admin can do anything
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

// Internal helper for JSON errors
func respondError(w http.ResponseWriter, code int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(map[string]string{"error": message})
}

// Internal helper for JSON responses
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

// Response writer wrapper for status code tracking
type responseWriter struct {
    http.ResponseWriter
    statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
    rw.statusCode = code
    rw.ResponseWriter.WriteHeader(code)
}