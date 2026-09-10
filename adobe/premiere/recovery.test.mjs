import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { UxpHub, SharedUxpClient } from './shared.mjs';
import { WebSocket } from './runtime.mjs';
const token = 'isolated-recovery-test-token';
async function until(check) {
  for (let i = 0; i < 150; i++) { if (check()) return; await delay(20); }
  assert.ok(check(), 'expected state within three seconds');
}
async function panelFor(hub, handler = cmd => ({ echo: cmd.args })) {
  const panel = new WebSocket(`ws://127.0.0.1:${hub.address().port}/uxp?token=${token}`);
  panel.on('message', async raw => {
    const cmd = JSON.parse(raw), result = await handler(cmd);
    if (panel.readyState === WebSocket.OPEN && result !== undefined) panel.send(JSON.stringify({
      protocolVersion: 2, type: 'result', requestId: cmd.requestId, payload: { ok: true, result }
    }));
  });
  await once(panel, 'open');
  panel.send(JSON.stringify({ protocolVersion: 2, type: 'hello', payload: { backend: 'uxp', protocolVersion: 2,
    commands: { 'state.get': { supported: true }, 'test.mutation': { supported: true } } } }));
  return panel;
}
test('rejects wrong credentials and browser-origin MCP clients; native auth remains enforced', async () => {
  const hub = new UxpHub({ port: 0, token });
  await hub.start();
  try {
    const base = `ws://127.0.0.1:${hub.address().port}`;
    for (const [route, headers] of [
      ['/mcp-uxp-v1', {}], ['/mcp-uxp-v1', { Authorization: 'Bearer wrong' }],
      ['/mcp-uxp-v1', { Authorization: 'Bearer ' + token, Origin: 'https://example.com' }], ['/uxp?token=wrong', {}]
    ]) {
      const socket = new WebSocket(base + route, { headers });
      const [error] = await once(socket, 'error');
      assert.match(error.message, /401/);
    }
  } finally { await hub.stop(); }
});

test('an authenticated malformed message cannot crash the shared hub', async () => {
  const hub = new UxpHub({port: 0, token});
  await hub.start();
  try {
    const socket = new WebSocket('ws://127.0.0.1:' + hub.address().port + '/mcp-uxp-v1', {
      headers: {Authorization: 'Bearer ' + token}
    });
    await once(socket, 'open');
    const closed = once(socket, 'close');
    socket.send('null');
    assert.equal((await closed)[0], 1008);
  } finally { await hub.stop(); }
});
test('clients recover after service restart, with no replay of an interrupted mutation', async () => {
  let hub = new UxpHub({ port: 0, token }), panel;
  await hub.start();
  const port = hub.address().port;
  const clients = [0, 1].map(() => new SharedUxpClient({ port, token, retryMs: 30 }));
  let mutations = 0;
  try {
    await Promise.all(clients.map(c => c.start()));
    panel = await panelFor(hub, cmd => {
      if (cmd.command === 'test.mutation') { mutations++; return undefined; }
      return { ready: true };
    });
    await until(() => clients.every(c => c.getState().connected));
    const interrupted = clients[0].request('test.mutation').then(() => 'unexpected success', e => e.code);
    await until(() => mutations === 1);
    await hub.stop(); panel.terminate();
    assert.equal(await interrupted, 'UXP_DISCONNECTED');
    await until(() => clients.every(c => !c.getState().connected));
    hub = new UxpHub({ port, token }); await hub.start();
    panel = await panelFor(hub, cmd => { if (cmd.command === 'test.mutation') mutations++; return { ready: true }; });
    await until(() => clients.every(c => c.getState().connected));
    assert.deepEqual(await clients[1].request('state.get'), { ready: true });
    assert.equal(mutations, 1);
  } finally { panel?.terminate(); await Promise.all(clients.map(c => c.stop())); await hub.stop(); }
});
test('serializes commands from different tasks and recovers when only the panel reconnects', async () => {
  const hub = new UxpHub({ port: 0, token }); await hub.start();
  const clients = [0, 1, 2].map(() => new SharedUxpClient({ port: hub.address().port, token, retryMs: 30 }));
  let panel, active = 0, maxActive = 0;
  try {
    await Promise.all(clients.map(c => c.start()));
    panel = await panelFor(hub, async cmd => { active++; maxActive = Math.max(maxActive, active); await delay(30); active--; return { echo: cmd.args }; });
    await until(() => clients.every(c => c.getState().connected));
    const results = await Promise.all(clients.map((c, i) => c.request('test.mutation', { i })));
    assert.equal(maxActive, 1);
    assert.deepEqual(results.map(r => r.echo.i), [0, 1, 2]);
    panel.terminate(); await until(() => clients.every(c => !c.getState().connected));
    await assert.rejects(clients[0].request('state.get'), { code: 'UXP_NOT_CONNECTED' });
    panel = await panelFor(hub); await until(() => clients.every(c => c.getState().connected));
    assert.deepEqual(await clients[2].request('state.get', { again: true }), { echo: { again: true } });
  } finally { panel?.terminate(); await Promise.all(clients.map(c => c.stop())); await hub.stop(); }
});

test('event waits do not block state queries or the mutation that completes the wait', {timeout: 5000}, async () => {
  const hub = new UxpHub({ port: 0, token }); await hub.start();
  const clients = [0, 1, 2].map(() => new SharedUxpClient({ port: hub.address().port, token }));
  let panel, completeWait;
  const order = [];
  try {
    await Promise.all(clients.map(c => c.start()));
    panel = new WebSocket(`ws://127.0.0.1:${hub.address().port}/uxp?token=${token}`);
    panel.on('message', async raw => {
      const cmd = JSON.parse(raw);
      order.push(cmd.command);
      if (cmd.command === 'events.wait') await new Promise(resolve => { completeWait = resolve; });
      if (cmd.command === 'test.mutation') completeWait();
      if (panel.readyState === WebSocket.OPEN) panel.send(JSON.stringify({
        protocolVersion: 2, type: 'result', requestId: cmd.requestId,
        payload: { ok: true, result: { command: cmd.command } }
      }));
    });
    await once(panel, 'open');
    panel.send(JSON.stringify({ protocolVersion: 2, type: 'hello', payload: {
      backend: 'uxp', protocolVersion: 2, commands: {
        'events.wait': { supported: true }, 'state.get': { supported: true },
        'test.mutation': { supported: true }
      }
    } }));
    await until(() => clients.every(c => c.getState().connected));
    const waiting = clients[0].request('events.wait').catch(error => { throw error; });
    await until(() => completeWait);
    const state = clients[1].request('state.get');
    const mutation = clients[2].request('test.mutation');
    await Promise.all([waiting, state, mutation]);
    assert.deepEqual(order, ['events.wait', 'state.get', 'test.mutation']);
    assert.equal(hub.queued, 0);
  } finally {
    completeWait?.(); panel?.terminate();
    await Promise.all(clients.map(c => c.stop())); await hub.stop();
  }
});
