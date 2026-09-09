import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { UxpWebSocketBridge, WebSocket } from './runtime.mjs';

const token = 'isolated-test-token-never-production';
async function until(check) {
  for (let i = 0; i < 100; i++) { if (check()) return; await delay(20); }
  assert.ok(check(), 'expected state within two seconds');
}
test('two MCP instances can use one authenticated Premiere panel', async () => {
  // The first run reproduces the installed launcher's port collision. The
  // shared implementation must satisfy the same two-client host round trip.
  const shared = process.env.REPRO_ORIGINAL !== '1';
  const { UxpHub, SharedUxpClient } = shared ? await import('./shared.mjs') : {};
  const host = shared ? new UxpHub({ port: 0, token }) : new UxpWebSocketBridge({ port: 0, token });
  const clients = [];
  let panel;
  try {
    await host.start();
    const port = host.address().port;
    for (let i = 0; i < 2; i++) {
      const client = shared ? new SharedUxpClient({ port, token, retryMs: 30 }) : new UxpWebSocketBridge({ port, token });
      clients.push(client);
      await client.start();
    }
    panel = new WebSocket(`ws://127.0.0.1:${port}/uxp?token=${token}`);
    panel.on('message', raw => {
      const command = JSON.parse(raw);
      panel.send(JSON.stringify({ protocolVersion: 2, type: 'result', requestId: command.requestId,
        payload: { ok: true, result: { verified: command.args.client } } }));
    });
    await once(panel, 'open');
    panel.send(JSON.stringify({ protocolVersion: 2, type: 'hello', payload: {
      backend: 'uxp', protocolVersion: 2, commands: { 'state.get': { supported: true } }
    } }));
    await until(() => clients.every(client => client.getState().connected));
    assert.deepEqual(await Promise.all(clients.map((client, i) => client.request('state.get', { client: i }))),
      [{ verified: 0 }, { verified: 1 }]);
    await clients[0].stop();
    assert.deepEqual(await clients[1].request('state.get', { client: 2 }), { verified: 2 });
  } finally {
    panel?.terminate();
    await Promise.all(clients.map(client => client.stop()));
    await host.stop();
  }
});
