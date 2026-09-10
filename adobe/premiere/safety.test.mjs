import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { UxpHub, SharedUxpClient } from './shared.mjs';
import { WebSocket } from './runtime.mjs';

const token = 'isolated-safety-tests-never-production';
async function until(check) {
  for (let i = 0; i < 200; i++) { if (check()) return; await delay(5); }
  assert.ok(check(), 'expected fixture state within one second');
}
async function fixture(t, handler, timeout = 1000) {
  const hub = new UxpHub({port: 0, token, requestTimeoutMs: timeout});
  await hub.start();
  const clients = [0, 1].map(() => new SharedUxpClient({port: hub.address().port, token, retryMs: 20}));
  const panels = [];
  t.after(async () => {
    for (const panel of panels) panel.terminate();
    await Promise.all(clients.map(client => client.stop()));
    await hub.stop();
  });
  await Promise.all(clients.map(client => client.start()));
  async function connectPanel() {
    const panel = new WebSocket(`ws://127.0.0.1:${hub.address().port}/uxp?token=${token}`);
    panels.push(panel);
    panel.on('message', async raw => {
      const message = JSON.parse(raw);
      const result = await handler(message);
      if (result !== undefined && panel.readyState === WebSocket.OPEN) panel.send(JSON.stringify({
        protocolVersion: 2, type: 'result', requestId: message.requestId, payload: {ok: true, result}
      }));
    });
    await once(panel, 'open');
    panel.send(JSON.stringify({protocolVersion: 2, type: 'hello', payload: {
      backend: 'uxp', protocolVersion: 2, commands: {
        'test.mutation': {supported: true}, 'state.get': {supported: true}, 'operation.cancel': {supported: true}
      }
    }}));
    await until(() => clients.every(client => client.getState().connected));
    return panel;
  }
  const panel = await connectPanel();
  return {hub, clients, panel, connectPanel};
}

test('timeout fences later mutations until the exact late host result arrives, without replay', async t => {
  let mutations = 0, active = 0, maxActive = 0;
  const {clients, hub} = await fixture(t, async command => {
    if (command.command === 'state.get') return {readable: true};
    mutations++; active++; maxActive = Math.max(maxActive, active);
    if (mutations === 1) await delay(200);
    active--; return {done: true};
  }, 40);
  const first = clients[0].request('test.mutation').catch(error => error.code);
  const queued = clients[1].request('test.mutation').catch(error => error.code);
  assert.equal(await first, 'UXP_TIMEOUT');
  assert.equal(await queued, 'UXP_STATE_UNCERTAIN');
  assert.equal(hub.getState().recoveryRequired, true);
  assert.deepEqual(await clients[1].request('state.get'), {readable: true});
  await assert.rejects(clients[0].request('test.mutation'), {code: 'UXP_STATE_UNCERTAIN'});
  await until(() => active === 0 && hub.getState().recoveryRequired === false);
  assert.equal(mutations, 1, 'rejected work must not be replayed after recovery');
  assert.deepEqual(await clients[0].request('test.mutation'), {done: true});
  assert.equal(maxActive, 1);
});

test('reconnecting the panel does not clear an uncertain in-flight mutation', async t => {
  let received = false;
  const {clients, panel, connectPanel} = await fixture(t, command => {
    if (command.command === 'test.mutation') { received = true; return undefined; }
    return {readable: true};
  });
  const mutation = clients[0].request('test.mutation').catch(error => error.code);
  await until(() => received);
  panel.terminate();
  assert.equal(await mutation, 'UXP_DISCONNECTED');
  await until(() => clients.every(client => !client.getState().connected));
  await connectPanel();
  await assert.rejects(clients[1].request('test.mutation'), {code: 'UXP_STATE_UNCERTAIN'});
  assert.deepEqual(await clients[1].request('state.get'), {readable: true});
});

test('owner cancellation bypasses the mutation queue and preserves host cancellation limits', async t => {
  let hostId, finished = false, cancellations = 0;
  const {clients} = await fixture(t, async command => {
    if (command.command === 'test.mutation') {
      hostId = command.requestId; await delay(300); finished = true; return {done: true};
    }
    cancellations++;
    return {accepted: false, reason: finished ? 'operation_not_active' : 'host_call_not_cancellable'};
  });
  const mutation = clients[0].request('test.mutation');
  await until(() => hostId);
  const outcome = await clients[0].request('operation.cancel', {requestId: hostId});
  assert.deepEqual(outcome, {accepted: false, reason: 'host_call_not_cancellable'});
  assert.equal(finished, false);
  assert.equal(cancellations, 1);
  await mutation;
});

test('another authenticated client cannot cancel someone else\'s operation', async t => {
  let hostId, cancellations = 0;
  const {clients} = await fixture(t, async command => {
    if (command.command === 'test.mutation') {
      hostId = command.requestId; await delay(150); return {done: true};
    }
    cancellations++; return {accepted: true};
  });
  const mutation = clients[0].request('test.mutation');
  await until(() => hostId);
  await assert.rejects(clients[1].request('operation.cancel', {requestId: hostId}), {code: 'UXP_CANCEL_FORBIDDEN'});
  assert.equal(cancellations, 0);
  await mutation;
});

test('cancellation acceptance and unrelated results never clear a timeout fence', async t => {
  let hostId;
  const {clients, hub, panel} = await fixture(t, command => {
    if (command.command === 'test.mutation') { hostId = command.requestId; return undefined; }
    if (command.command === 'operation.cancel') return {accepted: true, reason: 'cancellation_requested'};
    return {readable: true};
  }, 40);
  await assert.rejects(clients[0].request('test.mutation'), {code: 'UXP_TIMEOUT'});
  assert.deepEqual(await clients[0].request('operation.cancel', {requestId: hostId}),
    {accepted: true, reason: 'cancellation_requested'});
  panel.send(JSON.stringify({protocolVersion: 2, type: 'result', requestId: 'not-the-active-request', payload: {ok: true}}));
  await clients[1].request('state.get');
  assert.equal(hub.getState().recoveryRequired, true);
  await assert.rejects(clients[1].request('test.mutation'), {code: 'UXP_STATE_UNCERTAIN'});
  panel.send(JSON.stringify({protocolVersion: 2, type: 'result', requestId: hostId,
    payload: {ok: false, error: {code: 'UXP_OPERATION_CANCELLED', message: 'Cancelled before host call'}}}));
  await until(() => hub.getState().recoveryRequired === false);
});
