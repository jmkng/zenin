package env

import "io"

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

// Write will write all messages to a `Writer`.
// Warnings are written first, errors last. If an error occurs while writing, it is returned.
func (d Diagnostic) Write(w io.Writer) error {
	for _, v := range d.Warnings {
		_, err := w.Write([]byte(v))
		if err != nil {
			return err
		}
	}
	for _, v := range d.Errors {
		_, err := w.Write([]byte(v))
		if err != nil {
			return err
		}
	}

	return nil
}

// Fatal returns true if the `Diagnostic` contains any errors.
func (d Diagnostic) Fatal() bool {
	return len(d.Errors) > 0
}
