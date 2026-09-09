import { readFileSync } from 'node:fs';
export function connectionSettings() {
  const file = process.env.AHILL_PREMIERE_SETTINGS;
  if (!file) throw new Error('Run toolkit.py mcp premiere to create private connection settings.');
  const { port, token } = JSON.parse(readFileSync(file, 'utf8'));
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid local UXP port');
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) throw new Error('Invalid local UXP token');
  return { port, token };
}
