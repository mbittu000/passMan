package api

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"strings"
	"time"

	"github.com/gofiber/fiber/v3"

	"passman/server/internal/auth"
	"passman/server/internal/config"
	"passman/server/internal/crypto"
	"passman/server/internal/httpx"
	"passman/server/internal/models"
	"passman/server/internal/store"
)

// Server bundles the dependencies shared by all HTTP handlers.
type Server struct {
	Cfg    config.Config
	Store  *store.Store
	Tokens *auth.TokenIssuer
}

// New builds a Server.
func New(cfg config.Config, st *store.Store, tokens *auth.TokenIssuer) *Server {
	return &Server{Cfg: cfg, Store: st, Tokens: tokens}
}

type registerRequest struct {
	Email     string `json:"email"`
	AuthHash  string `json:"authHash"`
	KdfSalt   string `json:"kdfSalt"`
	KdfParams string `json:"kdfParams"`
	WrappedKey string `json:"wrappedKey"`
	DeviceName string `json:"deviceName"`
}

type authResponse struct {
	AccessToken  string `json:"accessToken"`
	RefreshToken string `json:"refreshToken"`
	ExpiresIn    int64  `json:"expiresIn"`
	User         *models.User `json:"user"`
	WrappedKey   string `json:"wrappedKey"`
}

// AuthParams returns the non-secret KDF parameters needed to derive the auth
// hash for a given email before authenticating. Unknown emails get random,
// stable-looking parameters so the endpoint does not enumerate accounts.
func (s *Server) AuthParams(c fiber.Ctx) error {
	var req struct {
		Email string `json:"email"`
	}
	if err := c.Bind().Body(&req); err != nil {
		return httpx.BadRequest(c, "invalid request body")
	}
	req.Email = normalizeEmail(req.Email)
	user, err := s.Store.GetUserByEmail(req.Email)
	if err != nil {
		// Deterministic decoy derived from the email so repeated calls agree.
		sum := sha256Hex(req.Email)
		return c.JSON(fiber.Map{
			"kdfSalt":   sum[:32],
			"kdfParams": `{"algorithm":"argon2id","m":65536,"t":3,"p":1,"dkLen":32}`,
			"exists":    false,
		})
	}
	return c.JSON(fiber.Map{
		"kdfSalt":   user.KdfSalt,
		"kdfParams": user.KdfParams,
		"exists":    true,
	})
}

// Register creates a new account and returns an initial token pair.
func (s *Server) Register(c fiber.Ctx) error {
	var req registerRequest
	if err := c.Bind().Body(&req); err != nil {
		return httpx.BadRequest(c, "invalid request body")
	}
	req.Email = normalizeEmail(req.Email)
	if !validEmail(req.Email) {
		return httpx.BadRequest(c, "a valid email is required")
	}
	if len(req.AuthHash) < 16 || req.KdfSalt == "" || req.KdfParams == "" || req.WrappedKey == "" {
		return httpx.BadRequest(c, "missing required key material")
	}

	if _, err := s.Store.GetUserByEmail(req.Email); err == nil {
		return httpx.Conflict(c, "an account with that email already exists")
	} else if !errors.Is(err, store.ErrNotFound) {
		return httpx.Internal(c, "could not check existing account")
	}

	authHash, err := crypto.HashAuthHash(req.AuthHash, s.Cfg.ServerArgonTime, s.Cfg.ServerArgonMemory, s.Cfg.ServerArgonThread)
	if err != nil {
		return httpx.Internal(c, "could not secure credentials")
	}
	id, err := crypto.NewID()
	if err != nil {
		return httpx.Internal(c, "could not create account")
	}
	now := time.Now().Unix()
	user := &models.User{
		ID: id, Email: req.Email, AuthHash: authHash,
		KdfSalt: req.KdfSalt, KdfParams: req.KdfParams, CreatedAt: now,
	}
	if err := s.Store.CreateUser(user); err != nil {
		return httpx.Internal(c, "could not create account")
	}
	if err := s.Store.UpsertVaultKey(&models.VaultKey{
		UserID: id, WrappedKey: req.WrappedKey, CreatedAt: now, UpdatedAt: now,
	}); err != nil {
		return httpx.Internal(c, "could not store vault key")
	}

	return s.issueTokens(c, user, req.WrappedKey, req.DeviceName, fiber.StatusCreated)
}

type loginRequest struct {
	Email      string `json:"email"`
	AuthHash   string `json:"authHash"`
	DeviceName string `json:"deviceName"`
}

// Login verifies credentials and returns a token pair plus the wrapped vault key.
func (s *Server) Login(c fiber.Ctx) error {
	var req loginRequest
	if err := c.Bind().Body(&req); err != nil {
		return httpx.BadRequest(c, "invalid request body")
	}
	req.Email = normalizeEmail(req.Email)
	user, err := s.Store.GetUserByEmail(req.Email)
	if err != nil {
		// Do not reveal whether the account exists.
		return httpx.Unauthorized(c, "invalid email or password")
	}
	if !crypto.VerifyAuthHash(req.AuthHash, user.AuthHash) {
		return httpx.Unauthorized(c, "invalid email or password")
	}
	vk, err := s.Store.GetVaultKey(user.ID)
	if err != nil {
		return httpx.Internal(c, "vault key unavailable")
	}
	return s.issueTokens(c, user, vk.WrappedKey, req.DeviceName, fiber.StatusOK)
}

type refreshRequest struct {
	RefreshToken string `json:"refreshToken"`
	DeviceName   string `json:"deviceName"`
}

// Refresh rotates a refresh token and issues a new access token.
func (s *Server) Refresh(c fiber.Ctx) error {
	var req refreshRequest
	if err := c.Bind().Body(&req); err != nil || req.RefreshToken == "" {
		return httpx.BadRequest(c, "refreshToken is required")
	}
	hash := crypto.HashToken(req.RefreshToken)
	rt, err := s.Store.GetRefreshTokenByHash(hash)
	if err != nil {
		return httpx.Unauthorized(c, "invalid refresh token")
	}
	now := time.Now().Unix()
	if rt.RevokedAt != nil || rt.ExpiresAt < now {
		return httpx.Unauthorized(c, "refresh token expired or revoked")
	}
	user, err := s.Store.GetUserByID(rt.UserID)
	if err != nil {
		return httpx.Unauthorized(c, "account no longer exists")
	}
	// Rotate: revoke the presented token before issuing a new one.
	if err := s.Store.RevokeRefreshToken(rt.ID, now); err != nil {
		return httpx.Internal(c, "could not rotate token")
	}
	vk, err := s.Store.GetVaultKey(user.ID)
	if err != nil {
		return httpx.Internal(c, "vault key unavailable")
	}
	device := req.DeviceName
	if device == "" {
		device = rt.DeviceName
	}
	return s.issueTokens(c, user, vk.WrappedKey, device, fiber.StatusOK)
}

type logoutRequest struct {
	RefreshToken string `json:"refreshToken"`
	AllDevices   bool   `json:"allDevices"`
}

// Logout revokes one or all refresh tokens for the authenticated user.
func (s *Server) Logout(c fiber.Ctx) error {
	userID := UserID(c)
	if userID == "" {
		return httpx.Unauthorized(c, "authentication required")
	}
	var req logoutRequest
	_ = c.Bind().Body(&req)
	now := time.Now().Unix()
	if req.AllDevices {
		if err := s.Store.RevokeAllUserTokens(userID, now); err != nil {
			return httpx.Internal(c, "could not revoke sessions")
		}
		return c.SendStatus(fiber.StatusNoContent)
	}
	if req.RefreshToken != "" {
		if rt, err := s.Store.GetRefreshTokenByHash(crypto.HashToken(req.RefreshToken)); err == nil && rt.UserID == userID {
			if err := s.Store.RevokeRefreshToken(rt.ID, now); err != nil {
				return httpx.Internal(c, "could not revoke session")
			}
		}
	}
	return c.SendStatus(fiber.StatusNoContent)
}

// Me returns the authenticated user's public profile and vault key metadata.
func (s *Server) Me(c fiber.Ctx) error {
	userID := UserID(c)
	user, err := s.Store.GetUserByID(userID)
	if err != nil {
		return httpx.Unauthorized(c, "account not found")
	}
	vk, err := s.Store.GetVaultKey(userID)
	if err != nil {
		return httpx.Internal(c, "vault key unavailable")
	}
	return c.JSON(fiber.Map{"user": user, "wrappedKey": vk.WrappedKey})
}

// ChangePassword re-wraps the vault key after the client re-encrypts it with a
// new master-derived key. The auth hash is verified against the old one first.
func (s *Server) ChangePassword(c fiber.Ctx) error {
	userID := UserID(c)
	var req struct {
		OldAuthHash string `json:"oldAuthHash"`
		NewAuthHash string `json:"newAuthHash"`
		KdfSalt     string `json:"kdfSalt"`
		KdfParams   string `json:"kdfParams"`
		WrappedKey  string `json:"wrappedKey"`
	}
	if err := c.Bind().Body(&req); err != nil {
		return httpx.BadRequest(c, "invalid request body")
	}
	user, err := s.Store.GetUserByID(userID)
	if err != nil {
		return httpx.Unauthorized(c, "account not found")
	}
	if !crypto.VerifyAuthHash(req.OldAuthHash, user.AuthHash) {
		return httpx.Unauthorized(c, "current password is incorrect")
	}
	if len(req.NewAuthHash) < 16 || req.KdfSalt == "" || req.KdfParams == "" || req.WrappedKey == "" {
		return httpx.BadRequest(c, "missing required key material")
	}
	newHash, err := crypto.HashAuthHash(req.NewAuthHash, s.Cfg.ServerArgonTime, s.Cfg.ServerArgonMemory, s.Cfg.ServerArgonThread)
	if err != nil {
		return httpx.Internal(c, "could not secure credentials")
	}
	if err := s.Store.UpdateUserCredentials(userID, newHash, req.KdfSalt, req.KdfParams); err != nil {
		return httpx.Internal(c, "could not update credentials")
	}
	now := time.Now().Unix()
	if err := s.Store.UpsertVaultKey(&models.VaultKey{
		UserID: userID, WrappedKey: req.WrappedKey, CreatedAt: now, UpdatedAt: now,
	}); err != nil {
		return httpx.Internal(c, "could not store vault key")
	}
	// Invalidate all sessions; the user must log in again with the new password.
	if err := s.Store.RevokeAllUserTokens(userID, now); err != nil {
		return httpx.Internal(c, "could not revoke sessions")
	}
	return c.SendStatus(fiber.StatusNoContent)
}

func (s *Server) issueTokens(c fiber.Ctx, user *models.User, wrappedKey, deviceName string, status int) error {
	access, err := s.Tokens.Issue(user.ID, user.Email)
	if err != nil {
		return httpx.Internal(c, "could not issue access token")
	}
	rawRefresh, refreshHash, err := crypto.NewToken(32)
	if err != nil {
		return httpx.Internal(c, "could not issue refresh token")
	}
	id, err := crypto.NewID()
	if err != nil {
		return httpx.Internal(c, "could not issue refresh token")
	}
	now := time.Now()
	if deviceName == "" {
		deviceName = "unknown device"
	}
	if err := s.Store.CreateRefreshToken(&models.RefreshToken{
		ID: id, UserID: user.ID, TokenHash: refreshHash, DeviceName: deviceName,
		ExpiresAt: now.Add(s.Cfg.RefreshTokenTTL).Unix(), CreatedAt: now.Unix(),
	}); err != nil {
		return httpx.Internal(c, "could not persist refresh token")
	}
	return c.Status(status).JSON(authResponse{
		AccessToken:  access,
		RefreshToken: rawRefresh,
		ExpiresIn:    int64(s.Tokens.TTL().Seconds()),
		User:         user,
		WrappedKey:   wrappedKey,
	})
}

func normalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

func validEmail(email string) bool {
	at := strings.IndexByte(email, '@')
	if at <= 0 || at == len(email)-1 {
		return false
	}
	return !strings.ContainsAny(email, " \t\n")
}

func sha256Hex(s string) string {
	sum := sha256.Sum256([]byte(s))
	return hex.EncodeToString(sum[:])
}