package api

import (
	"github.com/gofiber/fiber/v3"

	"passman/server/internal/middleware"
)

// UserID reads the authenticated user id from request locals.
func UserID(c fiber.Ctx) string { return middleware.UserID(c) }