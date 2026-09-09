import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { UxpHub } from './shared.mjs';
import { WebSocket } from './runtime.mjs';

test('portable launcher completes an MCP handshake and lists tools against an isolated hub', {timeout: 15000}, async () => {
  const token = 'b'.repeat(64);
  const hub = new UxpHub({port: 0, token});
  const directory = mkdtempSync(join(tmpdir(), 'ahill-launcher-'));
  let child, panel;
  try {
    await hub.start();
    const port = hub.address().port;
    const settings = join(directory, 'private.json');
    writeFileSync(settings, JSON.stringify({port, token}));
    panel = new WebSocket('ws://127.0.0.1:' + port + '/uxp?token=' + token);
    await once(panel, 'open');
    panel.send(JSON.stringify({protocolVersion: 2, type: 'hello', payload: {
      backend: 'uxp', protocolVersion: 2, commands: {'state.get': {supported: true}}
    }}));
    child = spawn(process.execPath, [fileURLToPath(new URL('./launcher.mjs', import.meta.url))], {
      env: {...process.env, AHILL_PREMIERE_SETTINGS: settings},
      stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true
    });
    let buffer = '', errorLog = '';
    const messages = new Map(), pending = new Map();
    child.stderr.on('data', chunk => { errorLog += chunk.toString(); });
    child.stdout.on('data', chunk => {
      buffer += chunk.toString();
      const lines = buffer.split('\n'); buffer = lines.pop();
      for (const line of lines) {
        if (!line.trim()) continue;
        const msg = JSON.parse(line);
        messages.set(msg.id, msg);
        pending.get(msg.id)?.(msg);
      }
    });
    const wait = id => new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('MCP response missing: ' + errorLog)), 7000);
      const finish = message => { clearTimeout(timer); resolve(message); };
      if (messages.has(id)) finish(messages.get(id));
      else pending.set(id, finish);
    });
    child.stdin.write(JSON.stringify({jsonrpc: '2.0', id: 1, method: 'initialize', params: {
      protocolVersion: '2025-11-25', capabilities: {}, clientInfo: {name: 'ahill-test', version: '0.1.0'}
    }}) + '\n');
    assert.ok((await wait(1)).result?.serverInfo);
    child.stdin.write(JSON.stringify({jsonrpc: '2.0', method: 'notifications/initialized'}) + '\n');
    child.stdin.write(JSON.stringify({jsonrpc: '2.0', id: 2, method: 'tools/list'}) + '\n');
    const response = await wait(2);
    assert.ok(response.result?.tools.some(tool => tool.name === 'get_uxp_capabilities'), JSON.stringify(response));
    assert.ok(response.result.tools.length > 10);
  } finally {
    if (child && child.exitCode === null) {
      const closed = once(child, 'exit');
      child.stdin.end();
      const timer = setTimeout(() => child.kill(), 2000);
      await closed;
      clearTimeout(timer);
    }
    panel?.terminate();
    await hub.stop();
    rmSync(directory, {recursive: true});
  }
});
