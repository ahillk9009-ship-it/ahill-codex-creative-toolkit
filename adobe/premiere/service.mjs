import { appendFileSync } from 'node:fs';
import { UxpHub } from './shared.mjs';
import { connectionSettings } from './settings.mjs';
function log(event) {
  try { appendFileSync(new URL('./service.log', import.meta.url), `${new Date().toISOString()} pid=${process.pid} ${event}\n`); } catch {}
}
const hub = new UxpHub(connectionSettings());
try {
  await hub.start();
  log('listening port=' + hub.address().port);
  hub.on('connected', () => log('panel-connected'));
  hub.on('disconnected', () => log('panel-disconnected; awaiting reconnect'));
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => void hub.stop().finally(() => process.exit(0)));
} catch (error) {
  if (error.code !== 'EADDRINUSE') log('startup-failed');
  process.exit(error.code === 'EADDRINUSE' ? 0 : 1);
}
