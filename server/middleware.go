package server

import (
	"net/http"
)

type Middleware = func(http.Handler) http.Handler

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

		//next.ServeHTTP(w, r)
	})
}
