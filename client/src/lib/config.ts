import Constants from 'expo-constants';

/**
 * The machine running the Go server on your LAN. A phone on the same network
 * reaches it at this address instead of localhost.
 */
export const SERVER_IP = '192.168.0.108';
export const SERVER_PORT = 8080;

/**
 * The API base URL. Set `EXPO_PUBLIC_API_URL` to override (e.g. a tunnel or a
 * production host); otherwise we always use the LAN IP above so a physical
 * device can reach the dev server deterministically.
 */
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? `http://${SERVER_IP}:${SERVER_PORT}`;

// Surface the resolved endpoint in logs so connectivity issues are easy to spot.
console.log('[Keychain] API_URL =', API_URL);

// Keep a reference to expo-constants so the dependency remains meaningful for
// any future environment-based inference.
void Constants.expoConfig?.hostUri;

export const AUTO_LOCK_MS = 5 * 60 * 1000;
export const APP_NAME = 'Keychain';
export const VERSION = '1.0.0';