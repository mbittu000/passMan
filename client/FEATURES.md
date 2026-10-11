# Keychain — what is real vs illustrative

This document exists because this is a password manager: nothing here may
imply protection that does not genuinely exist.

## Genuinely implemented

- **Zero-knowledge encryption.** Vault items are encrypted on-device with
  AES-256-GCM before anything touches the network or disk. The server only
  ever sees ciphertext plus non-secret sync metadata.
- **Master-password key derivation.** Argon2id (pure JS in dev, native module
  in release builds) → HKDF splits an auth value from the encryption value.
  The master password never leaves the device.
- **Cloud Sync.** Real synchronization against the Go/Fiber server: batch
  upsert, delta pull, tombstones, last-write-wins. Refresh-token rotation,
  rate-limited auth, server-side Argon2id on the auth verifier.
- **This device (local-only items).** Items saved with “This device” storage
  are encrypted at rest locally and are never pushed to the server. Their
  local rows are deleted directly instead of leaving tombstones.
- **Biometric unlock + auto-lock.** Device biometrics gate the vault key in
  SecureStore; the in-memory key is wiped after 5 minutes in the background.
- **One-time codes (TOTP).** RFC 6238 codes are generated entirely offline
  from a stored secret. No backend involved.
- **Copy / reveal / validated external links.** Copy writes only to the
  clipboard (never to logs); URLs are validated before opening.

## Illustrative / demo only

- **Sample logins (Figma, Netflix, Telegram).** Seeded only when you choose
  “Load demo data”. They are tagged `demo`, badged DEMO DATA in the UI, and
  removable at any time from Settings.
- **“Password found in a data breach” banner.** This exact banner appears
  only on demo content and is explicitly labelled DEMO. **No live breach
  detection exists** — no password is ever sent anywhere for breach checks.
- **Category graphics.** Abstract decorative patterns; no meaning beyond
  visual grouping.

## Known limitations

- Switching an item from Cloud Sync to “This device” stops future uploads
  but does **not** delete copies already synced to the server.
- Categories are stored encrypted per device and do not sync; a second
  device shows the category id as “Uncategorized” until the category is
  recreated there.
- Demo items use `cloud` storage so they appear in every view; remove them
  from Settings when done exploring.
