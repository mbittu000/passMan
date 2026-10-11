package api

import (
	"strconv"
	"time"

	"github.com/gofiber/fiber/v3"

	"passman/server/internal/httpx"
	"passman/server/internal/models"
)

// PullVault returns all items (including tombstones) for the authenticated user.
// Clients use this once on first sync, then switch to /vault/sync.
func (s *Server) PullVault(c fiber.Ctx) error {
	userID := UserID(c)
	items, err := s.Store.AllItems(userID)
	if err != nil {
		return httpx.Internal(c, "could not load vault")
	}
	return c.JSON(fiber.Map{"items": items, "serverTime": time.Now().Unix()})
}

// SyncVault returns items changed at or after the `since` query parameter.
func (s *Server) SyncVault(c fiber.Ctx) error {
	userID := UserID(c)
	var since int64
	if raw := c.Query("since"); raw != "" {
		v, err := strconv.ParseInt(raw, 10, 64)
		if err != nil {
			return httpx.BadRequest(c, "since must be a unix timestamp")
		}
		since = v
	}
	items, err := s.Store.ItemsSince(userID, since)
	if err != nil {
		return httpx.Internal(c, "could not sync vault")
	}
	return c.JSON(fiber.Map{"items": items, "serverTime": time.Now().Unix()})
}

type pushRequest struct {
	Items []models.Item `json:"items"`
}

// PushItems performs a batch upsert of encrypted items (last-write-wins).
func (s *Server) PushItems(c fiber.Ctx) error {
	userID := UserID(c)
	var req pushRequest
	if err := c.Bind().Body(&req); err != nil {
		return httpx.BadRequest(c, "invalid request body")
	}
	if len(req.Items) == 0 {
		return c.JSON(fiber.Map{"accepted": 0, "serverTime": time.Now().Unix()})
	}
	if len(req.Items) > 500 {
		return httpx.BadRequest(c, "batch too large (max 500 items)")
	}
	now := time.Now().Unix()
	for i := range req.Items {
		it := &req.Items[i]
		if it.ID == "" || it.Ciphertext == "" {
			return httpx.BadRequest(c, "each item requires id and ciphertext")
		}
		if it.Version == 0 {
			it.Version = 1
		}
		if it.UpdatedAt == 0 {
			it.UpdatedAt = now
		}
		if it.CreatedAt == 0 {
			it.CreatedAt = it.UpdatedAt
		}
	}
	if err := s.Store.UpsertItems(userID, req.Items); err != nil {
		return httpx.Internal(c, "could not save items")
	}
	return c.JSON(fiber.Map{"accepted": len(req.Items), "serverTime": now})
}