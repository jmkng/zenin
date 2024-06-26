package server

// NewErrorResponse returns a new ErrorResponse.
func NewErrorResponse(errors ...string) ErrorResponse {
	return ErrorResponse{
		Errors: errors,
	}
}

// ErrorResponse is used to send a set of user-friendly error messages.
type ErrorResponse struct {
	Errors []string `json:"errors"`
}
