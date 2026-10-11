import * as SecureStore from 'expo-secure-store';

import { KdfParams } from '@/lib/crypto/kdf';

/**
 * Persistent secret storage backed by expo-secure-store (iOS Keychain /
 * Android Keystore). Holds session tokens and, optionally, a copy of the vault
 * key guarded by device biometrics.
 */

const SESSION_KEY = 'passman.session.v1';
const BIOMETRIC_KEY = 'passman.vaultkey.biometric.v1';

export type StoredSession = {
  accessToken: string;
  refreshToken: string;
  userId: string;
  email: string;
  wrappedKey: string;
  kdfParams: KdfParams;
  deviceName: string;
};

export async function saveSession(session: StoredSession): Promise<void> {
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function loadSession(): Promise<StoredSession | null> {
  const raw = await SecureStore.getItemAsync(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

export async function updateSessionTokens(accessToken: string, refreshToken: string): Promise<void> {
  const session = await loadSession();
  if (!session) return;
  await saveSession({ ...session, accessToken, refreshToken });
}

export async function saveSessionWrappedKey(wrappedKey: string, kdfParams: KdfParams): Promise<void> {
  const session = await loadSession();
  if (!session) return;
  await saveSession({ ...session, wrappedKey, kdfParams });
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_KEY);
}

/**
 * Biometric-gated vault key. Reading this value prompts for Face ID /
 * fingerprint (on iOS the prompt happens on read; on Android on every
 * operation).
 */
export async function saveBiometricKey(vaultKeyBase64: string): Promise<void> {
  await SecureStore.setItemAsync(BIOMETRIC_KEY, vaultKeyBase64, {
    requireAuthentication: true,
    authenticationPrompt: 'Unlock your vault',
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function loadBiometricKey(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(BIOMETRIC_KEY, {
      requireAuthentication: true,
      authenticationPrompt: 'Unlock your vault',
    });
  } catch {
    // Invalidated (biometrics changed) or user cancelled.
    return null;
  }
}

export async function hasBiometricKey(): Promise<boolean> {
  try {
    const value = await SecureStore.getItemAsync(BIOMETRIC_KEY, {
      requireAuthentication: false,
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    return value != null;
  } catch {
    return false;
  }
}

export async function clearBiometricKey(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(BIOMETRIC_KEY);
  } catch {
    // ignore
  }
}