import { Ionicons } from '@expo/vector-icons';

/**
 * A single generic, encrypted item model covers every kind of secret. The
 * `type` selects a template that drives the editor and the detail view; all
 * values live inside `fields` and `custom`, which are encrypted together.
 */

export type ItemType =
  | 'password'
  | 'api_key'
  | 'database'
  | 'token'
  | 'ssh_key'
  | 'passkey'
  | 'card'
  | 'identity'
  | 'secure_note'
  | 'custom';

export type FieldKind = 'text' | 'secret' | 'multiline' | 'number' | 'url' | 'username' | 'password';

export type FieldDef = {
  key: string;
  label: string;
  kind: FieldKind;
  placeholder?: string;
  optional?: boolean;
  mono?: boolean;
};

export type CustomField = {
  id: string;
  label: string;
  value: string;
  secret?: boolean;
};

export type VaultItemPayload = {
  type: ItemType;
  title: string;
  subtitle?: string;
  notes?: string;
  favorite?: boolean;
  tags?: string[];
  fields: Record<string, string>;
  custom?: CustomField[];
  /** User category id. Absent = uncategorized. */
  categoryId?: string;
  /** Extra website URLs beyond the primary `url` field. */
  linkedWebsites?: string[];
  /** Where the item lives. Absent = 'cloud' (synced). */
  storage?: StoragePolicy;
  /** New-login toggle: on means the item syncs to every device. */
  syncAllDevices?: boolean;
  /** True for clearly-labelled demo/sample entries. */
  demo?: boolean;
  /**
   * Flags the illustrative "found in a data breach" banner. This is demo
   * content only — the app performs no live breach detection.
   */
  breachDemo?: boolean;
};

/** Storage policy: 'cloud' items sync to the server, 'local' never leave the device. */
export type StoragePolicy = 'local' | 'cloud';

export type CategoryPattern = 'rings' | 'grid' | 'waves';

export type Category = {
  id: string;
  name: string;
  /** Hex base color for the tile pattern and list separator. */
  color: string;
  pattern: CategoryPattern;
};

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'personal', name: 'Personal', color: '#a6fff2', pattern: 'rings' },
  { id: 'work', name: 'Work', color: '#5ac8fa', pattern: 'grid' },
];

export type VaultItem = {
  id: string;
  payload: VaultItemPayload;
  version: number;
  updatedAt: number;
  createdAt: number;
  deleted: boolean;
};

export type TypeTemplate = {
  type: ItemType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: 'brand' | 'success' | 'warning' | 'danger' | 'neutral' | 'info';
  accent: string;
  fields: FieldDef[];
  /** Primary value shown / copied from the list row. */
  primaryField?: string;
  /** Secondary, non-secret lines shown under the title. */
  listFields?: string[];
};

export const TYPE_TEMPLATES: Record<ItemType, TypeTemplate> = {
  password: {
    type: 'password',
    label: 'Login',
    icon: 'key-outline',
    tone: 'brand',
    accent: '#0572EC',
    primaryField: 'password',
    listFields: ['username', 'url'],
    fields: [
      { key: 'username', label: 'Username', kind: 'username', placeholder: 'you@example.com' },
      { key: 'password', label: 'Password', kind: 'password', placeholder: '••••••••' },
      { key: 'url', label: 'Website', kind: 'url', placeholder: 'https://…', optional: true, mono: true },
      { key: 'totp', label: 'One-time code secret', kind: 'secret', placeholder: 'TOTP secret (optional)', optional: true, mono: true },
    ],
  },
  api_key: {
    type: 'api_key',
    label: 'API key',
    icon: 'pricetag-outline',
    tone: 'success',
    accent: '#3DDC97',
    primaryField: 'key',
    listFields: ['service', 'environment'],
    fields: [
      { key: 'key', label: 'API key', kind: 'secret', placeholder: 'sk-…', mono: true },
      { key: 'service', label: 'Service', kind: 'text', placeholder: 'Stripe, OpenAI…', optional: true },
      { key: 'environment', label: 'Environment', kind: 'text', placeholder: 'prod / staging / dev', optional: true },
      { key: 'expires', label: 'Expires', kind: 'text', placeholder: '2026-01-01 (optional)', optional: true },
    ],
  },
  database: {
    type: 'database',
    label: 'Database',
    icon: 'server-outline',
    tone: 'info',
    accent: '#4C9AFF',
    primaryField: 'password',
    listFields: ['engine', 'host', 'username'],
    fields: [
      { key: 'engine', label: 'Engine', kind: 'text', placeholder: 'Postgres, MySQL, Mongo…' },
      { key: 'host', label: 'Host', kind: 'text', placeholder: 'db.internal', mono: true, optional: true },
      { key: 'port', label: 'Port', kind: 'number', placeholder: '5432', optional: true, mono: true },
      { key: 'database', label: 'Database', kind: 'text', placeholder: 'app_prod', mono: true, optional: true },
      { key: 'username', label: 'Username', kind: 'username', placeholder: 'app_user', optional: true },
      { key: 'password', label: 'Password', kind: 'password', placeholder: '••••••••' },
      { key: 'connectionString', label: 'Connection string', kind: 'secret', placeholder: 'postgres://…', optional: true, mono: true },
    ],
  },
  token: {
    type: 'token',
    label: 'Token',
    icon: 'finger-print-outline',
    tone: 'warning',
    accent: '#FFC857',
    primaryField: 'token',
    listFields: ['scope', 'issuer'],
    fields: [
      { key: 'token', label: 'Token', kind: 'secret', placeholder: 'ghp_…', mono: true },
      { key: 'issuer', label: 'Issuer', kind: 'text', placeholder: 'GitHub, Vault…', optional: true },
      { key: 'scope', label: 'Scope', kind: 'text', placeholder: 'repo,read:user', optional: true, mono: true },
      { key: 'expires', label: 'Expires', kind: 'text', placeholder: '2026-01-01 (optional)', optional: true },
    ],
  },
  ssh_key: {
    type: 'ssh_key',
    label: 'SSH key',
    icon: 'terminal-outline',
    tone: 'neutral',
    accent: '#A7AEC4',
    primaryField: 'privateKey',
    listFields: ['fingerprint', 'comment'],
    fields: [
      { key: 'publicKey', label: 'Public key', kind: 'multiline', placeholder: 'ssh-ed25519 AAAA…', mono: true, optional: true },
      { key: 'privateKey', label: 'Private key (PEM)', kind: 'multiline', placeholder: '-----BEGIN OPENSSH PRIVATE KEY-----', mono: true },
      { key: 'passphrase', label: 'Passphrase', kind: 'secret', placeholder: 'optional', optional: true },
      { key: 'fingerprint', label: 'Fingerprint', kind: 'text', placeholder: 'SHA256:…', mono: true, optional: true },
      { key: 'comment', label: 'Comment', kind: 'text', placeholder: 'user@host', optional: true },
    ],
  },
  passkey: {
    type: 'passkey',
    label: 'Passkey',
    icon: 'scan-outline',
    tone: 'brand',
    accent: '#2E9BFF',
    primaryField: 'credentialId',
    listFields: ['relyingParty', 'username'],
    fields: [
      { key: 'relyingParty', label: 'Relying party', kind: 'text', placeholder: 'example.com' },
      { key: 'username', label: 'Account', kind: 'username', placeholder: 'you@example.com', optional: true },
      { key: 'credentialId', label: 'Credential ID', kind: 'secret', placeholder: 'base64url', mono: true, optional: true },
      { key: 'publicKey', label: 'Public key', kind: 'secret', placeholder: 'COSE public key', mono: true, optional: true },
      { key: 'signCount', label: 'Signature counter', kind: 'number', placeholder: '0', optional: true },
      { key: 'recoveryCodes', label: 'Recovery codes', kind: 'multiline', placeholder: 'one per line', optional: true, mono: true },
    ],
  },
  card: {
    type: 'card',
    label: 'Card',
    icon: 'card-outline',
    tone: 'danger',
    accent: '#FF5C7A',
    primaryField: 'number',
    listFields: ['holder', 'network'],
    fields: [
      { key: 'number', label: 'Card number', kind: 'secret', placeholder: '4111 1111 1111 1111', mono: true },
      { key: 'holder', label: 'Cardholder', kind: 'text', placeholder: 'Jane Doe', optional: true },
      { key: 'expiry', label: 'Expiry', kind: 'text', placeholder: 'MM/YY', mono: true, optional: true },
      { key: 'cvv', label: 'CVV', kind: 'secret', placeholder: '123', mono: true, optional: true },
      { key: 'network', label: 'Network', kind: 'text', placeholder: 'Visa', optional: true },
      { key: 'pin', label: 'PIN', kind: 'secret', placeholder: '••••', optional: true },
    ],
  },
  identity: {
    type: 'identity',
    label: 'Identity',
    icon: 'person-outline',
    tone: 'info',
    accent: '#4C9AFF',
    primaryField: 'fullName',
    listFields: ['email', 'phone'],
    fields: [
      { key: 'fullName', label: 'Full name', kind: 'text', placeholder: 'Jane Doe' },
      { key: 'email', label: 'Email', kind: 'text', placeholder: 'you@example.com', optional: true },
      { key: 'phone', label: 'Phone', kind: 'text', placeholder: '+1 555 0100', optional: true },
      { key: 'address', label: 'Address', kind: 'multiline', placeholder: '123 Main St…', optional: true },
      { key: 'dob', label: 'Date of birth', kind: 'text', placeholder: '1990-01-01', optional: true },
      { key: 'nationalId', label: 'ID / passport', kind: 'secret', placeholder: 'passport number', optional: true, mono: true },
    ],
  },
  secure_note: {
    type: 'secure_note',
    label: 'Secure note',
    icon: 'document-text-outline',
    tone: 'neutral',
    accent: '#7C839A',
    primaryField: 'note',
    listFields: [],
    fields: [{ key: 'note', label: 'Note', kind: 'multiline', placeholder: 'Write something private…' }],
  },
  custom: {
    type: 'custom',
    label: 'Custom',
    icon: 'grid-outline',
    tone: 'neutral',
    accent: '#7C839A',
    primaryField: '',
    listFields: [],
    fields: [],
  },
};

export const ITEM_TYPE_ORDER: ItemType[] = [
  'password',
  'api_key',
  'database',
  'token',
  'ssh_key',
  'passkey',
  'card',
  'identity',
  'secure_note',
  'custom',
];

export function templateFor(type: ItemType): TypeTemplate {
  return TYPE_TEMPLATES[type] ?? TYPE_TEMPLATES.custom;
}

export function emptyPayload(type: ItemType): VaultItemPayload {
  const fields: Record<string, string> = {};
  for (const f of templateFor(type).fields) fields[f.key] = '';
  return { type, title: '', notes: '', favorite: false, tags: [], fields, custom: [] };
}

const SECRET_KINDS: FieldKind[] = ['secret', 'password'];

export function isSecretKind(kind: FieldKind): boolean {
  return SECRET_KINDS.includes(kind);
}

/** A one-line summary suitable for a list row. */
export function itemSubtitle(item: VaultItem): string {
  const tpl = templateFor(item.payload.type);
  const parts: string[] = [];
  for (const key of tpl.listFields ?? []) {
    const value = item.payload.fields[key];
    if (value) parts.push(value);
  }
  if (!parts.length && item.payload.subtitle) parts.push(item.payload.subtitle);
  return parts.join(' · ');
}

export function maskedValue(value: string): string {
  if (!value) return '';
  return '•'.repeat(Math.min(Math.max(value.length, 8), 16));
}

/** Effective storage policy; items created before the field existed sync. */
export function itemStorage(item: VaultItem): StoragePolicy {
  return item.payload.storage ?? 'cloud';
}

/** Primary website plus any linked websites, de-duplicated. */
export function linkedWebsitesOf(item: VaultItem): string[] {
  const out: string[] = [];
  const primary = item.payload.fields.url?.trim();
  if (primary) out.push(primary);
  for (const raw of item.payload.linkedWebsites ?? []) {
    const url = raw.trim();
    if (url && !out.includes(url)) out.push(url);
  }
  return out;
}

/** Identifier shown under the title: username first, then subtitle fallback. */
export function itemIdentifier(item: VaultItem): string {
  const username = item.payload.fields.username?.trim();
  if (username) return username;
  return itemSubtitle(item);
}