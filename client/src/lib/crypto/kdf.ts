import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';

import { argon2idDerive, argon2idDeriveSync, getKdfBackend } from '@/lib/crypto/argon2';
import { randomBytes, utf8ToBytes } from '@/lib/crypto/bytes';

/**
 * Password-based key derivation.
 *
 * The same interface is served by two backends:
 *  - `js`     → pure-JS Argon2id (@noble/hashes). Runs everywhere, including
 *               Expo Go, at the cost of a few hundred ms on device.
 *  - `native` → a native Argon2id module. Preferred for release builds once a
 *               development build is created. Selected at runtime through
 *               {@link getKdfBackend}.
 *
 * A KDF descriptor is persisted so the params used at signup can be replayed
 * at login even if defaults change.
 */

export type KdfParams = {
  algorithm: 'argon2id';
  m: number; // memory cost in KiB
  t: number; // iterations
  p: number; // parallelism
  dkLen: number;
  salt: string; // base64
};

export const DEFAULT_KDF: Omit<KdfParams, 'salt'> = {
  algorithm: 'argon2id',
  m: 65536, // 64 MiB
  t: 3,
  p: 1,
  dkLen: 32,
};

/**
 * Mobile/JS-friendly cost. The pure-JS backend runs on the Hermes JS thread;
 * a desktop-class cost stalls the UI for a long time on phones. This keeps the
 * work factor meaningful while staying responsive.
 */
export const MOBILE_KDF: Omit<KdfParams, 'salt'> = {
  algorithm: 'argon2id',
  m: 8192, // 8 MiB
  t: 2,
  p: 1,
  dkLen: 32,
};

/**
 * Pick KDF parameters for a new vault. Uses the strong cost when a native
 * Argon2id backend is available, otherwise the mobile-friendly cost. Because
 * params are persisted per account, existing accounts keep working regardless
 * of which backend is active later.
 */
function activeKdfDefaults(): Omit<KdfParams, 'salt'> {
  return getKdfBackend() === 'native' ? DEFAULT_KDF : MOBILE_KDF;
}

export function createKdfParams(): KdfParams {
  return { ...activeKdfDefaults(), salt: b64(randomBytes(16)) };
}

function b64(bytes: Uint8Array): string {
  let out = '';
  const table = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    out += table[(n >> 18) & 63] + table[(n >> 12) & 63];
    out += i + 1 < bytes.length ? table[(n >> 6) & 63] : '=';
    out += i + 2 < bytes.length ? table[n & 63] : '=';
  }
  return out;
}

function unb64(b64Str: string): Uint8Array {
  const table = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const clean = b64Str.replace(/[^A-Za-z0-9+/]/g, '');
  const out = new Uint8Array((clean.length * 3) >> 2);
  let p = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const e0 = table.indexOf(clean[i]);
    const e1 = table.indexOf(clean[i + 1]);
    const e2 = i + 2 < clean.length ? table.indexOf(clean[i + 2]) : 0;
    const e3 = i + 3 < clean.length ? table.indexOf(clean[i + 3]) : 0;
    out[p++] = (e0 << 2) | (e1 >> 4);
    if (p < out.length) out[p++] = ((e1 & 15) << 4) | (e2 >> 2);
    if (p < out.length) out[p++] = ((e2 & 3) << 6) | e3;
  }
  return out;
}

/**
 * Derive the master key from the password. This never leaves the device.
 */
export async function deriveMasterKey(password: string, params: KdfParams): Promise<Uint8Array> {
  const salt = unb64(params.salt);
  const pw = utf8ToBytes(password);
  const opts = { m: params.m, t: params.t, p: params.p, dkLen: params.dkLen };
  return argon2idDerive(pw, salt, opts);
}

/** Synchronous variant, useful in places where we cannot await. */
export function deriveMasterKeySync(password: string, params: KdfParams): Uint8Array {
  const salt = unb64(params.salt);
  const opts = { m: params.m, t: params.t, p: params.p, dkLen: params.dkLen };
  return argon2idDeriveSync(utf8ToBytes(password), salt, opts);
}

/**
 * HKDF-SHA256. Used to split the master key into independent subkeys with
 * domain separation so that exposing the auth value does not expose the
 * encryption value.
 */
export function deriveSubkey(masterKey: Uint8Array, info: string, length = 32): Uint8Array {
  return hkdf(sha256, masterKey, undefined, utf8ToBytes(`passman:${info}`), length);
}

export function sha256Bytes(data: Uint8Array): Uint8Array {
  return sha256(data);
}