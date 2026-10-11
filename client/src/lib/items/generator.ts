import * as Crypto from 'expo-crypto';

/**
 * Cryptographic password / passphrase / PIN generation. All randomness comes
 * from expo-crypto's CSPRNG.
 */

const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGITS = '0123456789';
const SYMBOLS = '!@#$%^&*()-_=+[]{};:,.?/';

const AMBIGUOUS = new Set('Il1O0o');

export type PasswordOptions = {
  length: number;
  lowercase: boolean;
  uppercase: boolean;
  digits: boolean;
  symbols: boolean;
  excludeAmbiguous: boolean;
};

export const DEFAULT_PASSWORD_OPTIONS: PasswordOptions = {
  length: 20,
  lowercase: true,
  uppercase: true,
  digits: true,
  symbols: true,
  excludeAmbiguous: true,
};

export function generatePassword(opts: PasswordOptions): string {
  let alphabet = '';
  if (opts.lowercase) alphabet += LOWERCASE;
  if (opts.uppercase) alphabet += UPPERCASE;
  if (opts.digits) alphabet += DIGITS;
  if (opts.symbols) alphabet += SYMBOLS;
  if (!alphabet) alphabet = LOWERCASE + DIGITS;
  if (opts.excludeAmbiguous) alphabet = [...alphabet].filter((c) => !AMBIGUOUS.has(c)).join('');

  const length = Math.max(4, Math.min(opts.length, 128));
  const chars = [...alphabet];
  const out: string[] = [];
  const rand = Crypto.getRandomValues(new Uint32Array(length));
  for (let i = 0; i < length; i += 1) out.push(chars[rand[i] % chars.length]);
  return out.join('');
}

const WORDS = [
  'amber', 'anchor', 'atlas', 'aurora', 'basil', 'beacon', 'birch', 'bison', 'blaze', 'bloom',
  'breeze', 'brook', 'canyon', 'cedar', 'cinder', 'citrus', 'clover', 'cobalt', 'comet', 'coral',
  'cosmos', 'crane', 'crystal', 'dawn', 'delta', 'ember', 'falcon', 'fern', 'flint', 'forest',
  'frost', 'galaxy', 'glacier', 'granite', 'harbor', 'heron', 'hollow', 'indigo', 'ivory', 'jasper',
  'jungle', 'lagoon', 'lantern', 'lava', 'lunar', 'maple', 'meadow', 'meteor', 'mirage', 'mist',
  'nebula', 'nectar', 'nimbus', 'oasis', 'ocean', 'onyx', 'orbit', 'otter', 'pebble', 'pine',
  'prairie', 'prism', 'quartz', 'quill', 'raven', 'reef', 'ridge', 'river', 'robin', 'saffron',
  'sage', 'shadow', 'sierra', 'silver', 'solstice', 'sparrow', 'spruce', 'summit', 'tempest', 'thistle',
  'thunder', 'tiger', 'timber', 'topaz', 'tundra', 'valley', 'velvet', 'vertex', 'willow', 'winter',
  'wisp', 'zenith', 'zephyr', 'zodiac',
];

export type PassphraseOptions = {
  words: number;
  separator: string;
  capitalize: boolean;
  includeNumber: boolean;
};

export const DEFAULT_PASSPHRASE_OPTIONS: PassphraseOptions = {
  words: 5,
  separator: '-',
  capitalize: true,
  includeNumber: true,
};

export function generatePassphrase(opts: PassphraseOptions): string {
  const count = Math.max(3, Math.min(opts.words, 12));
  const rand = Crypto.getRandomValues(new Uint32Array(count + 1));
  const parts: string[] = [];
  for (let i = 0; i < count; i += 1) {
    let word = WORDS[rand[i] % WORDS.length];
    if (opts.capitalize) word = word[0].toUpperCase() + word.slice(1);
    parts.push(word);
  }
  if (opts.includeNumber) parts.push(String(rand[count] % 100));
  return parts.join(opts.separator);
}

export function generatePin(length: number): string {
  const len = Math.max(4, Math.min(length, 12));
  const rand = Crypto.getRandomValues(new Uint32Array(len));
  return [...rand].map((n) => (n % 10).toString()).join('');
}

/** Rough entropy estimate in bits, for the strength meter. */
export function estimateEntropyBits(password: string): number {
  if (!password) return 0;
  let pool = 0;
  if (/[a-z]/.test(password)) pool += 26;
  if (/[A-Z]/.test(password)) pool += 26;
  if (/[0-9]/.test(password)) pool += 10;
  if (/[^a-zA-Z0-9]/.test(password)) pool += 32;
  if (pool === 0) return 0;
  const bits = password.length * Math.log2(pool);
  // Penalise obvious repetition.
  const unique = new Set(password).size;
  const uniqueness = Math.min(1, unique / Math.max(1, Math.min(password.length, 12)));
  return Math.round(bits * (0.6 + 0.4 * uniqueness));
}

export type Strength = {
  label: string;
  tone: 'danger' | 'warning' | 'success' | 'brand';
  score: number; // 0..1
  bits: number;
};

export function passwordStrength(password: string): Strength {
  const bits = estimateEntropyBits(password);
  const score = Math.max(0, Math.min(1, bits / 128));
  if (bits < 40) return { label: 'Weak', tone: 'danger', score, bits };
  if (bits < 70) return { label: 'Fair', tone: 'warning', score, bits };
  if (bits < 100) return { label: 'Strong', tone: 'success', score, bits };
  return { label: 'Excellent', tone: 'brand', score, bits };
}