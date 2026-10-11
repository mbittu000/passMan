import { NativeModules, Platform } from 'react-native';

import { NativeArgon2, registerNativeKdf } from '@/lib/crypto/argon2';

/**
 * Wires up a native Argon2id module when one is present in the build.
 *
 * Expo Go has no native Argon2 module, so the app falls back to the pure-JS
 * backend there. When you create a development or release build that includes
 * a native Argon2 implementation exposing `deriveArgon2id`, this registers it
 * automatically — no call-site changes required.
 *
 * Expected native module shape:
 *   NativeModules.PassmanArgon2.derive(
 *     passwordBase64, saltBase64, memoryKiB, iterations, parallelism, dkLen
 *   ): Promise<string /* base64 derived key *\/>
 */
export function installNativeKdf(): void {
  // Development always uses the pure-JS backend (works in Expo Go and dev
  // clients with no native module). Release builds use native when present.
  if (__DEV__) return;
  if (Platform.OS === 'web') return;
  const native = (NativeModules as Record<string, any>).PassmanArgon2;
  if (!native || typeof native.derive !== 'function') return;

  const impl: NativeArgon2 = async (password, salt, opts) => {
    const passwordB64 = base64FromBytes(password);
    const saltB64 = base64FromBytes(salt);
    const resultB64: string = await native.derive(
      passwordB64,
      saltB64,
      opts.m,
      opts.t,
      opts.p,
      opts.dkLen,
    );
    return bytesFromBase64(resultB64);
  };

  registerNativeKdf(impl);
}

function base64FromBytes(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  // globalThis.btoa exists in the RN runtime; fall back to a manual encoder.
  if (typeof globalThis.btoa === 'function') return globalThis.btoa(binary);
  return manualBase64(bytes);
}

function bytesFromBase64(b64: string): Uint8Array {
  if (typeof globalThis.atob === 'function') {
    const binary = globalThis.atob(b64);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
    return out;
  }
  const table = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const clean = b64.replace(/[^A-Za-z0-9+/]/g, '');
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

function manualBase64(bytes: Uint8Array): string {
  const table = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let out = '';
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out += table[(n >> 18) & 63] + table[(n >> 12) & 63] + table[(n >> 6) & 63] + table[n & 63];
  }
  const remaining = bytes.length - i;
  if (remaining === 1) {
    const n = bytes[i] << 16;
    out += table[(n >> 18) & 63] + table[(n >> 12) & 63] + '==';
  } else if (remaining === 2) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8);
    out += table[(n >> 18) & 63] + table[(n >> 12) & 63] + table[(n >> 6) & 63] + '=';
  }
  return out;
}