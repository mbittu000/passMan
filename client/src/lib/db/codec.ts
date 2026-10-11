import { RemoteItem } from '@/lib/api/vault';
import { decryptJSON, encryptJSON } from '@/lib/crypto/cipher';
import { VaultItem, VaultItemPayload } from '@/lib/items/types';

/**
 * Converts between the in-memory, decrypted {@link VaultItem} and the
 * server/local transport row. The payload is AES-GCM encrypted with the vault
 * key; only ciphertext and sync metadata ever leave this layer.
 */

export async function encodeItem(
  vaultKey: Uint8Array,
  item: { id: string; payload: VaultItemPayload; version: number; updatedAt: number; createdAt: number; deleted: boolean },
): Promise<RemoteItem> {
  const ciphertext = await encryptJSON(vaultKey, item.payload);
  return {
    id: item.id,
    ciphertext,
    typeHint: null,
    version: item.version,
    deleted: item.deleted,
    updatedAt: item.updatedAt,
    createdAt: item.createdAt,
  };
}

export async function decodeItem(vaultKey: Uint8Array, remote: RemoteItem): Promise<VaultItem | null> {
  if (remote.deleted) {
    return {
      id: remote.id,
      payload: { type: 'custom', title: '', fields: {} },
      version: remote.version,
      updatedAt: remote.updatedAt,
      createdAt: remote.createdAt,
      deleted: true,
    };
  }
  try {
    const payload = await decryptJSON<VaultItemPayload>(vaultKey, remote.ciphertext);
    return {
      id: remote.id,
      payload,
      version: remote.version,
      updatedAt: remote.updatedAt,
      createdAt: remote.createdAt,
      deleted: false,
    };
  } catch {
    // Corrupt or not decryptable with the current vault key.
    return null;
  }
}

export async function decodeItems(vaultKey: Uint8Array, remotes: RemoteItem[]): Promise<VaultItem[]> {
  const out: VaultItem[] = [];
  for (const remote of remotes) {
    const decoded = await decodeItem(vaultKey, remote);
    if (decoded) out.push(decoded);
  }
  return out;
}