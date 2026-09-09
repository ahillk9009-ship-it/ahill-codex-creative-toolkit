import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { createSharedClient } from './connect.mjs';
import { runtime, requireRuntime } from './runtime.mjs';

// One authenticated UXP service is shared by all Codex tasks. Keep inherited
// authority, tool-pack and CEP settings; this adapter changes only transport.
const bridge = createSharedClient();
await bridge.start();
if (process.argv.includes('--check')) {
  try {
    for (let i = 0; i < 20 && !bridge.getState().connected; i++) await delay(500);
    const state = bridge.getState();
    const report = { connected: state.connected, status: state.status, port: bridge.address().port };
    if (state.connected) {
      const hostState = await bridge.request('state.get');
      report.hostRoundTrip = true;
      report.projectOpen = hostState.projectOpen === true;
      report.sequenceOpen = hostState.sequenceOpen === true;
    }
    console.log(JSON.stringify(report));
    if (!report.hostRoundTrip) process.exitCode = 1;
  } finally { await bridge.stop(); }
} else {
  const { serveStdio } = await import(pathToFileURL(requireRuntime.resolve('@modelcontextprotocol/server/stdio')).href);
  const { createServer } = await import(pathToFileURL(runtime + 'server.js').href);
  const { getTelemetry } = await import(pathToFileURL(runtime + 'telemetry.js').href);
  process.env.PREMIERE_MCP_TRANSPORT = 'stdio';
  const telemetry = getTelemetry();
  const bridgeOptions = {
    tempDir: process.env.PREMIERE_TEMP_DIR,
    timeoutMs: process.env.PREMIERE_TIMEOUT_MS ? Number(process.env.PREMIERE_TIMEOUT_MS) : undefined
  };
  function log(event) {
    const line = `${new Date().toISOString()} pid=${process.pid} port=${bridge.address().port} ${event}\n`;
    console.error(line.trimEnd());
    try { appendFileSync(new URL('./premiere-uxp-runtime.log', import.meta.url), line); } catch {}
  }
  bridge.on('connected', () => log('shared-panel-connected'));
  bridge.on('disconnected', () => log('shared-panel-disconnected; automatic reconnect active'));
  const handle = serveStdio(() => createServer(bridgeOptions, { uxpBridge: bridge, telemetry }), {
    onerror: () => log('MCP-stdio-error')
  });
  log('MCP-ready; shared UXP registered');
  let stopping = false;
  async function shutdown() {
    if (stopping) return;
    stopping = true;
    await bridge.stop();
    await handle.close();
    await telemetry.shutdown();
  }
  process.stdin.once('end', () => void shutdown().finally(() => process.exit(0)));
  process.once('SIGINT', () => void shutdown().finally(() => process.exit(0)));
  process.once('SIGTERM', () => void shutdown().finally(() => process.exit(0)));
}
