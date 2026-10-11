package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v3"

	"passman/server/internal/auth"
	"passman/server/internal/httpx"
)

// userIDKey is the locals key used to stash the authenticated user id.
const userIDKey = "passman.userID"

// RequireAuth validates the Bearer access token and stores the user id in
// request locals. Downstream handlers read it with UserID.
func RequireAuth(issuer *auth.TokenIssuer) fiber.Handler {
	return func(c fiber.Ctx) error {
		header := c.Get("Authorization")
		if header == "" || !strings.HasPrefix(header, "Bearer ") {
			return httpx.Unauthorized(c, "missing bearer token")
		}
		raw := strings.TrimSpace(strings.TrimPrefix(header, "Bearer "))
		claims, err := issuer.Parse(raw)
		if err != nil {
			return httpx.Unauthorized(c, "invalid or expired token")
		}
		c.Locals(userIDKey, claims.Subject)
		return c.Next()
	}
}

// UserID reads the authenticated user id from request locals.
func UserID(c fiber.Ctx) string {
	if v, ok := c.Locals(userIDKey).(string); ok {
		return v
	}
	return ""
}