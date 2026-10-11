import { request } from '@/lib/api/client';

/** Sync transport row: the ciphertext plus non-secret metadata. */
export type RemoteItem = {
  id: string;
  ciphertext: string;
  typeHint?: string | null;
  version: number;
  deleted: boolean;
  updatedAt: number;
  createdAt: number;
};

function mapItem(raw: any): RemoteItem {
  return {
    id: raw.id,
    ciphertext: raw.ciphertext,
    typeHint: raw.typeHint ?? null,
    version: raw.version ?? 1,
    deleted: raw.deleted === true,
    updatedAt: raw.updatedAt ?? 0,
    createdAt: raw.createdAt ?? 0,
  };
}

export async function pullVault(token: string): Promise<{ items: RemoteItem[]; serverTime: number }> {
  const res = await request<{ items: any[]; serverTime: number }>('/vault/', { token });
  return { items: (res.items ?? []).map(mapItem), serverTime: res.serverTime };
}

export async function syncVault(
  token: string,
  since: number,
): Promise<{ items: RemoteItem[]; serverTime: number }> {
  const res = await request<{ items: any[]; serverTime: number }>(`/vault/sync?since=${since}`, { token });
  return { items: (res.items ?? []).map(mapItem), serverTime: res.serverTime };
}

export async function pushItems(
  token: string,
  items: RemoteItem[],
): Promise<{ accepted: number; serverTime: number }> {
  return request<{ accepted: number; serverTime: number }>('/vault/items', {
    method: 'POST',
    token,
    body: { items },
  });
}