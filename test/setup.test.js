import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  registerPlugin,
  PLUGIN_SPEC,
  CLI_SCHEMA,
  cliConfigCandidates,
} from '../src/setup.js';

async function tempFile(name) {
  const dir = await mkdtemp(join(tmpdir(), 'ogr-'));
  return join(dir, name);
}

describe('cliConfigCandidates', () => {
  it('honors XDG_CONFIG_HOME', () => {
    expect(cliConfigCandidates({ XDG_CONFIG_HOME: '/cfg' })).toEqual([
      join('/cfg', 'opencode', 'cli.json'),
    ]);
  });
});

describe('registerPlugin', () => {
  it('creates a new config with the plugin', async () => {
    const file = await tempFile('cli.json');
    const res = await registerPlugin({ file });
    expect(res).toMatchObject({ ok: true, changed: true, file });
    const json = JSON.parse(await readFile(file, 'utf8'));
    expect(json.plugins).toContain(PLUGIN_SPEC);
    expect(json.$schema).toBe(CLI_SCHEMA);
  });

  it('is idempotent', async () => {
    const file = await tempFile('cli.json');
    await registerPlugin({ file });
    const res = await registerPlugin({ file });
    expect(res.changed).toBe(false);
    const json = JSON.parse(await readFile(file, 'utf8'));
    expect(json.plugins.filter((p) => p === PLUGIN_SPEC)).toHaveLength(1);
  });

  it('preserves existing entries', async () => {
    const file = await tempFile('cli.json');
    await writeFile(
      file,
      `${JSON.stringify({ plugins: ['other'] }, null, 2)}\n`
    );
    await registerPlugin({ file });
    const json = JSON.parse(await readFile(file, 'utf8'));
    expect(json.plugins).toEqual(['other', PLUGIN_SPEC]);
  });

  it('leaves an unparseable config untouched', async () => {
    const file = await tempFile('cli.json');
    const original = '{\n  // comment\n  "plugins": []\n}\n';
    await writeFile(file, original);
    const res = await registerPlugin({ file });
    expect(res.ok).toBe(false);
    expect(await readFile(file, 'utf8')).toBe(original);
  });
});
