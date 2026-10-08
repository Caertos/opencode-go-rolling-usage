import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  registerPlugin,
  PLUGIN_SPEC,
  tuiConfigCandidates,
} from '../src/setup.js';

async function tempFile(name) {
  const dir = await mkdtemp(join(tmpdir(), 'ogr-'));
  return join(dir, name);
}

describe('tuiConfigCandidates', () => {
  it('honors OPENCODE_TUI_CONFIG', () => {
    expect(tuiConfigCandidates({ OPENCODE_TUI_CONFIG: '/x/tui.json' })).toEqual(
      ['/x/tui.json']
    );
  });

  it('honors XDG_CONFIG_HOME', () => {
    expect(tuiConfigCandidates({ XDG_CONFIG_HOME: '/cfg' })).toEqual([
      join('/cfg', 'opencode', 'tui.json'),
      join('/cfg', 'opencode', 'tui.jsonc'),
    ]);
  });
});

describe('registerPlugin', () => {
  it('creates a new config with the plugin', async () => {
    const file = await tempFile('tui.json');
    const res = await registerPlugin({ file });
    expect(res).toMatchObject({ ok: true, changed: true, file });
    const json = JSON.parse(await readFile(file, 'utf8'));
    expect(json.plugin).toContain(PLUGIN_SPEC);
  });

  it('is idempotent', async () => {
    const file = await tempFile('tui.json');
    await registerPlugin({ file });
    const res = await registerPlugin({ file });
    expect(res.changed).toBe(false);
    const json = JSON.parse(await readFile(file, 'utf8'));
    expect(json.plugin.filter((p) => p === PLUGIN_SPEC)).toHaveLength(1);
  });

  it('preserves existing entries', async () => {
    const file = await tempFile('tui.json');
    await writeFile(
      file,
      `${JSON.stringify({ plugin: ['other'] }, null, 2)}\n`
    );
    await registerPlugin({ file });
    const json = JSON.parse(await readFile(file, 'utf8'));
    expect(json.plugin).toEqual(['other', PLUGIN_SPEC]);
  });

  it('leaves an unparseable config untouched', async () => {
    const file = await tempFile('tui.jsonc');
    const original = '{\n  // comment\n  "plugin": []\n}\n';
    await writeFile(file, original);
    const res = await registerPlugin({ file });
    expect(res.ok).toBe(false);
    expect(await readFile(file, 'utf8')).toBe(original);
  });
});
