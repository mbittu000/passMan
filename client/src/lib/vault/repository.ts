import { deleteLocal } from '@/lib/db/local';
import { StoragePolicy, VaultItem, VaultItemPayload } from '@/lib/items/types';
import { useVault } from '@/lib/store/vault';

/**
 * Repository seam over vault storage. Screens talk to this instead of the
 * stores directly, so persistence/sync details stay in one place and a real
 * backend can be swapped in later.
 */

export type LoginInput = {
  title: string;
  username: string;
  password: string;
  website?: string;
  linkedWebsites?: string[];
  categoryId?: string;
  storage?: StoragePolicy;
  syncAllDevices?: boolean;
  notes?: string;
};

export type DemoSeedResult = {
  seeded: number;
  skipped: boolean;
};

function buildLoginPayload(input: LoginInput): VaultItemPayload {  return {
    type: 'password',
    title: input.title.trim(),
    notes: input.notes?.trim() || undefined,
    favorite: false,
    tags: [],
    fields: {
      username: input.username.trim(),
      password: input.password,
      url: input.website?.trim() ?? '',
      totp: '',
    },
    custom: [],
    categoryId: input.categoryId,
    linkedWebsites: (input.linkedWebsites ?? []).map((u) => u.trim()).filter(Boolean),
    storage: input.storage ?? 'cloud',
    syncAllDevices: input.syncAllDevices ?? true,
  };
}

const DEMO_ITEMS: (LoginInput & { demo: boolean; breachDemo: boolean })[] = [
  {
    title: 'Figma',
    username: 'designer@studio.co',
    password: 'demo-only-f1gma!',
    website: 'https://figma.com',
    categoryId: 'work',
    storage: 'cloud',
    syncAllDevices: true,
    notes: 'Demo entry — replace it with your own credentials.',
    demo: true,
    breachDemo: true,
  },
  {
    title: 'Netflix',
    username: '+1 555-0142',
    password: 'demo-only-n3tflix!',
    website: 'https://netflix.com',
    categoryId: 'personal',
    storage: 'cloud',
    syncAllDevices: true,
    notes: 'Demo entry — replace it with your own credentials.',
    demo: true,
    breachDemo: false,
  },
  {
    title: 'Telegram',
    username: '@demo_handle',
    password: 'demo-only-t3legram!',
    website: 'https://telegram.org',
    categoryId: 'personal',
    storage: 'cloud',
    syncAllDevices: true,
    notes: 'Demo entry — replace it with your own credentials.',
    demo: true,
    breachDemo: false,
  },
];

export const VaultRepository = {
  /** Decrypted, non-deleted items currently in memory. */
  list(): VaultItem[] {
    return useVault.getState().items;
  },

  get(id: string | undefined): VaultItem | undefined {
    if (!id) return undefined;
    return useVault.getState().items.find((i) => i.id === id);
  },

  async createLogin(input: LoginInput): Promise<string> {
    return useVault.getState().createItem('password', buildLoginPayload(input));
  },

  async updateLogin(id: string, input: Partial<LoginInput> & { notes?: string }): Promise<void> {
    const existing = VaultRepository.get(id);
    if (!existing) throw new Error('Item not found');
    const fields = { ...existing.payload.fields };
    if (input.username !== undefined) fields.username = input.username.trim();
    if (input.password !== undefined) fields.password = input.password;
    if (input.website !== undefined) fields.url = input.website.trim();
    await useVault.getState().updateItem(id, {
      ...existing.payload,
      title: input.title !== undefined ? input.title.trim() || existing.payload.title : existing.payload.title,
      notes: input.notes !== undefined ? input.notes.trim() || undefined : existing.payload.notes,
      fields,
      linkedWebsites:
        input.linkedWebsites !== undefined
          ? input.linkedWebsites.map((u) => u.trim()).filter(Boolean)
          : existing.payload.linkedWebsites,
      categoryId: input.categoryId !== undefined ? input.categoryId : existing.payload.categoryId,
      storage: input.storage !== undefined ? input.storage : existing.payload.storage,
      syncAllDevices: input.syncAllDevices !== undefined ? input.syncAllDevices : existing.payload.syncAllDevices,
    });
  },

  /**
   * Delete an item. Local-only items never reached the server, so their row
   * is dropped directly instead of leaving a tombstone behind.
   */
  async remove(id: string): Promise<void> {
    const item = VaultRepository.get(id);
    if (item && (item.payload.storage ?? 'cloud') === 'local') {
      await deleteLocal(id);
      useVault.setState((state) => ({ items: state.items.filter((i) => i.id !== id) }));
      return;
    }
    await useVault.getState().removeItem(id);
  },

  /**
   * Seed clearly-labelled demo logins (Figma, Netflix, Telegram) when the
   * vault has no demo entries yet. Returns how many were created.
   */
  async seedDemo(): Promise<DemoSeedResult> {
    if (VaultRepository.list().some((i) => i.payload.demo)) {
      return { seeded: 0, skipped: true };
    }
    let seeded = 0;
    for (const demo of DEMO_ITEMS) {
      const payload = buildLoginPayload(demo);
      payload.demo = true;
      // Flags the illustrative breach banner. Not a real detection.
      if (demo.breachDemo) payload.breachDemo = true;
      payload.tags = ['demo'];
      await useVault.getState().createItem('password', payload);
      seeded += 1;
    }
    return { seeded, skipped: false };
  },

  /** Remove every demo-flagged item. Returns how many were removed. */
  async clearDemo(): Promise<number> {
    const demos = VaultRepository.list().filter((i) => i.payload.demo);
    for (const demo of demos) {
      await VaultRepository.remove(demo.id);
    }
    return demos.length;
  },
};

/**
 * Normalize a user-entered website into an https URL. Returns null when the
 * value cannot be interpreted as a website. Bare domains gain an https
 * scheme; only http(s) hosts with a dot are accepted.
 */
export function normalizeWebsiteUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(withScheme);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    if (!parsed.hostname.includes('.')) return null;
    return withScheme;
  } catch {
    return null;
  }
}
