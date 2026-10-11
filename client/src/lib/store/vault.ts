import { create } from 'zustand';

import { ApiError } from '@/lib/api/client';
import * as vaultApi from '@/lib/api/vault';
import { RemoteItem } from '@/lib/api/vault';
import { uuid } from '@/lib/crypto/hash';
import { decodeItem, encodeItem } from '@/lib/db/codec';
import {
  allLocalItems,
  clearLocal,
  dirtyItems,
  getMeta,
  LAST_SYNC_KEY,
  markClean,
  setMeta,
  upsertLocal,
  upsertLocalMany,
} from '@/lib/db/local';
import { ItemType, VaultItem, VaultItemPayload } from '@/lib/items/types';
import { useSession } from '@/lib/store/session';

type VaultState = {
  items: VaultItem[];
  loaded: boolean;
  loading: boolean;
  syncing: boolean;
  error: string | null;
  lastSync: number;

  loadLocal: () => Promise<void>;
  sync: () => Promise<void>;
  createItem: (type: ItemType, payload: VaultItemPayload) => Promise<string>;
  updateItem: (id: string, payload: VaultItemPayload) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  reset: () => Promise<void>;
  clearError: () => void;
};

function now(): number {
  return Math.floor(Date.now() / 1000);
}

async function withAuth<T>(fn: (token: string) => Promise<T>): Promise<T> {
  const session = useSession.getState();
  if (!session.session) throw new ApiError(401, 'unauthorized', 'Not signed in');
  try {
    return await fn(session.session.accessToken);
  } catch (err) {
    if (err instanceof ApiError && err.isAuthError) {
      const refreshed = await useSession.getState().refreshSession();
      if (refreshed) {
        const token = useSession.getState().session?.accessToken;
        if (token) return fn(token);
      }
    }
    throw err;
  }
}

function sortItems(items: VaultItem[]): VaultItem[] {
  return [...items].sort((a, b) => {
    if (a.payload.favorite !== b.payload.favorite) return a.payload.favorite ? -1 : 1;
    return b.updatedAt - a.updatedAt;
  });
}

export const useVault = create<VaultState>((set, get) => ({
  items: [],
  loaded: false,
  loading: false,
  syncing: false,
  error: null,
  lastSync: 0,

  async loadLocal() {
    const vaultKey = useSession.getState().vaultKey;
    if (!vaultKey) return;
    set({ loading: true });
    try {
      const remotes = await allLocalItems();
      const decoded: VaultItem[] = [];
      for (const remote of remotes) {
        if (remote.deleted) continue;
        const item = await decodeItem(vaultKey, remote);
        if (item && !item.deleted) decoded.push(item);
      }
      const lastSync = Number((await getMeta(LAST_SYNC_KEY)) ?? '0') || 0;
      set({ items: sortItems(decoded), loaded: true, loading: false, lastSync });
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : 'Failed to load vault' });
    }
  },

  async sync() {
    if (get().syncing) return;
    const vaultKey = useSession.getState().vaultKey;
    if (!vaultKey) return;
    set({ syncing: true, error: null });
    try {
      // 1. Push local changes. Items marked `storage: 'local'` stay on this
      // device: they are decoded to check the flag and withheld from push.
      // They keep their dirty bit so a later switch back to cloud syncs them.
      const dirty = await dirtyItems();
      const toPush: RemoteItem[] = [];
      for (const row of dirty) {
        if (!row.deleted && row.ciphertext) {
          try {
            const decoded = await decodeItem(vaultKey, row);
            if (decoded && !decoded.deleted && (decoded.payload.storage ?? 'cloud') === 'local') {
              continue;
            }
          } catch {
            // Undecodable: push to preserve existing behavior.
          }
        }
        toPush.push(row);
      }
      if (toPush.length) {
        await withAuth((token) => vaultApi.pushItems(token, toPush));
        await markClean(toPush.map((d) => d.id));
      }

      // 2. Pull server changes since the last sync.
      const since = get().lastSync;
      const { items: remote, serverTime } = since
        ? await withAuth((token) => vaultApi.syncVault(token, since))
        : await withAuth((token) => vaultApi.pullVault(token));

      // 3. Persist remote rows locally and decode.
      await upsertLocalMany(remote, false);
      const byId = new Map(get().items.map((i) => [i.id, i]));
      for (const row of remote) {
        if (row.deleted) {
          byId.delete(row.id);
          continue;
        }
        const existing = byId.get(row.id);
        if (existing && existing.updatedAt > row.updatedAt) continue;
        const decoded = await decodeItem(vaultKey, row);
        if (decoded && !decoded.deleted) byId.set(row.id, decoded);
      }

      const nextLastSync = serverTime || now();
      await setMeta(LAST_SYNC_KEY, String(nextLastSync));
      set({
        items: sortItems([...byId.values()]),
        syncing: false,
        loaded: true,
        lastSync: nextLastSync,
      });
    } catch (err) {
      set({ syncing: false, error: err instanceof Error ? err.message : 'Sync failed' });
    }
  },

  async createItem(type, payload) {
    const vaultKey = useSession.getState().vaultKey;
    if (!vaultKey) throw new Error('Vault is locked');
    const id = uuid();
    const ts = now();
    const remote = await encodeItem(vaultKey, {
      id,
      payload,
      version: 1,
      updatedAt: ts,
      createdAt: ts,
      deleted: false,
    });
    await upsertLocal(remote, true);
    const item: VaultItem = { id, payload, version: 1, updatedAt: ts, createdAt: ts, deleted: false };
    set({ items: sortItems([...get().items.filter((i) => i.id !== id), item]) });
    void get().sync();
    return id;
  },

  async updateItem(id, payload) {
    const vaultKey = useSession.getState().vaultKey;
    if (!vaultKey) throw new Error('Vault is locked');
    const existing = get().items.find((i) => i.id === id);
    const ts = now();
    const version = (existing?.version ?? 1) + 1;
    const remote = await encodeItem(vaultKey, {
      id,
      payload,
      version,
      updatedAt: ts,
      createdAt: existing?.createdAt ?? ts,
      deleted: false,
    });
    await upsertLocal(remote, true);
    const item: VaultItem = {
      id,
      payload,
      version,
      updatedAt: ts,
      createdAt: existing?.createdAt ?? ts,
      deleted: false,
    };
    set({ items: sortItems([...get().items.filter((i) => i.id !== id), item]) });
    void get().sync();
  },

  async removeItem(id) {
    const existing = get().items.find((i) => i.id === id);
    const ts = now();
    const tombstone: RemoteItem = {
      id,
      ciphertext: '',
      typeHint: null,
      version: (existing?.version ?? 1) + 1,
      deleted: true,
      updatedAt: ts,
      createdAt: existing?.createdAt ?? ts,
    };
    await upsertLocal(tombstone, true);
    set({ items: get().items.filter((i) => i.id !== id) });
    void get().sync();
  },

  async toggleFavorite(id) {
    const item = get().items.find((i) => i.id === id);
    if (!item) return;
    await get().updateItem(id, { ...item.payload, favorite: !item.payload.favorite });
  },

  async reset() {
    await clearLocal();
    set({ items: [], loaded: false, lastSync: 0, error: null });
  },

  clearError() {
    set({ error: null });
  },
}));

/** Look up a decrypted item by id from the current list. */
export function selectItem(id: string | undefined): VaultItem | undefined {
  if (!id) return undefined;
  return useVault.getState().items.find((i) => i.id === id);
}