package config

import (
	"os"
	"strconv"
	"strings"
	"time"
)

// Config holds runtime configuration for the API server.
type Config struct {
	Addr              string
	DatabasePath      string
	JWTSecret         []byte
	AccessTokenTTL    time.Duration
	RefreshTokenTTL   time.Duration
	AllowedOrigins    []string
	TrustedProxy      bool
	DisableRateLimit  bool
	ServerArgonTime   uint32
	ServerArgonMemory uint32
	ServerArgonThread uint8
}

// Load reads configuration from environment variables, falling back to
// development-friendly defaults.
func Load() Config {
	return Config{
		Addr:              env("PASSMAN_ADDR", ":8080"),
		DatabasePath:      env("PASSMAN_DB", "passman.db"),
		JWTSecret:         []byte(env("PASSMAN_JWT_SECRET", "dev-insecure-secret-change-me")),
		AccessTokenTTL:    envDuration("PASSMAN_ACCESS_TTL", 15*time.Minute),
		RefreshTokenTTL:   envDuration("PASSMAN_REFRESH_TTL", 30*24*time.Hour),
		AllowedOrigins:    envList("PASSMAN_ALLOWED_ORIGINS", "*"),
		TrustedProxy:      envBool("PASSMAN_TRUSTED_PROXY", false),
		DisableRateLimit:  envBool("PASSMAN_DISABLE_RATE_LIMIT", false),
		ServerArgonTime:   uint32(envInt("PASSMAN_ARGON_TIME", 3)),
		ServerArgonMemory: uint32(envInt("PASSMAN_ARGON_MEMORY", 64*1024)),
		ServerArgonThread: uint8(envInt("PASSMAN_ARGON_THREADS", 2)),
	}
}

func env(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		return v
	}
	return fallback
}

func envList(key, fallback string) []string {
	raw := env(key, fallback)
	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if s := strings.TrimSpace(p); s != "" {
			out = append(out, s)
		}
	}
	if len(out) == 0 {
		return []string{fallback}
	}
	return out
}

func envInt(key string, fallback int) int {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return fallback
}

func envBool(key string, fallback bool) bool {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		if b, err := strconv.ParseBool(v); err == nil {
			return b
		}
	}
	return fallback
}

func envDuration(key string, fallback time.Duration) time.Duration {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		if d, err := time.ParseDuration(v); err == nil {
			return d
		}
	}
	return fallback
}