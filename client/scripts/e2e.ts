/**
 * End-to-end protocol test. Simulates the client's zero-knowledge crypto
 * (Argon2id + HKDF + AES-256-GCM) against the running passMan server to prove
 * the register -> login -> unwrap -> encrypt -> sync -> decrypt flow works.
 */
import { argon2id } from '@noble/hashes/argon2.js';
import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { gcm } from '@noble/ciphers/aes.js';

const BASE = process.env.BASE ?? 'http://localhost:18080';

const enc = new TextEncoder();
const dec = new TextDecoder();

function toB64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64');
}
function fromB64(s: string): Uint8Array {
  return new Uint8Array(Buffer.from(s, 'base64'));
}
function randomBytes(n: number): Uint8Array {
  return new Uint8Array(globalThis.crypto.getRandomValues(new Uint8Array(n)));
}

function deriveMaster(password: string, salt: Uint8Array, params: any): Uint8Array {
  return argon2id(enc.encode(password), salt, { m: params.m, t: params.t, p: params.p, dkLen: 32 });
}
function subkey(master: Uint8Array, info: string): Uint8Array {
  return hkdf(sha256, master, undefined, enc.encode(`passman:${info}`), 32);
}
function seal(key: Uint8Array, plaintext: Uint8Array): string {
  const nonce = randomBytes(12);
  const cipher = gcm(key, nonce);
  const out = cipher.encrypt(plaintext); // ciphertext || tag(16)
  const combined = new Uint8Array(nonce.length + out.length);
  combined.set(nonce, 0);
  combined.set(out, nonce.length);
  return toB64(combined);
}
function open(key: Uint8Array, blob: string): Uint8Array {
  const combined = fromB64(blob);
  const nonce = combined.slice(0, 12);
  const body = combined.slice(12);
  return gcm(key, nonce).decrypt(body);
}

async function post(path: string, body: any, token?: string) {
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

function assert(cond: any, msg: string) {
  if (!cond) throw new Error(`ASSERT FAILED: ${msg}`);
  console.log(`  ok - ${msg}`);
}

const email = `e2e_${Date.now()}@example.com`;
const password = 'correct horse battery staple';

// ---- Register ----
console.log('register');
const kdfParams = { algorithm: 'argon2id', m: 65536, t: 3, p: 1, dkLen: 32, salt: toB64(randomBytes(16)) };
const master = deriveMaster(password, fromB64(kdfParams.salt), kdfParams);
const authHash = toB64(subkey(master, 'auth'));
const stretched = subkey(master, 'enc');
const vaultKey = randomBytes(32);
const wrappedKey = seal(stretched, vaultKey);

const reg = await post('/auth/register', {
  email,
  authHash,
  kdfSalt: kdfParams.salt,
  kdfParams: JSON.stringify(kdfParams),
  wrappedKey,
  deviceName: 'e2e-test',
});
assert(reg.status === 201, `register returns 201 (got ${reg.status})`);
assert(reg.body.accessToken && reg.body.refreshToken, 'register returns tokens');
assert(reg.body.wrappedKey === wrappedKey, 'server echoes our wrapped vault key');

// ---- Auth params (pre-login) ----
console.log('auth params');
const params = await post('/auth/params', { email });
assert(params.body.exists === true, 'auth params reports account exists');
assert(params.body.kdfSalt === kdfParams.salt, 'auth params returns the same kdf salt');

// ---- Login + unwrap ----
console.log('login + unwrap');
const login = await post('/auth/login', { email, authHash, deviceName: 'e2e-test' });
assert(login.status === 200, 'login succeeds with derived auth hash');
const recoveredStretched = subkey(deriveMaster(password, fromB64(params.body.kdfSalt), JSON.parse(params.body.kdfParams)), 'enc');
const recoveredVaultKey = open(recoveredStretched, login.body.wrappedKey);
assert(Buffer.compare(Buffer.from(recoveredVaultKey), Buffer.from(vaultKey)) === 0, 'unwrapped vault key matches the original');

// ---- Encrypt an item + push ----
console.log('encrypt + push');
const itemPayload = { type: 'database', title: 'Prod Postgres', fields: { host: 'db.internal', password: 'hunter2' } };
const ciphertext = seal(recoveredVaultKey, enc.encode(JSON.stringify(itemPayload)));
const now = Math.floor(Date.now() / 1000);
const itemId = crypto.randomUUID();
const push = await post('/vault/items', {
  items: [{ id: itemId, ciphertext, typeHint: 'database', version: 1, updatedAt: now, createdAt: now }],
}, login.body.accessToken);
assert(push.body.accepted === 1, 'server accepts the encrypted item');

// ---- Full pull + decrypt ----
console.log('pull + decrypt');
const pullRes = await fetch(BASE + '/vault/', { headers: { Authorization: `Bearer ${login.body.accessToken}` } });
const pull = await pullRes.json();
const fetched = pull.items.find((i: any) => i.id === itemId);
assert(fetched, 'encrypted item is returned by the server');
assert(fetched.ciphertext === ciphertext, 'ciphertext round-trips byte-for-byte');
const decrypted = JSON.parse(dec.decode(open(recoveredVaultKey, fetched.ciphertext)));
assert(decrypted.title === 'Prod Postgres', 'decrypted title matches');
assert(decrypted.fields.password === 'hunter2', 'decrypted secret field matches');

// ---- Delta sync ----
console.log('delta sync');
const syncAfter = now + 1;
const emptyDelta = await (await fetch(`${BASE}/vault/sync?since=${syncAfter}`, { headers: { Authorization: `Bearer ${login.body.accessToken}` } })).json();
assert(emptyDelta.items.length === 0, 'delta sync since future returns nothing');
const fullDelta = await (await fetch(`${BASE}/vault/sync?since=0`, { headers: { Authorization: `Bearer ${login.body.accessToken}` } })).json();
assert(fullDelta.items.length === 1, 'delta sync since 0 returns the item');

// ---- Refresh rotation ----
console.log('refresh rotation');
const refreshed = await post('/auth/refresh', { refreshToken: login.body.refreshToken });
assert(refreshed.status === 200 && refreshed.body.accessToken, 'refresh issues a new access token');
const reused = await post('/auth/refresh', { refreshToken: login.body.refreshToken });
assert(reused.status === 401, 'reusing a rotated refresh token is rejected');

console.log('\nALL E2E ASSERTIONS PASSED');