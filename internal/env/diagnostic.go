package env

func NewDiagnostic() Diagnostic {
	return Diagnostic{
		Warnings: []string{},
		Errors:   []string{},
	}
}

// Diagnostic contains a set of diagnostic messages.
// Similar to a joined error, but allows distinguishing between fatal and non-fatal messages.
type Diagnostic struct {
	// Warnings contains a set of non-fatal warning messages.
	Warnings []string
	// Errors contains a set of fatal error messages.
	Errors []string
}

// Warn will add the provided strings to the `Diagnostic` as warnings.
func (d *Diagnostic) Warn(s ...string) {
	d.Warnings = append(d.Warnings, s...)
}

// Error will add the provided strings to the `Diagnostic` as errors.
func (d *Diagnostic) Error(s ...string) {
	d.Errors = append(d.Errors, s...)
}

// Empty returns true if the `Diagnostic` is storing no warnings and errors.
func (d Diagnostic) Empty() bool {
	return len(d.Warnings) == 0 && len(d.Errors) == 0
}

// Report will log all warnings and errors using the global logging mechanism,
// and return true if the `Diagnostic` is fatal.
func (d Diagnostic) Report() bool {
	for _, w := range d.Warnings {
		Warn(w)
	}
	for _, e := range d.Errors {
		Error(e)
	}

	return len(d.Errors) > 0
}