package api

import (
	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/cors"
	"github.com/gofiber/fiber/v3/middleware/healthcheck"
	"github.com/gofiber/fiber/v3/middleware/limiter"
	"github.com/gofiber/fiber/v3/middleware/logger"
	"github.com/gofiber/fiber/v3/middleware/recover"
	"github.com/gofiber/fiber/v3/middleware/requestid"

	"passman/server/internal/auth"
	"passman/server/internal/config"
	"passman/server/internal/httpx"
	"passman/server/internal/middleware"
	"passman/server/internal/store"
)

// NewApp wires the Fiber application and returns it ready to listen.
func NewApp(cfg config.Config, st *store.Store, tokens *auth.TokenIssuer) *fiber.App {
	srv := New(cfg, st, tokens)

	app := fiber.New(fiber.Config{
		AppName:   "passman",
		BodyLimit: 8 * 1024 * 1024,
		ErrorHandler: func(c fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			if e, ok := err.(*fiber.Error); ok {
				code = e.Code
			}
			return httpx.Error(c, code, "error", err.Error())
		},
	})

	app.Use(requestid.New())
	app.Use(recover.New())
	app.Use(logger.New(logger.Config{
		Format: "[${time}] ${status} ${latency} ${method} ${path}\n",
	}))
	app.Use(cors.New(cors.Config{
		AllowOrigins: cfg.AllowedOrigins,
		AllowHeaders: []string{"Origin", "Content-Type", "Accept", "Authorization"},
		AllowMethods: []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
	}))

	app.Get("/healthz", healthcheck.New())

	// Rate limit credential endpoints to blunt brute-force attempts.
	var authLimit fiber.Handler = func(c fiber.Ctx) error { return c.Next() }
	if !cfg.DisableRateLimit {
		authLimit = limiter.New(limiter.Config{
			Max:               20,
			Expiration:        60,
			LimiterMiddleware: limiter.SlidingWindow{},
		})
	}

	authGroup := app.Group("/auth")
	authGroup.Post("/params", srv.AuthParams, authLimit)
	authGroup.Post("/register", srv.Register, authLimit)
	authGroup.Post("/login", srv.Login, authLimit)
	authGroup.Post("/refresh", srv.Refresh, authLimit)

	protected := authGroup.Group("", middleware.RequireAuth(tokens))
	protected.Post("/logout", srv.Logout)
	protected.Get("/me", srv.Me)
	protected.Post("/password", srv.ChangePassword)

	vault := app.Group("/vault", middleware.RequireAuth(tokens))
	vault.Get("/", srv.PullVault)
	vault.Get("/sync", srv.SyncVault)
	vault.Post("/items", srv.PushItems)

	return app
}