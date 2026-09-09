import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(process.env.PREMIERE_MCP_ROOT || resolve(here, 'node_modules/premiere-pro-mcp'));
const metadata = JSON.parse(readFileSync(resolve(packageRoot, 'package.json'), 'utf8'));
if (metadata.name !== 'premiere-pro-mcp' || metadata.version !== '1.14.5') {
  throw new Error('This shared adapter supports premiere-pro-mcp 1.14.5. Revalidate before upgrading.');
}
export const runtime = resolve(packageRoot, 'dist') + '/';
export const requireRuntime = createRequire(pathToFileURL(runtime + 'index.js'));
export const { WebSocket, WebSocketServer } = requireRuntime('ws');
export const { UxpWebSocketBridge, UxpBridgeError } =
  await import(pathToFileURL(runtime + 'bridge/uxp-websocket-bridge.js').href);
