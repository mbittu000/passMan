import { request } from '@/lib/api/client';
import { KdfParams } from '@/lib/crypto/kdf';

export type RemoteUser = {
  id: string;
  email: string;
  kdfSalt: string;
  kdfParams: string;
  createdAt: number;
};

export type TokenBundle = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: RemoteUser;
  wrappedKey: string;
};

export type RegisterPayload = {
  email: string;
  authHash: string;
  kdfParams: KdfParams;
  wrappedKey: string;
  deviceName: string;
};

export function register(payload: RegisterPayload): Promise<TokenBundle> {
  return request<TokenBundle>('/auth/register', {
    method: 'POST',
    body: {
      email: payload.email,
      authHash: payload.authHash,
      kdfSalt: payload.kdfParams.salt,
      kdfParams: JSON.stringify(payload.kdfParams),
      wrappedKey: payload.wrappedKey,
      deviceName: payload.deviceName,
    },
  });
}

export function authParams(email: string): Promise<{ kdfSalt: string; kdfParams: string; exists: boolean }> {
  return request<{ kdfSalt: string; kdfParams: string; exists: boolean }>('/auth/params', {
    method: 'POST',
    body: { email },
  });
}

export function login(email: string, authHash: string, deviceName: string): Promise<TokenBundle> {
  return request<TokenBundle>('/auth/login', {
    method: 'POST',
    body: { email, authHash, deviceName },
  });
}

export function refresh(refreshToken: string, deviceName: string): Promise<TokenBundle> {
  return request<TokenBundle>('/auth/refresh', {
    method: 'POST',
    body: { refreshToken, deviceName },
  });
}

export function logout(token: string, refreshToken: string, allDevices = false): Promise<void> {
  return request<void>('/auth/logout', {
    method: 'POST',
    token,
    body: { refreshToken, allDevices },
  });
}

export function me(token: string): Promise<{ user: RemoteUser; wrappedKey: string }> {
  return request<{ user: RemoteUser; wrappedKey: string }>('/auth/me', { token });
}

export type ChangePasswordPayload = {
  oldAuthHash: string;
  newAuthHash: string;
  kdfParams: KdfParams;
  wrappedKey: string;
};

export function changePassword(token: string, payload: ChangePasswordPayload): Promise<void> {
  return request<void>('/auth/password', {
    method: 'POST',
    token,
    body: {
      oldAuthHash: payload.oldAuthHash,
      newAuthHash: payload.newAuthHash,
      kdfSalt: payload.kdfParams.salt,
      kdfParams: JSON.stringify(payload.kdfParams),
      wrappedKey: payload.wrappedKey,
    },
  });
}

export { request };