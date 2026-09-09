const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const pluginPath = process.env.TEST_PANEL_PATH || path.join(__dirname, '../patches/premiere/files');
function fixture() {
  const source = fs.readFileSync(path.join(pluginPath, 'index.cjs'), 'utf8');
  const block = source.slice(source.indexOf('function connect() {'), source.indexOf('function publishOperation('));
  const sockets = [], timers = new Map(); let nextTimer = 0, disposed = 0;
  class Socket {
    static OPEN = 1;
    constructor(url) { this.url = url; this.readyState = 0; sockets.push(this); }
    close() { this.readyState = 3; this.onclose?.(); }
    send() {}
  }
  const context = vm.createContext({
    WebSocket: Socket, socket: null, reconnectTimer: null, connectTimer: null, connectionStopped: false, connectionGeneration: 0,
    document: { getElementById: id => ({ value: id === 'bridge-url' ? 'ws://127.0.0.1:7788/uxp' : 'test-token-not-secret-1234' }) },
    WorkspaceSupport: { validateLoopbackBridgeUrl: url => new URL(url) },
    commandRegistry: { dispose() { disposed++; } },
    capabilities: async () => ({}), Protocol: { envelope: () => ({}), serializeEnvelope: () => '{}' },
    dispatch() {}, publishState() {}, setStatus() {},
    setTimeout(fn, ms) { const id = ++nextTimer; timers.set(id, { fn, ms }); return id; },
    clearTimeout(id) { timers.delete(id); }
  });
  vm.runInContext(block + '; globalThis.api = {connect, disconnect};', context);
  return { api: context.api, sockets, timers, disposed: () => disposed };
}
test('a transport disconnect preserves the initialized Premiere command registry', () => {
  const f = fixture(); f.api.connect(); f.sockets[0].onclose();
  assert.equal(f.disposed(), 0);
  assert.equal([...f.timers.values()].filter(t => t.ms === 2000).length, 1);
  f.api.disconnect(); assert.equal(f.timers.size, 0);
});
test('a stale socket error cannot restart a newer connection', () => {
  const f = fixture(); f.api.connect(); const staleClose = f.sockets[0].onclose;
  f.api.connect(); staleClose();
  assert.equal([...f.timers.values()].filter(t => t.ms === 2000).length, 0);
  f.api.disconnect();
});
test('a hanging WebSocket receives a bounded retry', () => {
  const f = fixture(); f.api.connect();
  const deadline = [...f.timers.values()].find(t => t.ms === 8000);
  assert.ok(deadline, 'connection attempt has an eight-second watchdog');
  deadline.fn();
  assert.equal(f.sockets[0].readyState, 3);
  assert.equal([...f.timers.values()].filter(t => t.ms === 2000).length, 1);
  f.api.disconnect();
});
