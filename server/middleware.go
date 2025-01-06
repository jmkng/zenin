package server

import (
	"errors"
	"fmt"
	"net/http"
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
		err := validateBearerToken(token, false)
		if err != nil {
			responder.Status(http.StatusUnauthorized)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// AuthenticateRoot is similar to Authenticate, but also ensures the account is a root account.
func AuthenticateRoot(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		responder := NewResponder(w)
		header := r.Header.Get(Authorization)

		token := extractBearerToken(header)
		if token == "" {
			responder.Status(http.StatusUnauthorized)
			return
		}
		err := validateBearerToken(token, true)
		if err != nil {
			responder.Status(http.StatusUnauthorized)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// extractBearerToken will extract value of the `Authorization` header,
// with the "Bearer " prefix removed.
//
// Returns "" if no header, or an invalid header, is found.
func extractBearerToken(authorization string) string {
	const prefix = "Bearer "
	if authorization == "" || !strings.HasPrefix(authorization, prefix) {
		return ""
	}

	return strings.TrimPrefix(authorization, prefix)
}

// validateBearerToken returns an error if the bearer token is invalid.
func validateBearerToken(token string, root bool) error {
	options := []jwt.ParserOption{
		jwt.WithExpirationRequired(),
		jwt.WithIssuedAt(),
	}

	parsed, err := jwt.Parse(token, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("invalid signing method: %v", t.Header["Alg"])
		}

		claims, ok := t.Claims.(jwt.MapClaims)
		if !ok {
			return nil, errors.New("unable to read claims")
		}

		if root {
			v, ok := claims["root"]
			if !ok {
				return nil, errors.New("missing root claim")
			}
			vb, ok := v.(bool)
			if !ok {
				return nil, errors.New("malformed root claim")
			}

			if !vb {
				return nil, errors.New("account is not root")
			}
		}

		return []byte(env.Runtime.SignSecret), nil
	}, options...)
	if err != nil {
		return err
	}
	if !parsed.Valid {
		return errors.New("token is invalid")
	}

	return nil
}
