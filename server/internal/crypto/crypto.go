package crypto

import (
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"

	"golang.org/x/crypto/argon2"
)

// ErrInvalidHash is returned when a stored hash is malformed.
var ErrInvalidHash = errors.New("crypto: invalid hash format")

// HashAuthHash applies a server-side Argon2id to the client-provided auth hash.
// The client already ran a memory-hard KDF; this second pass ensures that even
// a database leak cannot be replayed against the API without cracking it.
func HashAuthHash(authHash string, timeCost, memory uint32, threads uint8) (string, error) {
	salt := make([]byte, 16)
	if _, err := rand.Read(salt); err != nil {
		return "", fmt.Errorf("crypto: generate salt: %w", err)
	}
	key := argon2.IDKey([]byte(authHash), salt, timeCost, memory, threads, 32)
	return fmt.Sprintf("argon2id$v=19$m=%d,t=%d,p=%d$%s$%s",
		memory, timeCost, threads,
		base64.RawStdEncoding.EncodeToString(salt),
		base64.RawStdEncoding.EncodeToString(key),
	), nil
}

// VerifyAuthHash compares a candidate auth hash against a stored hash in
// constant time.
func VerifyAuthHash(authHash, encoded string) bool {
	parsed, err := parseHash(encoded)
	if err != nil {
		return false
	}
	key := argon2.IDKey([]byte(authHash), parsed.salt, parsed.time, parsed.memory, parsed.threads, uint32(len(parsed.key)))
	return subtle.ConstantTimeCompare(key, parsed.key) == 1
}

type params struct {
	memory  uint32
	time    uint32
	threads uint8
	salt    []byte
	key     []byte
}

func parseHash(encoded string) (params, error) {
	parts := strings.Split(encoded, "$")
	if len(parts) != 5 || parts[0] != "argon2id" {
		return params{}, ErrInvalidHash
	}
	var p params
	if _, err := fmt.Sscanf(parts[2], "m=%d,t=%d,p=%d", &p.memory, &p.time, &p.threads); err != nil {
		return params{}, ErrInvalidHash
	}
	salt, err := base64.RawStdEncoding.DecodeString(parts[3])
	if err != nil {
		return params{}, ErrInvalidHash
	}
	key, err := base64.RawStdEncoding.DecodeString(parts[4])
	if err != nil {
		return params{}, ErrInvalidHash
	}
	p.salt, p.key = salt, key
	return p, nil
}

// NewToken returns a URL-safe random token and its SHA-256 hash. The raw token
// is returned to the client; only the hash is persisted.
func NewToken(n int) (raw string, hash string, err error) {
	buf := make([]byte, n)
	if _, err := rand.Read(buf); err != nil {
		return "", "", fmt.Errorf("crypto: random: %w", err)
	}
	raw = base64.RawURLEncoding.EncodeToString(buf)
	return raw, HashToken(raw), nil
}

// HashToken returns the hex SHA-256 of a token.
func HashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

// NewID returns a random hex identifier.
func NewID() (string, error) {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return "", fmt.Errorf("crypto: random: %w", err)
	}
	return hex.EncodeToString(buf), nil
}