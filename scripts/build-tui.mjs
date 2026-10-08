// Compiles the TUI plugin (src/tui.tsx) into dist/tui.js with explicit
// "@opentui/solid" imports.
//
// OpenCode loads npm plugins by resolving explicit imports from the plugin's
// own location; a bare `@jsxImportSource` pragma is NOT resolved for cached npm
// plugins (only for local file plugins). Compiling ahead of time — exactly like
// the working community plugins do — makes the loader happy.

import { transformAsync } from '@babel/core';
import ts from '@babel/preset-typescript';
import solid from 'babel-preset-solid';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'src', 'tui.tsx');
const target = join(root, 'dist', 'tui.js');

const code = await readFile(source, 'utf8');
const result = await transformAsync(code, {
  filename: 'tui.tsx',
  configFile: false,
  babelrc: false,
  presets: [
    [solid, { moduleName: '@opentui/solid', generate: 'universal' }],
    [ts],
  ],
});

if (!result || typeof result.code !== 'string') {
  throw new Error('Failed to compile src/tui.tsx');
}

await mkdir(dirname(target), { recursive: true });
await writeFile(target, result.code);
process.stdout.write('built dist/tui.js\n');
