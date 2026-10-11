/**
 * JS stub for `passman-argon2`.
 *
 * Intentionally does NOT import native code at the top level, so this module
 * is safe to resolve inside Expo Go (where the native side is absent). The
 * app reaches the native implementation through `NativeModules.PassmanArgon2`
 * in `src/lib/crypto/native-kdf.ts`, which no-ops when the module is missing.
 */
export const PASSMAN_ARGON2_MODULE_NAME = 'PassmanArgon2';
