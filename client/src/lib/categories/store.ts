import { create } from 'zustand';

import { decryptJSON, encryptJSON } from '@/lib/crypto/cipher';
import { getMeta, setMeta } from '@/lib/db/local';
import { Category, CategoryPattern, DEFAULT_CATEGORIES } from '@/lib/items/types';
import { useSession } from '@/lib/store/session';

/**
 * User categories (Personal, Work, …). The list is stored as an AES-GCM
 * encrypted blob in the local meta table — category names never sit in
 * plaintext. Categories are per-account and local to this device; items
 * reference them by id.
 */

const CATEGORY_COLORS = ['#a6fff2', '#5ac8fa', '#30d158', '#ffcc27', '#ff453a', '#c7c7cc'] as const;
const CATEGORY_PATTERNS: CategoryPattern[] = ['rings', 'grid', 'waves'];

function keyFor(userId: string): string {
  return `categories:${userId}`;
}

function requireVaultKey(): Uint8Array {
  const key = useSession.getState().vaultKey;
  if (!key) throw new Error('Vault is locked');
  return key;
}

function requireUserId(): string {
  const session = useSession.getState().session;
  if (!session) throw new Error('Not signed in');
  return session.userId;
}

function withDefaults(cats: Category[]): Category[] {
  const byId = new Map(cats.map((c) => [c.id, c]));
  for (const fallback of DEFAULT_CATEGORIES) {
    if (!byId.has(fallback.id)) byId.set(fallback.id, fallback);
  }
  return [...byId.values()];
}

export async function loadCategories(): Promise<Category[]> {
  try {
    const raw = await getMeta(keyFor(requireUserId()));
    if (!raw) return [...DEFAULT_CATEGORIES];
    const parsed = await decryptJSON<Category[]>(requireVaultKey(), raw);
    if (!Array.isArray(parsed)) return [...DEFAULT_CATEGORIES];
    return withDefaults(parsed.filter((c) => c && typeof c.id === 'string' && typeof c.name === 'string'));
  } catch {
    return [...DEFAULT_CATEGORIES];
  }
}

export async function saveCategories(categories: Category[]): Promise<void> {
  await setMeta(keyFor(requireUserId()), await encryptJSON(requireVaultKey(), categories));
}

export async function addCategory(
  name: string,
  opts?: { color?: string; pattern?: CategoryPattern },
): Promise<Category> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Give the category a name');
  const categories = await loadCategories();
  const existing = categories.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
  if (existing) return existing;
  const category: Category = {
    id: `cat_${Date.now().toString(36)}`,
    name: trimmed,
    color: opts?.color ?? CATEGORY_COLORS[categories.length % CATEGORY_COLORS.length],
    pattern: opts?.pattern ?? CATEGORY_PATTERNS[categories.length % CATEGORY_PATTERNS.length],
  };
  await saveCategories([...categories, category]);
  return category;
}

export function categoryById(categories: Category[], id: string | undefined): Category | undefined {
  if (!id) return undefined;
  return categories.find((c) => c.id === id);
}

type CategoryState = {
  categories: Category[];
  loaded: boolean;
  load: () => Promise<void>;
  add: (name: string, opts?: { color?: string; pattern?: CategoryPattern }) => Promise<Category>;
  reset: () => void;
};

export const useCategories = create<CategoryState>((set) => ({
  categories: [...DEFAULT_CATEGORIES],
  loaded: false,
  async load() {
    set({ categories: await loadCategories(), loaded: true });
  },
  async add(name: string, opts?: { color?: string; pattern?: CategoryPattern }) {
    const category = await addCategory(name, opts);
    set({ categories: await loadCategories(), loaded: true });
    return category;
  },
  reset() {
    set({ categories: [...DEFAULT_CATEGORIES], loaded: false });
  },
}));
