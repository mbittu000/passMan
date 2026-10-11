package main

import (
	"log"

	"passman/server/internal/api"
	"passman/server/internal/auth"
	"passman/server/internal/config"
	"passman/server/internal/database"
	"passman/server/internal/store"
)

func main() {
	cfg := config.Load()

	db, err := database.Open(cfg.DatabasePath)
	if err != nil {
		log.Fatalf("database: %v", err)
	}
	defer db.Close()

	st := store.New(db)
	tokens := auth.NewTokenIssuer(cfg.JWTSecret, cfg.AccessTokenTTL)
	app := api.NewApp(cfg, st, tokens)

	log.Printf("passMan API listening on %s (db=%s)", cfg.Addr, cfg.DatabasePath)
	if err := app.Listen(cfg.Addr); err != nil {
		log.Fatalf("server: %v", err)
	}
}