package server

import (
	"net/http"

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
		panic("todo: authentication middleware")

		//authorization := r.Header.Get(Authorization)
		//if !account.ValidateBearerToken(authorization) {
		// ...
		//
		//}

		// next.ServeHTTP(w, r)
	})
}
