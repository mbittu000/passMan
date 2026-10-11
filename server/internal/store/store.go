package store

import (
	"database/sql"
	"errors"
	"fmt"

	"passman/server/internal/models"
)

// ErrNotFound is returned when a requested row does not exist.
var ErrNotFound = errors.New("store: not found")

// Store provides typed access to the SQLite database.
type Store struct {
	db *sql.DB
}

// New wraps a database handle.
func New(db *sql.DB) *Store { return &Store{db: db} }

// CreateUser inserts a new user.
func (s *Store) CreateUser(u *models.User) error {
	_, err := s.db.Exec(
		`INSERT INTO users (id, email, auth_hash, kdf_salt, kdf_params, created_at)
		 VALUES (?, ?, ?, ?, ?, ?)`,
		u.ID, u.Email, u.AuthHash, u.KdfSalt, u.KdfParams, u.CreatedAt,
	)
	return err
}

// GetUserByEmail looks up a user by email.
func (s *Store) GetUserByEmail(email string) (*models.User, error) {
	return s.scanUser(s.db.QueryRow(
		`SELECT id, email, auth_hash, kdf_salt, kdf_params, created_at FROM users WHERE email = ?`, email))
}

// GetUserByID looks up a user by id.
func (s *Store) GetUserByID(id string) (*models.User, error) {
	return s.scanUser(s.db.QueryRow(
		`SELECT id, email, auth_hash, kdf_salt, kdf_params, created_at FROM users WHERE id = ?`, id))
}

func (s *Store) scanUser(row *sql.Row) (*models.User, error) {
	var u models.User
	err := row.Scan(&u.ID, &u.Email, &u.AuthHash, &u.KdfSalt, &u.KdfParams, &u.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &u, nil
}

// UpdateUserCredentials replaces a user's auth hash and KDF metadata.
func (s *Store) UpdateUserCredentials(userID, authHash, kdfSalt, kdfParams string) error {
	_, err := s.db.Exec(
		`UPDATE users SET auth_hash = ?, kdf_salt = ?, kdf_params = ? WHERE id = ?`,
		authHash, kdfSalt, kdfParams, userID,
	)
	return err
}

// UpsertVaultKey stores or replaces the encrypted vault key for a user.
func (s *Store) UpsertVaultKey(vk *models.VaultKey) error {
	_, err := s.db.Exec(
		`INSERT INTO vault_keys (user_id, wrapped_key, created_at, updated_at)
		 VALUES (?, ?, ?, ?)
		 ON CONFLICT(user_id) DO UPDATE SET wrapped_key = excluded.wrapped_key, updated_at = excluded.updated_at`,
		vk.UserID, vk.WrappedKey, vk.CreatedAt, vk.UpdatedAt,
	)
	return err
}

// GetVaultKey returns the encrypted vault key for a user.
func (s *Store) GetVaultKey(userID string) (*models.VaultKey, error) {
	var vk models.VaultKey
	err := s.db.QueryRow(
		`SELECT user_id, wrapped_key, created_at, updated_at FROM vault_keys WHERE user_id = ?`, userID,
	).Scan(&vk.UserID, &vk.WrappedKey, &vk.CreatedAt, &vk.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &vk, nil
}

// CreateRefreshToken persists a hashed refresh token.
func (s *Store) CreateRefreshToken(rt *models.RefreshToken) error {
	_, err := s.db.Exec(
		`INSERT INTO refresh_tokens (id, user_id, token_hash, device_name, expires_at, created_at)
		 VALUES (?, ?, ?, ?, ?, ?)`,
		rt.ID, rt.UserID, rt.TokenHash, rt.DeviceName, rt.ExpiresAt, rt.CreatedAt,
	)
	return err
}

// GetRefreshTokenByHash looks up a refresh token by its hash.
func (s *Store) GetRefreshTokenByHash(hash string) (*models.RefreshToken, error) {
	var rt models.RefreshToken
	var revoked sql.NullInt64
	err := s.db.QueryRow(
		`SELECT id, user_id, token_hash, device_name, expires_at, revoked_at, created_at
		 FROM refresh_tokens WHERE token_hash = ?`, hash,
	).Scan(&rt.ID, &rt.UserID, &rt.TokenHash, &rt.DeviceName, &rt.ExpiresAt, &revoked, &rt.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if revoked.Valid {
		v := revoked.Int64
		rt.RevokedAt = &v
	}
	return &rt, nil
}

// RevokeRefreshToken marks a refresh token as revoked.
func (s *Store) RevokeRefreshToken(id string, at int64) error {
	_, err := s.db.Exec(`UPDATE refresh_tokens SET revoked_at = ? WHERE id = ?`, at, id)
	return err
}

// RevokeAllUserTokens revokes every active refresh token for a user.
func (s *Store) RevokeAllUserTokens(userID string, at int64) error {
	_, err := s.db.Exec(
		`UPDATE refresh_tokens SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL`, at, userID)
	return err
}

// UpsertItems inserts or updates a batch of encrypted items. Newer versions win
// (last-write-wins on updated_at). Runs in a single transaction.
func (s *Store) UpsertItems(userID string, items []models.Item) error {
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	stmt, err := tx.Prepare(
		`INSERT INTO items (id, user_id, ciphertext, type_hint, version, deleted, updated_at, created_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?)
		 ON CONFLICT(id) DO UPDATE SET
		   ciphertext = excluded.ciphertext,
		   type_hint  = excluded.type_hint,
		   version    = excluded.version,
		   deleted    = excluded.deleted,
		   updated_at = excluded.updated_at
		 WHERE excluded.updated_at >= items.updated_at AND items.user_id = excluded.user_id`,
	)
	if err != nil {
		return err
	}
	defer stmt.Close()

	for i := range items {
		it := &items[i]
		if it.ID == "" {
			return fmt.Errorf("store: item id is required")
		}
		deleted := 0
		if it.Deleted {
			deleted = 1
		}
		if _, err := stmt.Exec(
			it.ID, userID, it.Ciphertext, it.TypeHint, it.Version, deleted, it.UpdatedAt, it.CreatedAt,
		); err != nil {
			return err
		}
	}
	return tx.Commit()
}

// ItemsSince returns items changed at or after the given timestamp (inclusive).
func (s *Store) ItemsSince(userID string, since int64) ([]models.Item, error) {
	rows, err := s.db.Query(
		`SELECT id, user_id, ciphertext, type_hint, version, deleted, updated_at, created_at
		 FROM items WHERE user_id = ? AND updated_at >= ? ORDER BY updated_at ASC`,
		userID, since,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanItems(rows)
}

// AllItems returns every item (including tombstones) for a user.
func (s *Store) AllItems(userID string) ([]models.Item, error) {
	rows, err := s.db.Query(
		`SELECT id, user_id, ciphertext, type_hint, version, deleted, updated_at, created_at
		 FROM items WHERE user_id = ? ORDER BY updated_at ASC`,
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanItems(rows)
}

func scanItems(rows *sql.Rows) ([]models.Item, error) {
	items := make([]models.Item, 0)
	for rows.Next() {
		var it models.Item
		var hint sql.NullString
		var deleted int
		if err := rows.Scan(&it.ID, &it.UserID, &it.Ciphertext, &hint, &it.Version, &deleted, &it.UpdatedAt, &it.CreatedAt); err != nil {
			return nil, err
		}
		if hint.Valid {
			it.TypeHint = &hint.String
		}
		it.Deleted = deleted == 1
		items = append(items, it)
	}
	return items, rows.Err()
}