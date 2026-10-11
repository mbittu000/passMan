import { bytesToBase64, wipe } from '@/lib/crypto/bytes';
import { generateVaultKey, unwrapVaultKey, wrapVaultKey } from '@/lib/crypto/cipher';
import { createKdfParams, deriveMasterKey, deriveSubkey, KdfParams } from '@/lib/crypto/kdf';

/**
 * High-level vault key orchestration.
 *
 * Signup:
 *   password ──Argon2id──▶ master
 *   master ──HKDF("auth")──▶ authHash        (sent to server, server hashes again)
 *   master ──HKDF("enc")───▶ stretchedKey    (never leaves device)
 *   random vaultKey ──AES-GCM(stretchedKey)──▶ wrappedKey  (stored on server)
 *
 * Login: derive authHash + stretchedKey from password, send authHash; server
 * returns wrappedKey; decrypt with stretchedKey to recover vaultKey.
 */

export type CreatedVault = {
  kdfParams: KdfParams;
  authHash: string;
  wrappedKey: string;
  vaultKey: Uint8Array;
};

export async function createVault(password: string): Promise<CreatedVault> {
  const kdfParams = createKdfParams();
  const master = await deriveMasterKey(password, kdfParams);
  try {
    const authHash = bytesToBase64(deriveSubkey(master, 'auth'));
    const stretchedKey = deriveSubkey(master, 'enc');
    const vaultKey = await generateVaultKey();
    const wrappedKey = await wrapVaultKey(stretchedKey, vaultKey);
    return { kdfParams, authHash, wrappedKey, vaultKey };
  } finally {
    wipe(master);
  }
}

export type DerivedCredentials = {
  authHash: string;
  stretchedKey: Uint8Array;
};

/** Derive the credentials needed to authenticate a login. */
export async function deriveCredentials(password: string, kdfParams: KdfParams): Promise<DerivedCredentials> {
  const master = await deriveMasterKey(password, kdfParams);
  try {
    return {
      authHash: bytesToBase64(deriveSubkey(master, 'auth')),
      stretchedKey: deriveSubkey(master, 'enc'),
    };
  } finally {
    wipe(master);
  }
}

/** Recover the vault key from the server-stored wrapped key. */
export async function unlockVaultKey(stretchedKey: Uint8Array, wrappedKey: string): Promise<Uint8Array> {
  return unwrapVaultKey(stretchedKey, wrappedKey);
}

export type RewrappedVault = {
  kdfParams: KdfParams;
  oldAuthHash: string;
  newAuthHash: string;
  wrappedKey: string;
};

/** Produce the material needed to change the master password. */
export async function rewrapForPasswordChange(
  oldPassword: string,
  newPassword: string,
  vaultKey: Uint8Array,
  oldParams: KdfParams,
): Promise<RewrappedVault> {
  const oldCreds = await deriveCredentials(oldPassword, oldParams);
  const newParams = createKdfParams();
  const newMaster = await deriveMasterKey(newPassword, newParams);
  try {
    const newAuthHash = bytesToBase64(deriveSubkey(newMaster, 'auth'));
    const newStretched = deriveSubkey(newMaster, 'enc');
    const wrappedKey = await wrapVaultKey(newStretched, vaultKey);
    return {
      kdfParams: newParams,
      oldAuthHash: oldCreds.authHash,
      newAuthHash,
      wrappedKey,
    };
  } finally {
    wipe(newMaster);
  }
}