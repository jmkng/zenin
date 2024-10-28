package graphics

import "fmt"

const (
	reset = "\033[0m"

	black         = "\033[30m"
	red           = "\033[31m"
	green         = "\033[32m"
	yellow        = "\033[33m"
	blue          = "\033[34m"
	magenta       = "\033[35m"
	cyan          = "\033[36m"
	white         = "\033[37m"
	brightBlack   = "\033[90m"
	brightRed     = "\033[91m"
	brightGreen   = "\033[92m"
	brightYellow  = "\033[93m"
	brightBlue    = "\033[94m"
	brightMagenta = "\033[95m"
	brightCyan    = "\033[96m"
	brightWhite   = "\033[97m"

	bgBlack         = "\033[40m"
	bgRed           = "\033[41m"
	bgGreen         = "\033[42m"
	bgYellow        = "\033[43m"
	bgBlue          = "\033[44m"
	bgMagenta       = "\033[45m"
	bgCyan          = "\033[46m"
	bgWhite         = "\033[47m"
	bgBrightBlack   = "\033[100m"
	bgBrightRed     = "\033[101m"
	bgBrightGreen   = "\033[102m"
	bgBrightYellow  = "\033[103m"
	bgBrightBlue    = "\033[104m"
	bgBrightMagenta = "\033[105m"
	bgBrightCyan    = "\033[106m"
	bgBrightWhite   = "\033[107m"
)

// MagentaC will conditionally apply the magenta ANSI color code to the provided string.
func MagentaC(s string, c bool) string {
	return ColorC(s, magenta, c)
}

// BlueC will conditionally apply the blue ANSI color code to the provided string.
func BlueC(s string, c bool) string {
	return ColorC(s, blue, c)
}

// CyanC will conditionally apply the cyan ANSI color code to the provided string.
func CyanC(s string, c bool) string {
	return ColorC(s, cyan, c)
}

// YellowC will conditionally apply the yellow ANSI color code to the provided string.
func YellowC(s string, c bool) string {
	return ColorC(s, yellow, c)
}

// RedC will conditionally apply the red ANSI color code to the provided string.
func RedC(s string, c bool) string {
	return ColorC(s, red, c)
}

// BrightBlackC will conditionally apply the bright black ANSI color code to the provided string.
func BrightBlackC(s string, c bool) string {
	return ColorC(s, brightBlack, c)
}

// ColorC will conditionally apply an ANSI color code to the provided string.
func ColorC(s string, code string, c bool) string {
	if c {
		return fmt.Sprintf("%v%v%v", code, s, reset)
	}
	return s
}
