-- 0001_init.sql
-- Core schema for the passMan zero-knowledge vault server.
-- The server only ever stores ciphertext plus non-secret sync metadata.

CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    email         TEXT NOT NULL UNIQUE,
    auth_hash     TEXT NOT NULL,
    kdf_salt      TEXT NOT NULL,
    kdf_params    TEXT NOT NULL,
    created_at    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS vault_keys (
    user_id       TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    wrapped_key   TEXT NOT NULL,
    created_at    INTEGER NOT NULL,
    updated_at    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id            TEXT PRIMARY KEY,
    user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash    TEXT NOT NULL UNIQUE,
    device_name   TEXT NOT NULL DEFAULT '',
    expires_at    INTEGER NOT NULL,
    revoked_at    INTEGER,
    created_at    INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);

CREATE TABLE IF NOT EXISTS items (
    id            TEXT PRIMARY KEY,
    user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ciphertext    TEXT NOT NULL,
    type_hint     TEXT,
    version       INTEGER NOT NULL DEFAULT 1,
    deleted       INTEGER NOT NULL DEFAULT 0,
    updated_at    INTEGER NOT NULL,
    created_at    INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_items_user_updated ON items(user_id, updated_at);