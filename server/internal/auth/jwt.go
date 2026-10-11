package auth

import (
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// TokenIssuer signs and verifies short-lived JSON Web Tokens (access tokens).
type TokenIssuer struct {
	secret []byte
	ttl    time.Duration
}

// NewTokenIssuer creates a JWT issuer using an HS256 shared secret.
func NewTokenIssuer(secret []byte, ttl time.Duration) *TokenIssuer {
	return &TokenIssuer{secret: secret, ttl: ttl}
}

// Claims are the JWT claims embedded in an access token.
type Claims struct {
	jwt.RegisteredClaims
	Email string `json:"email"`
}

// Issue returns a signed access token for the given user.
func (t *TokenIssuer) Issue(userID, email string) (string, error) {
	now := time.Now()
	claims := Claims{
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(t.ttl)),
			Issuer:    "passman",
		},
		Email: email,
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(t.secret)
}

// Parse validates a token and returns its claims.
func (t *TokenIssuer) Parse(raw string) (*Claims, error) {
	claims := &Claims{}
	_, err := jwt.ParseWithClaims(raw, claims, func(token *jwt.Token) (any, error) {
		return t.secret, nil
	}, jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}))
	if err != nil {
		return nil, err
	}
	return claims, nil
}

// TTL exposes the configured access token lifetime.
func (t *TokenIssuer) TTL() time.Duration { return t.ttl }