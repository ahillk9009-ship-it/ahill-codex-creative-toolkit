import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { connectionSettings } from './settings.mjs';

test('private settings validate local port and generated token without reading Codex config', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ahill-settings-'));
  const previous = process.env.AHILL_PREMIERE_SETTINGS;
  try {
    const file = join(dir, 'premiere.json');
    process.env.AHILL_PREMIERE_SETTINGS = file;
    writeFileSync(file, JSON.stringify({port: 17788, token: 'a'.repeat(64)}));
    assert.equal(connectionSettings().port, 17788);
    writeFileSync(file, JSON.stringify({port: 0, token: 'a'.repeat(64)}));
    assert.throws(connectionSettings, /port/);
    writeFileSync(file, JSON.stringify({port: 7788, token: 'short'}));
    assert.throws(connectionSettings, /token/);
  } finally {
    if (previous === undefined) delete process.env.AHILL_PREMIERE_SETTINGS;
    else process.env.AHILL_PREMIERE_SETTINGS = previous;
    rmSync(dir, {recursive: true});
  }
});
