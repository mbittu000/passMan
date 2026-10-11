import { argon2id, argon2idAsync } from '@noble/hashes/argon2.js';

/**
 * Native Argon2id backend contract.
 *
 * Backend policy (single source of truth, enforced below):
 *  - Development (`__DEV__`, i.e. Expo Go or a dev client on Metro): always
 *    the pure-JS implementation. No native module required.
 *  - Release builds (`__DEV__ === false`): the native implementation when the
 *    `PassmanArgon2` module is compiled in, with a transparent pure-JS
 *    fallback if it is missing.
 *
 * A native module registers itself through {@link registerNativeKdf} at startup
 * (see `src/lib/crypto/native-kdf.ts`), and derivation transparently follows
 * the policy — so no call-site ever has to care which backend is active.
 * Because KDF parameters are persisted per account, vaults created in dev
 * unlock in release builds and vice versa.
 */
export type NativeArgon2 = (
  password: Uint8Array,
  salt: Uint8Array,
  opts: { m: number; t: number; p: number; dkLen: number },
) => Promise<Uint8Array>;

let nativeBackend: NativeArgon2 | null = null;

export function registerNativeKdf(impl: NativeArgon2): void {
  nativeBackend = impl;
}

/** True only in release builds where a native backend is registered. */
function nativeActive(): boolean {
  return !__DEV__ && nativeBackend != null;
}

export function getKdfBackend(): 'native' | 'js' {
  return nativeActive() ? 'native' : 'js';
}

/**
 * Derive raw Argon2id key material. Uses the native backend in release builds
 * when registered, otherwise the pure-JS one.
 */
export async function argon2idDerive(
  password: Uint8Array,
  salt: Uint8Array,
  opts: { m: number; t: number; p: number; dkLen: number },
): Promise<Uint8Array> {
  if (nativeActive() && nativeBackend) {
    return nativeBackend(password, salt, opts);
  }
  return argon2idAsync(password, salt, opts);
}

/** Synchronous pure-JS derivation, used as a fallback where awaiting is not possible. */
export function argon2idDeriveSync(
  password: Uint8Array,
  salt: Uint8Array,
  opts: { m: number; t: number; p: number; dkLen: number },
): Uint8Array {
  return argon2id(password, salt, opts);
}