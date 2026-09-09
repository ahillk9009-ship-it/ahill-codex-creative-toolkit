import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { SharedUxpClient } from './shared.mjs';
import { connectionSettings } from './settings.mjs';
export function createSharedClient() {
  return new SharedUxpClient({ ...connectionSettings(), ensureService() {
    const child = spawn(process.execPath, [fileURLToPath(new URL('./service.mjs', import.meta.url))], {
      detached: true, windowsHide: true, stdio: 'ignore'
    });
    child.on('error', () => {});
    child.unref();
  } });
}
