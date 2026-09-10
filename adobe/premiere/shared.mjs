import { EventEmitter } from 'node:events';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { WebSocket, WebSocketServer, UxpWebSocketBridge, UxpBridgeError } from './runtime.mjs';

const CLIENT_PATH = '/mcp-uxp-v1';
const MAX_TIMEOUT = 600_000;
// Only known observation/wait commands bypass the mutation queue. Unknown
// commands remain serialized, even if their names sound read-only.
const OBSERVATION_COMMANDS = new Set([
  'state.get', 'capabilities.get', 'events.list', 'events.wait',
  'readiness.snapshot', 'readiness.analysis.wait', 'readiness.operation.wait'
]);
function send(socket, message) {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
}
function sameToken(actual, expected) {
  const a = Buffer.from(actual), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// One local service owns the Adobe panel. MCP processes connect as authenticated
// clients, so a task starting or ending cannot steal the panel from another task.
export class UxpHub extends UxpWebSocketBridge {
  clients = new Set();
  queue = Promise.resolve();
  queued = 0;
  generation = 0;
  observations = new Set();
  activeMutation = null;
  stopping = false;
  async start() {
    if (this.httpServer) return;
    this.stopping = false;
    await super.start();
    this.clientServer = new WebSocketServer({ noServer: true, maxPayload: 1_048_576 });
    const nativeUpgrade = this.httpServer.listeners('upgrade')[0];
    this.httpServer.removeAllListeners('upgrade');
    this.httpServer.on('upgrade', (request, socket, head) => {
      let url;
      try { url = new URL(request.url, 'http://127.0.0.1'); }
      catch { socket.destroy(); return; }
      if (url.pathname !== CLIENT_PATH) return nativeUpgrade(request, socket, head);
      // Browser origins are never accepted on this privileged MCP-only route.
      if (request.headers.origin || !sameToken(request.headers.authorization ?? '', 'Bearer ' + this.options.token)) {
        socket.end('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');
        return;
      }
      this.clientServer.handleUpgrade(request, socket, head, client => this.acceptMcp(client));
    });
    this.updateClients = () => {
      this.generation++;
      this.broadcast({ type: 'state', state: this.getState() });
    };
    this.forwardEvent = event => this.broadcast({ type: 'event', event });
    this.on('connected', this.updateClients);
    this.on('disconnected', this.updateClients);
    this.on('event', this.forwardEvent);
    this.heartbeat = setInterval(() => {
      for (const client of this.clients) {
        if (!client.alive) client.terminate();
        else { client.alive = false; client.ping(); }
      }
    }, 15_000);
    this.heartbeat.unref();
  }
  broadcast(message) { for (const client of this.clients) send(client, { version: 1, ...message }); }
  getState() {
    return { ...super.getState(), recoveryRequired: this.activeMutation?.uncertain === true };
  }
  handleMessage(client, raw) {
    if (client !== this.socket) return;
    // The pinned upstream bridge forgets timed-out requests. Retain our own
    // fence until a terminal result for that exact dispatch/socket is received.
    let message;
    try { message = JSON.parse(raw); } catch { /* upstream closes invalid JSON */ }
    const active = this.activeMutation;
    const terminal = active?.hostId && active.socket === client &&
      message?.protocolVersion === this.hello?.protocolVersion &&
      message?.type === 'result' && message.requestId === active.hostId &&
      typeof message.payload?.ok === 'boolean';
    if (terminal) active.completed = true;
    super.handleMessage(client, raw);
    if (terminal && active.uncertain) {
      this.activeMutation = null;
      this.broadcast({ type: 'state', state: this.getState() });
    }
  }
  async dispatchMutation(client, message) {
    if (this.activeMutation) throw new UxpBridgeError('UXP_STATE_UNCERTAIN',
      'Earlier edit has no confirmed completion. Inspect the host; edits remain blocked until its result arrives. If lost, close Premiere and restart this shared service.');
    const active = { client, clientId: message.id, socket: this.socket, completed: false, uncertain: false };
    this.activeMutation = active;
    // v1.14.5 inserts the native request synchronously, before returning its
    // promise. Capture that ID for cancellation and late-result correlation.
    const before = new Set(this.pending.keys());
    const response = super.request(message.command, message.args ?? {}, { minimumTimeoutMs: message.minimumTimeoutMs ?? 0 });
    active.hostId = [...this.pending.keys()].find(id => !before.has(id));
    try { return await response; }
    catch (error) {
      if (active.hostId && !active.completed) {
        active.uncertain = true;
        this.broadcast({ type: 'state', state: this.getState() });
      }
      throw error;
    } finally {
      if (!active.hostId || active.completed) this.activeMutation = null;
    }
  }
  async cancelActive(client, requestId) {
    const active = this.activeMutation;
    if (!active || active.client !== client || typeof requestId !== 'string' ||
        !active.hostId || ![active.clientId, active.hostId].includes(requestId))
      throw new UxpBridgeError('UXP_CANCEL_FORBIDDEN', 'Only the originating connection may cancel its active request');
    if (active.socket !== this.socket || !this.getState().connected)
      throw new UxpBridgeError('UXP_CANCEL_UNAVAILABLE', 'The original panel connection is unavailable');
    // Cancellation acceptance is not a terminal result and never clears a
    // mutation fence. Forward the host's accepted/reason fields unchanged.
    if (!active.cancellation) active.cancellation = super.request('operation.cancel', { requestId: active.hostId });
    try { return await active.cancellation; }
    finally { active.cancellation = null; }
  }
  acceptMcp(client) {
    this.clients.add(client);
    client.alive = true;
    client.cancelled = new Set();
    client.on('pong', () => { client.alive = true; });
    client.on('close', () => this.clients.delete(client));
    client.on('error', () => {});
    send(client, { version: 1, type: 'state', state: this.getState() });
    client.on('message', raw => {
      let message;
      try { message = JSON.parse(raw); } catch { client.close(1007); return; }
      if (!message || message.version !== 1 || typeof message.id !== 'string' || message.id.length > 64) { client.close(1008); return; }
      if (message.type === 'cancel') {
        if (client.cancelled.size < 64) client.cancelled.add(message.id);
        if (this.activeMutation?.client === client && this.activeMutation.clientId === message.id)
          void this.cancelActive(client, message.id).catch(() => {});
        return;
      }
      if (message.type !== 'request' || typeof message.command !== 'string' || message.command.length > 200 ||
          !Number.isFinite(message.expiresAt) || message.expiresAt > Date.now() + MAX_TIMEOUT + 5000 ||
          (message.minimumTimeoutMs !== undefined && (!Number.isInteger(message.minimumTimeoutMs) || message.minimumTimeoutMs < 0 || message.minimumTimeoutMs > MAX_TIMEOUT))) {
        client.close(1008); return;
      }
      const control = message.command === 'operation.cancel';
      if (this.queued >= (control ? 64 : 32)) {
        send(client, { version: 1, type: 'result', id: message.id, ok: false, error: { code: 'UXP_BUSY', message: 'UXP queue is full; command was not sent' } });
        return;
      }
      const generation = this.generation;
      this.queued++;
      const execute = async () => {
        try {
          if (this.stopping) throw new UxpBridgeError('UXP_STOPPED', 'Shared service stopped before dispatch');
          if (client.readyState !== WebSocket.OPEN || client.cancelled.has(message.id) || Date.now() >= message.expiresAt)
            throw new UxpBridgeError('UXP_EXPIRED', 'Command expired before dispatch');
          if (generation !== this.generation) throw new UxpBridgeError('UXP_RECONNECTED', 'Panel connection changed before dispatch; command was not sent');
          const result = control
            ? await this.cancelActive(client, message.args?.requestId)
            : OBSERVATION_COMMANDS.has(message.command)
              ? await super.request(message.command, message.args ?? {}, { minimumTimeoutMs: message.minimumTimeoutMs ?? 0 })
              : await this.dispatchMutation(client, message);
          send(client, { version: 1, type: 'result', id: message.id, ok: true, result });
        } catch (error) {
          send(client, { version: 1, type: 'result', id: message.id, ok: false, error: { code: error.code ?? 'UXP_COMMAND_FAILED', message: error.message } });
        } finally { this.queued--; client.cancelled.delete(message.id); }
      };
      if (control || OBSERVATION_COMMANDS.has(message.command)) {
        const operation = execute();
        this.observations.add(operation);
        void operation.finally(() => this.observations.delete(operation));
      } else {
        this.queue = this.queue.then(execute);
      }
    });
  }
  async stop() {
    this.stopping = true;
    clearInterval(this.heartbeat);
    if (this.updateClients) {
      this.off('connected', this.updateClients);
      this.off('disconnected', this.updateClients);
      this.off('event', this.forwardEvent);
    }
    for (const client of this.clients) client.terminate();
    this.clients.clear();
    this.clientServer?.close();
    await super.stop();
    await this.queue;
    await Promise.allSettled([...this.observations]);
  }
}

export class SharedUxpClient extends EventEmitter {
  state = { status: 'stopped', connected: false };
  pending = new Map();
  stopped = true;
  constructor({ port, token, retryMs = 1000, requestTimeoutMs = 30_000, ensureService }) {
    super();
    if (!Number.isInteger(port) || port < 1 || port > 65535 || typeof token !== 'string' || token.length < 16)
      throw new Error('Invalid shared UXP connection settings');
    Object.assign(this, { port, token, retryMs, requestTimeoutMs, ensureService });
  }
  async start() {
    if (!this.stopped) return;
    this.stopped = false;
    this.connect();
    await new Promise(resolve => {
      const done = () => { clearTimeout(timer); this.off('service', done); resolve(); };
      const timer = setTimeout(done, 3000);
      this.once('service', done);
    });
  }
  connect() {
    if (this.stopped) return;
    clearTimeout(this.retryTimer);
    const socket = new WebSocket(`ws://127.0.0.1:${this.port}${CLIENT_PATH}`, {
      headers: { Authorization: 'Bearer ' + this.token }, handshakeTimeout: 2500, maxPayload: 2_097_152
    });
    this.socket = socket;
    let handshake = false;
    const handshakeTimer = setTimeout(() => { if (!handshake) socket.terminate(); }, 3000);
    socket.on('error', error => {
      // Only an absent listener permits service startup; never launch over an
      // unrelated listener or an authentication failure.
      if (error.code === 'ECONNREFUSED' && !this.stopped && this.ensureService && Date.now() - (this.lastLaunch ?? 0) > 5000) {
        this.lastLaunch = Date.now();
        Promise.resolve().then(this.ensureService).catch(() => this.emit('diagnostic', 'service-start-failed'));
      }
    });
    socket.on('message', raw => {
      if (socket !== this.socket) return;
      let message;
      try { message = JSON.parse(raw); } catch { socket.terminate(); return; }
      if (!message || message.version !== 1) { socket.terminate(); return; }
      if (message.type === 'state' && message.state && typeof message.state.connected === 'boolean') {
        const wasConnected = this.state.connected;
        this.state = message.state;
        handshake = true;
        clearTimeout(handshakeTimer);
        this.emit('service');
        if (wasConnected !== this.state.connected) this.emit(this.state.connected ? 'connected' : 'disconnected', this.state);
      } else if (message.type === 'event') this.emit('event', message.event);
      else if (message.type === 'result') {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        clearTimeout(pending.timer);
        this.pending.delete(message.id);
        if (message.ok) pending.resolve(message.result);
        else pending.reject(new UxpBridgeError(message.error?.code ?? 'UXP_COMMAND_FAILED', message.error?.message ?? 'UXP command failed'));
      }
    });
    socket.on('close', () => {
      clearTimeout(handshakeTimer);
      if (socket !== this.socket) return;
      this.state = { status: 'stopped', connected: false };
      this.failPending('UXP_DISCONNECTED', 'Shared UXP service disconnected; sent commands are never replayed');
      this.emit('disconnected');
      if (!this.stopped) this.retryTimer = setTimeout(() => this.connect(), this.retryMs);
    });
  }
  getState() { return this.state; }
  address() { return { host: '127.0.0.1', port: this.port, path: '/uxp' }; }
  request(command, args = {}, requestOptions = {}) {
    if (!this.state.connected || this.socket?.readyState !== WebSocket.OPEN)
      return Promise.reject(new UxpBridgeError('UXP_NOT_CONNECTED', 'Premiere UXP panel is not connected to the shared service'));
    const minimumTimeoutMs = requestOptions.minimumTimeoutMs ?? 0;
    if (!Number.isInteger(minimumTimeoutMs) || minimumTimeoutMs < 0 || minimumTimeoutMs > MAX_TIMEOUT)
      return Promise.reject(new Error('Invalid UXP minimum request timeout'));
    const timeout = Math.max(this.requestTimeoutMs, minimumTimeoutMs) + 5000;
    const id = randomUUID();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        send(this.socket, { version: 1, type: 'cancel', id });
        reject(new UxpBridgeError('UXP_TIMEOUT', 'UXP request timed out; it will not be replayed'));
      }, timeout);
      this.pending.set(id, { resolve, reject, timer });
      send(this.socket, { version: 1, type: 'request', id, command, args, minimumTimeoutMs, expiresAt: Date.now() + timeout });
    });
  }
  failPending(code, message) {
    for (const pending of this.pending.values()) { clearTimeout(pending.timer); pending.reject(new UxpBridgeError(code, message)); }
    this.pending.clear();
  }
  async stop() {
    this.stopped = true;
    clearTimeout(this.retryTimer);
    this.socket?.terminate();
    this.state = { status: 'stopped', connected: false };
    this.failPending('UXP_STOPPED', 'MCP client stopped');
  }
}
