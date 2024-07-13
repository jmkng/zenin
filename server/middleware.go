package server

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
	"github.com/jmkng/zenin/internal/env"
	"github.com/jmkng/zenin/internal/log"
)

func Logger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Info("server request", "remote", r.RemoteAddr, "method", r.Method, "url", r.URL)
		next.ServeHTTP(w, r)
	})
}

// Defaults will set common default headers.
func Defaults(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set(ContentType, ContentTypeApplicationJson)
		next.ServeHTTP(w, r)
	})
}

// Authenticator will ensure the Request Authorization header is valid.
func Authenticator(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		responder := NewResponder(w)
		header := r.Header.Get(Authorization)

		token := extractBearerToken(header)
		if token == "" {
			responder.Status(http.StatusUnauthorized)
			return
		}
		options := []jwt.ParserOption{jwt.WithExpirationRequired(), jwt.WithIssuedAt()}
		parsed, err := jwt.Parse(token, getSigningKey, options...)
		if err != nil {
			responder.Error(err, http.StatusUnauthorized)
			return
		}
		if !parsed.Valid {
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

// getSigningKey returns the sign secret as a slice of bytes.
func getSigningKey(token *jwt.Token) (any, error) {
	if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
		return nil, fmt.Errorf("invalid signing method: %v", token.Header["Alg"])
	}
	return []byte(env.Runtime.SignSecret), nil
}
