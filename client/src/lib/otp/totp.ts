import { hmac } from '@noble/hashes/hmac.js';
import { sha1 } from '@noble/hashes/legacy.js';

export type TotpCode = {
  code: string;
  /** Seconds left in the current 30s window. */
  secondsLeft: number;
  /** Unix ms timestamp of the next rotation. */
  validUntil: number;
};

const STEP_MS = 30_000;
const DIGITS = 6;

/**
 * Decode a base32 (RFC 4648) TOTP secret. Accepts lowercase, spaces and
 * missing padding; throws on illegal characters.
 */
export function base32Decode(input: string): Uint8Array {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = input.trim().replace(/[\s-]+/g, '').replace(/=+$/g, '').toUpperCase();
  if (!clean) throw new Error('Empty secret');
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const char of clean) {
    const index = alphabet.indexOf(char);
    if (index === -1) throw new Error(`Invalid base32 character: ${char}`);
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}

/**
 * Generate a TOTP code (RFC 6238, SHA-1, 30s step, 6 digits) entirely
 * offline. The secret never leaves the device.
 */
export function generateTotp(secret: string, atMs: number = Date.now()): TotpCode {
  const key = base32Decode(secret);
  if (key.length === 0) throw new Error('Empty secret');
  const counter = Math.floor(atMs / STEP_MS);
  const message = new Uint8Array(8);
  let remaining = counter;
  for (let i = 7; i >= 0; i -= 1) {
    message[i] = remaining & 0xff;
    remaining = Math.floor(remaining / 256);
  }
  const mac = hmac(sha1, key, message);
  const offset = mac[mac.length - 1] & 0x0f;
  const binary =
    ((mac[offset] & 0x7f) << 24) | (mac[offset + 1] << 16) | (mac[offset + 2] << 8) | mac[offset + 3];
  const code = String(binary % 10 ** DIGITS).padStart(DIGITS, '0');
  const validUntil = (counter + 1) * STEP_MS;
  return { code, secondsLeft: Math.max(0, Math.ceil((validUntil - atMs) / 1000)), validUntil };
}

/** True when the string looks like a usable base32 TOTP secret. */
export function isPlausibleTotpSecret(secret: string): boolean {
  try {
    return base32Decode(secret).length > 0;
  } catch {
    return false;
  }
}
