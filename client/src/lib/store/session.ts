import { create } from 'zustand';
import * as LocalAuthentication from 'expo-local-authentication';

import * as authApi from '@/lib/api/auth';
import { bytesToBase64, base64ToBytes, wipe } from '@/lib/crypto/bytes';
import { KdfParams, DEFAULT_KDF } from '@/lib/crypto/kdf';
import { createVault, deriveCredentials, rewrapForPasswordChange, unlockVaultKey } from '@/lib/crypto/vault';
import {
  clearBiometricKey,
  clearSession,
  hasBiometricKey,
  loadBiometricKey,
  loadSession,
  saveBiometricKey,
  saveSession,
  StoredSession,
  updateSessionTokens,
} from '@/lib/store/secure';

export type SessionStatus = 'loading' | 'onboarding' | 'locked' | 'unlocked';

type SessionState = {
  status: SessionStatus;
  session: StoredSession | null;
  vaultKey: Uint8Array | null;
  biometricAvailable: boolean;
  busy: boolean;
  error: string | null;

  bootstrap: () => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  unlockWithPassword: (password: string) => Promise<void>;
  unlockWithBiometric: () => Promise<boolean>;
  enableBiometric: () => Promise<void>;
  disableBiometric: () => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
  refreshSession: () => Promise<boolean>;
  lock: () => void;
  signOut: () => Promise<void>;
  clearError: () => void;
};

const DEVICE_NAME = 'mobile';

function parseParams(raw: string, salt: string): KdfParams {
  try {
    const parsed = JSON.parse(raw) as Partial<KdfParams>;
    return { ...DEFAULT_KDF, ...parsed, salt };
  } catch {
    return { ...DEFAULT_KDF, salt };
  }
}

function messageFrom(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong';
}

export const useSession = create<SessionState>((set, get) => ({
  status: 'loading',
  session: null,
  vaultKey: null,
  biometricAvailable: false,
  busy: false,
  error: null,

  async bootstrap() {
    try {
      const session = await loadSession();
      const bioAvailable = await LocalAuthentication.isEnrolledAsync().catch(() => false);
      const bioKey = bioAvailable ? await hasBiometricKey() : false;
      set({
        session,
        status: session ? 'locked' : 'onboarding',
        biometricAvailable: Boolean(bioAvailable && bioKey),
      });
    } catch (err) {
      set({
        status: 'onboarding',
        error: err instanceof Error ? err.message : 'Could not restore your session',
      });
    }
  },

  async register(email, password) {
    set({ busy: true, error: null });
    try {
      // Cheap availability check first. Deriving the vault key is expensive
      // (Argon2id), so we avoid paying that cost only to learn the email is
      // already taken. The server still enforces uniqueness authoritatively.
      const params = await authApi.authParams(email);
      if (params.exists) {
        throw new Error('An account with that email already exists');
      }

      const created = await createVault(password);
      const bundle = await authApi.register({
        email,
        authHash: created.authHash,
        kdfParams: created.kdfParams,
        wrappedKey: created.wrappedKey,
        deviceName: DEVICE_NAME,
      });
      const session: StoredSession = {
        accessToken: bundle.accessToken,
        refreshToken: bundle.refreshToken,
        userId: bundle.user.id,
        email: bundle.user.email,
        wrappedKey: bundle.wrappedKey,
        kdfParams: created.kdfParams,
        deviceName: DEVICE_NAME,
      };
      await saveSession(session);
      set({ session, vaultKey: created.vaultKey, status: 'unlocked', busy: false });
    } catch (err) {
      set({ busy: false, error: messageFrom(err) });
      throw err;
    }
  },

  async login(email, password) {
    set({ busy: true, error: null });
    try {
      const params = await authApi.authParams(email);
      const kdfParams = parseParams(params.kdfParams, params.kdfSalt);
      const creds = await deriveCredentials(password, kdfParams);
      const bundle = await authApi.login(email, creds.authHash, DEVICE_NAME);
      const vaultKey = await unlockVaultKey(creds.stretchedKey, bundle.wrappedKey);
      wipe(creds.stretchedKey);
      const session: StoredSession = {
        accessToken: bundle.accessToken,
        refreshToken: bundle.refreshToken,
        userId: bundle.user.id,
        email: bundle.user.email,
        wrappedKey: bundle.wrappedKey,
        kdfParams,
        deviceName: DEVICE_NAME,
      };
      await saveSession(session);
      set({ session, vaultKey, status: 'unlocked', busy: false });
    } catch (err) {
      set({ busy: false, error: messageFrom(err) });
      throw err;
    }
  },

  async unlockWithPassword(password) {
    const session = get().session;
    if (!session) {
      set({ error: 'No account on this device' });
      return;
    }
    set({ busy: true, error: null });
    try {
      const creds = await deriveCredentials(password, session.kdfParams);
      const vaultKey = await unlockVaultKey(creds.stretchedKey, session.wrappedKey);
      wipe(creds.stretchedKey);
      set({ vaultKey, status: 'unlocked', busy: false });
    } catch {
      set({ busy: false, error: 'Incorrect password' });
      throw new Error('Incorrect password');
    }
  },

  async unlockWithBiometric() {
    const session = get().session;
    if (!session) return false;
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock your vault',
        fallbackLabel: 'Use password',
      });
      if (!result.success) return false;
      const b64 = await loadBiometricKey();
      if (!b64) {
        set({ error: 'Biometric unlock is unavailable. Enter your password.' });
        return false;
      }
      set({ vaultKey: base64ToBytes(b64), status: 'unlocked', error: null });
      return true;
    } catch {
      return false;
    }
  },

  async enableBiometric() {
    const { session, vaultKey } = get();
    if (!session || !vaultKey) return;
    const enrolled = await LocalAuthentication.isEnrolledAsync().catch(() => false);
    if (!enrolled) {
      set({ error: 'No biometrics enrolled on this device' });
      return;
    }
    await saveBiometricKey(bytesToBase64(vaultKey));
    set({ biometricAvailable: true, error: null });
  },

  async disableBiometric() {
    await clearBiometricKey();
    set({ biometricAvailable: false });
  },

  async changePassword(oldPassword, newPassword) {
    const { session, vaultKey } = get();
    if (!session || !vaultKey) return;
    set({ busy: true, error: null });
    try {
      const rewrapped = await rewrapForPasswordChange(
        oldPassword,
        newPassword,
        vaultKey,
        session.kdfParams,
      );
      await authApi.changePassword(session.accessToken, {
        oldAuthHash: rewrapped.oldAuthHash,
        newAuthHash: rewrapped.newAuthHash,
        kdfParams: rewrapped.kdfParams,
        wrappedKey: rewrapped.wrappedKey,
      });
      // Server revoked all sessions; keep the user unlocked but refresh tokens.
      const creds = await deriveCredentials(newPassword, rewrapped.kdfParams);
      const bundle = await authApi.login(session.email, creds.authHash, DEVICE_NAME);
      wipe(creds.stretchedKey);
      const next: StoredSession = {
        ...session,
        accessToken: bundle.accessToken,
        refreshToken: bundle.refreshToken,
        wrappedKey: bundle.wrappedKey,
        kdfParams: rewrapped.kdfParams,
      };
      await saveSession(next);
      set({ session: next, busy: false });
    } catch (err) {
      set({ busy: false, error: messageFrom(err) });
      throw err;
    }
  },

  async refreshSession() {
    const session = get().session;
    if (!session) return false;
    try {
      const bundle = await authApi.refresh(session.refreshToken, DEVICE_NAME);
      await updateSessionTokens(bundle.accessToken, bundle.refreshToken);
      set({ session: { ...session, accessToken: bundle.accessToken, refreshToken: bundle.refreshToken } });
      return true;
    } catch {
      return false;
    }
  },

  lock() {
    const { vaultKey } = get();
    wipe(vaultKey);
    set({ vaultKey: null, status: 'locked' });
  },

  async signOut() {
    const { session } = get();
    if (session) {
      await authApi.logout(session.accessToken, session.refreshToken).catch(() => {});
    }
    await clearSession();
    await clearBiometricKey();
    const { vaultKey } = get();
    wipe(vaultKey);
    set({ session: null, vaultKey: null, status: 'onboarding', biometricAvailable: false });
  },

  clearError() {
    set({ error: null });
  },
}));