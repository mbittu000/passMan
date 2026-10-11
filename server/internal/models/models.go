package models

// User is an account. The server never sees the plaintext master password or
// the vault key; it only stores the auth hash used to verify login and the
// encrypted (wrapped) vault key.
type User struct {
	ID        string `json:"id"`
	Email     string `json:"email"`
	AuthHash  string `json:"-"`
	KdfSalt   string `json:"kdfSalt"`
	KdfParams string `json:"kdfParams"`
	CreatedAt int64  `json:"createdAt"`
}

// VaultKey is the client-encrypted vault key. Opaque to the server.
type VaultKey struct {
	UserID     string `json:"userId"`
	WrappedKey string `json:"wrappedKey"`
	CreatedAt  int64  `json:"createdAt"`
	UpdatedAt  int64  `json:"updatedAt"`
}

// RefreshToken is a hashed, revocable long-lived session token.
type RefreshToken struct {
	ID         string `json:"id"`
	UserID     string `json:"userId"`
	TokenHash  string `json:"-"`
	DeviceName string `json:"deviceName"`
	ExpiresAt  int64  `json:"expiresAt"`
	RevokedAt  *int64 `json:"revokedAt,omitempty"`
	CreatedAt  int64  `json:"createdAt"`
}

// Item is an encrypted vault entry. Ciphertext is opaque; type_hint is an
// optional non-sensitive category used only for coarse server-side metadata.
type Item struct {
	ID         string  `json:"id"`
	UserID     string  `json:"userId"`
	Ciphertext string  `json:"ciphertext"`
	TypeHint   *string `json:"typeHint,omitempty"`
	Version    int64   `json:"version"`
	Deleted    bool    `json:"deleted"`
	UpdatedAt  int64   `json:"updatedAt"`
	CreatedAt  int64   `json:"createdAt"`
}