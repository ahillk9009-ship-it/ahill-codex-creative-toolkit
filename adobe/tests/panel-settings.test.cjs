const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createConnectionSettings } = require('../patches/premiere/files/connection-settings.cjs');
test('saved connection is restored from UXP encrypted-storage byte arrays without TextDecoder', async () => {
  const values = new Map();
  const storage = { async setItem(k, v) { values.set(k, Uint8Array.from(Buffer.from(v))); }, async getItem(k) { return values.get(k); } };
  const expected = { url: 'ws://127.0.0.1:7788/uxp', token: 'test-token-한글-🧪' };
  await createConnectionSettings(storage).save(expected);
  assert.deepEqual(await createConnectionSettings(storage).load(), expected);
});
test('missing or lost secure settings let the panel load for manual reconnection', async () => {
  assert.equal(await createConnectionSettings({ async getItem() { throw new Error('cache lost'); } }).load(), null);
  assert.equal(await createConnectionSettings({ async getItem() { return Uint8Array.from([123]); } }).load(), null);
});
