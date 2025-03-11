package server

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/golang-jwt/jwt/v5"
	"github.com/jmkng/zenin/internal/env"
)

// Log will log incoming requests.
func Log(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		env.Info("server request", "remote", r.RemoteAddr, "method", r.Method, "url", r.URL)
		next.ServeHTTP(w, r)
	})
}

// Default will set common default headers.
func Default(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set(ContentType, ContentTypeApplicationJson)
		next.ServeHTTP(w, r)
	})
}

// Insecure adds headers that are insecure, but may be necessary in development.
func Insecure(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		// Preflight
		if r.Method == http.MethodOptions {
			return
		}

		next.ServeHTTP(w, r)
	})
}

type Token struct {
	Root bool
	Id   int
}

type ContextKey int

const (
	// A context key used to extract the authentication token.
	TokenKey ContextKey = iota
)

// Authenticate will ensure the Request Authorization header is valid.
func Authenticate(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		responder := NewResponder(w)
		header := r.Header.Get(Authorization)

		token := extractBearerToken(header)
		if token == "" {
			responder.Status(http.StatusUnauthorized)
			return
		}

		claims, err := parseAndValidateToken(token)
		if err != nil {
			responder.Status(http.StatusUnauthorized)
			return
		}

		// Add claims to request context.
		root, err := extractRootClaim(claims)
		if err != nil {
			responder.Status(http.StatusUnauthorized)
			return
		}
		sub, err := extractSubClaim(claims)
		if err != nil {
			responder.Status(http.StatusUnauthorized)
			return
		}

		ctx := context.WithValue(r.Context(), TokenKey, Token{Root: root, Id: sub})
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// extractBearerToken will extract the value of the `Authorization` header,
// return it with the "Bearer " prefix removed.
//
// Returns an empty string if no header (or an invalid header) is found.
func extractBearerToken(authorization string) string {
	const prefix = "Bearer "
	if authorization == "" || !strings.HasPrefix(authorization, prefix) {
		return ""
	}

	return strings.TrimPrefix(authorization, prefix)
}

// parseAndValidateToken validates the token and returns the claims.
func parseAndValidateToken(token string) (jwt.MapClaims, error) {
	options := []jwt.ParserOption{jwt.WithExpirationRequired(), jwt.WithIssuedAt()}

	parsed, err := jwt.Parse(token, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("invalid signing method: %v", t.Header["alg"])
		}
		return []byte(env.Env.SignSecret), nil
	}, options...)
	if err != nil || !parsed.Valid {
		return nil, errors.New("invalid token")
	}

	claims, ok := parsed.Claims.(jwt.MapClaims)
	if !ok {
		return nil, errors.New("invalid claims")
	}

	return claims, nil
}

// extractRootClaim returns the "root" claim.
func extractRootClaim(claims jwt.MapClaims) (bool, error) {
	rootClaim, exists := claims["root"]
	if !exists {
		return false, errors.New("missing root claim")
	}

	root, ok := rootClaim.(bool)
	if !ok {
		return false, errors.New("malformed root claim")
	}

	return root, nil
}

// extractSubClaim returns the "sub" claim, which contains the unique id of the account.
func extractSubClaim(claims jwt.MapClaims) (int, error) {
	subClaim, exists := claims["sub"]
	if !exists {
		return -1, errors.New("missing sub claim")
	}

	var sub int
	switch v := subClaim.(type) {
	case string:
		parsedID, err := strconv.Atoi(v)
		if err != nil {
			return -1, fmt.Errorf("invalid sub claim: %v", err)
		}
		sub = parsedID
	case int:
		sub = v
	default:
		return -1, errors.New("malformed sub claim")
	}

	return sub, nil
}
