package httpx

import "github.com/gofiber/fiber/v3"

// APIError is a structured JSON error envelope.
type APIError struct {
	Error   string `json:"error"`
	Message string `json:"message,omitempty"`
}

// Error returns a structured error response with the given status code.
func Error(c fiber.Ctx, status int, code, message string) error {
	return c.Status(status).JSON(APIError{Error: code, Message: message})
}

// BadRequest responds with 400.
func BadRequest(c fiber.Ctx, message string) error {
	return Error(c, fiber.StatusBadRequest, "bad_request", message)
}

// Unauthorized responds with 401.
func Unauthorized(c fiber.Ctx, message string) error {
	return Error(c, fiber.StatusUnauthorized, "unauthorized", message)
}

// Forbidden responds with 403.
func Forbidden(c fiber.Ctx, message string) error {
	return Error(c, fiber.StatusForbidden, "forbidden", message)
}

// NotFound responds with 404.
func NotFound(c fiber.Ctx, message string) error {
	return Error(c, fiber.StatusNotFound, "not_found", message)
}

// Conflict responds with 409.
func Conflict(c fiber.Ctx, message string) error {
	return Error(c, fiber.StatusConflict, "conflict", message)
}

// Internal responds with 500.
func Internal(c fiber.Ctx, message string) error {
	return Error(c, fiber.StatusInternalServerError, "internal_error", message)
}