import { gcm } from '@noble/ciphers/aes.js';
import * as Crypto from 'expo-crypto';

import { base64ToBytes, bytesToBase64, bytesToUtf8, utf8ToBytes } from '@/lib/crypto/bytes';

/**
 * Authenticated symmetric encryption (AES-256-GCM) built on @noble/ciphers'
 * audited pure-JS implementation.
 *
 * Output is a single base64 blob of `IV (12) || ciphertext || tag (16)`,
 * which is what we store on the server as the item "ciphertext". This layout
 * is byte-identical to what expo-crypto's native AES produced, so blobs
 * sealed before this change still decrypt.
 *
 * Why not expo-crypto's native AES? Its `AESSealedData.fromCombined()` passes
 * a base64 string straight to Kotlin, which expects an object — so every
 * decrypt crashes on Android native ("Value is a string, expected an
 * Object"). Pure JS avoids the broken bridge entirely. (The dev-vs-build
 * native policy applies to the KDF/Argon2, the expensive operation; AES-GCM
 * over small vault payloads is microseconds either way.)
 */

export type SealedBlob = string;

const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function checkKey(key: Uint8Array): void {
  if (!(key instanceof Uint8Array) || key.byteLength !== 32) {
    throw new Error('cipher: key must be 32 bytes (AES-256)');
  }
}

/** Generate a fresh random 256-bit vault key from the platform CSPRNG. */
export async function generateVaultKey(): Promise<Uint8Array> {
  return Crypto.getRandomBytes(32);
}

/** Encrypt a UTF-8 string; returns base64 sealed data. */
export async function encryptString(key: Uint8Array, plaintext: string): Promise<SealedBlob> {
  return encryptBytes(key, utf8ToBytes(plaintext));
}

/** Decrypt base64 sealed data into a UTF-8 string. */
export async function decryptString(key: Uint8Array, blob: SealedBlob): Promise<string> {
  return bytesToUtf8(await decryptBytes(key, blob));
}

/** Encrypt raw bytes; returns base64 sealed data. */
export async function encryptBytes(key: Uint8Array, data: Uint8Array): Promise<SealedBlob> {
  checkKey(key);
  const nonce = Crypto.getRandomBytes(IV_LENGTH);
  const tagged = gcm(key, nonce).encrypt(data);
  const combined = new Uint8Array(IV_LENGTH + tagged.byteLength);
  combined.set(nonce, 0);
  combined.set(tagged, IV_LENGTH);
  return bytesToBase64(combined);
}

/** Decrypt base64 sealed data into raw bytes. Throws if the tag is invalid. */
export async function decryptBytes(key: Uint8Array, blob: SealedBlob): Promise<Uint8Array> {
  checkKey(key);
  const combined = base64ToBytes(blob);
  if (combined.byteLength < IV_LENGTH + TAG_LENGTH) {
    throw new Error('cipher: sealed data is too short');
  }
  const nonce = combined.subarray(0, IV_LENGTH);
  const tagged = combined.subarray(IV_LENGTH);
  return gcm(key, nonce).decrypt(tagged);
}

/** Encrypt a JSON-serialisable value. */
export async function encryptJSON<T>(key: Uint8Array, value: T): Promise<SealedBlob> {
  return encryptString(key, JSON.stringify(value));
}

/** Decrypt into a JSON value. */
export async function decryptJSON<T>(key: Uint8Array, blob: SealedBlob): Promise<T> {
  return JSON.parse(await decryptString(key, blob)) as T;
}

/**
 * Wrap (encrypt) the vault key with a key derived from the master password.
 * The wrapped key is the only key material stored on the server.
 */
export async function wrapVaultKey(stretchedKey: Uint8Array, vaultKey: Uint8Array): Promise<SealedBlob> {
  return encryptBytes(stretchedKey, vaultKey);
}

export async function unwrapVaultKey(stretchedKey: Uint8Array, wrapped: SealedBlob): Promise<Uint8Array> {
  return decryptBytes(stretchedKey, wrapped);
}

// Re-exported for callers that need base64 conversions around sealed data.
export { bytesToBase64 };
