import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  registerPlugin,
  PLUGIN_SPEC,
  CLI_SCHEMA,
  TUI_SCHEMA,
  cliConfigCandidates,
  tuiConfigCandidates,
} from '../src/setup.js';

async function tempDir() {
  return mkdtemp(join(tmpdir(), 'ogr-'));
}

describe('config candidates', () => {
  it('cli honors XDG_CONFIG_HOME', () => {
    expect(cliConfigCandidates({ XDG_CONFIG_HOME: '/cfg' })).toEqual([
      join('/cfg', 'opencode', 'cli.json'),
    ]);
  });

  it('tui honors OPENCODE_TUI_CONFIG', () => {
    expect(tuiConfigCandidates({ OPENCODE_TUI_CONFIG: '/x/tui.json' })).toEqual(
      ['/x/tui.json']
    );
  });

  it('tui honors XDG_CONFIG_HOME', () => {
    expect(tuiConfigCandidates({ XDG_CONFIG_HOME: '/cfg' })).toEqual([
      join('/cfg', 'opencode', 'tui.json'),
      join('/cfg', 'opencode', 'tui.jsonc'),
    ]);
  });
});

describe('registerPlugin (single file)', () => {
  it('creates a v2 config with the plugin', async () => {
    const file = join(await tempDir(), 'cli.json');
    const res = await registerPlugin({ file });
    expect(res).toMatchObject({ ok: true, changed: true, file });
    const json = JSON.parse(await readFile(file, 'utf8'));
    expect(json.plugins).toContain(PLUGIN_SPEC);
    expect(json.$schema).toBe(CLI_SCHEMA);
  });

  it('supports the v1 key and schema', async () => {
    const file = join(await tempDir(), 'tui.json');
    const res = await registerPlugin({
      file,
      key: 'plugin',
      schema: TUI_SCHEMA,
    });
    expect(res).toMatchObject({ ok: true, changed: true, file });
    const json = JSON.parse(await readFile(file, 'utf8'));
    expect(json.plugin).toContain(PLUGIN_SPEC);
    expect(json.$schema).toBe(TUI_SCHEMA);
  });

  it('is idempotent', async () => {
    const file = join(await tempDir(), 'cli.json');
    await registerPlugin({ file });
    const res = await registerPlugin({ file });
    expect(res.changed).toBe(false);
    const json = JSON.parse(await readFile(file, 'utf8'));
    expect(json.plugins.filter((p) => p === PLUGIN_SPEC)).toHaveLength(1);
  });

  it('preserves existing entries', async () => {
    const file = join(await tempDir(), 'cli.json');
    await writeFile(
      file,
      `${JSON.stringify({ plugins: ['other'] }, null, 2)}\n`
    );
    await registerPlugin({ file });
    const json = JSON.parse(await readFile(file, 'utf8'));
    expect(json.plugins).toEqual(['other', PLUGIN_SPEC]);
  });

  it('leaves an unparseable config untouched', async () => {
    const file = join(await tempDir(), 'cli.json');
    const original = '{\n  // comment\n  "plugins": []\n}\n';
    await writeFile(file, original);
    const res = await registerPlugin({ file });
    expect(res.ok).toBe(false);
    expect(await readFile(file, 'utf8')).toBe(original);
  });
});

describe('registerPlugin (both runtimes)', () => {
  it('registers in cli.json (v2) and tui.json (v1), idempotently', async () => {
    const base = await tempDir();
    const env = { XDG_CONFIG_HOME: base };

    const res = await registerPlugin({ env });
    expect(res.ok).toBe(true);
    expect(res.changed).toBe(true);
    expect(res.files).toHaveLength(2);

    const cli = JSON.parse(
      await readFile(join(base, 'opencode', 'cli.json'), 'utf8')
    );
    const tui = JSON.parse(
      await readFile(join(base, 'opencode', 'tui.json'), 'utf8')
    );
    expect(cli.plugins).toContain(PLUGIN_SPEC);
    expect(tui.plugin).toContain(PLUGIN_SPEC);

    const again = await registerPlugin({ env });
    expect(again.ok).toBe(true);
    expect(again.changed).toBe(false);
  });
});
