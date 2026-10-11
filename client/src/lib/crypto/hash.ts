import * as Crypto from 'expo-crypto';

/**
 * Fast SHA-256 over a UTF-8 string (used for non-secret integrity checks and
 * the local item index).
 */
export async function sha256Hex(text: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, text);
}

export function uuid(): string {
  return Crypto.randomUUID();
}