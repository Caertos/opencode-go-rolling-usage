// Registers the OpenCode v2 CLI plugin in the user's cli.json so that, after
// installing the package, simply opening OpenCode is enough.
//
// OpenCode v1 used layered `tui.json` files with a `plugin` array; v2 replaced
// them with one global `cli.json` and a `plugins` array. Everything here is
// best-effort and idempotent: it never throws on a missing or unparseable
// config, and it never removes anything the user already has.

import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';

/** The plugin spec to register. Matches the package name / exports["./tui"]. */
export const PLUGIN_SPEC = 'opencode-go-rolling-usage';

/** Schema OpenCode v2 writes into a freshly created cli.json. */
export const CLI_SCHEMA = 'https://opencode.ai/v2/cli.json';

/**
 * Candidate CLI config files, in order of preference.
 *
 * OpenCode v2 reads a single global file: `$XDG_CONFIG_HOME/opencode/cli.json`
 * (or `~/.config/opencode/cli.json`). There is no project-local file and no
 * documented path override, unlike the v1 `OPENCODE_TUI_CONFIG`.
 */
export function cliConfigCandidates(env = process.env) {
  const base =
    (env.XDG_CONFIG_HOME && env.XDG_CONFIG_HOME.trim()) ||
    join(homedir(), '.config');
  return [join(base, 'opencode', 'cli.json')];
}

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

/**
 * Ensure `spec` is present in the `plugins` array of the OpenCode CLI config.
 * Returns `{ ok, changed, file, reason? }`.
 */
export async function registerPlugin(options = {}) {
  const candidates = options.file
    ? [options.file]
    : cliConfigCandidates(options.env);
  const spec = options.spec || PLUGIN_SPEC;

  // Pick the first existing file; default to the first candidate to create.
  let file = candidates[0];
  for (const candidate of candidates) {
    if (await exists(candidate)) {
      file = candidate;
      break;
    }
  }

  let json;
  if (await exists(file)) {
    let raw;
    try {
      raw = await readFile(file, 'utf8');
    } catch (error) {
      return {
        ok: false,
        changed: false,
        file,
        reason: `cannot read: ${error.message}`,
      };
    }
    try {
      json = JSON.parse(raw);
    } catch {
      return {
        ok: false,
        changed: false,
        file,
        reason: 'existing config is not plain JSON; leaving it untouched',
      };
    }
    if (!json || typeof json !== 'object' || Array.isArray(json)) {
      return {
        ok: false,
        changed: false,
        file,
        reason: 'unexpected config shape; leaving it untouched',
      };
    }
  } else {
    json = { $schema: CLI_SCHEMA };
  }

  if (!Array.isArray(json.plugins)) json.plugins = [];
  if (json.plugins.includes(spec)) {
    return { ok: true, changed: false, file };
  }

  json.plugins.push(spec);
  try {
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, `${JSON.stringify(json, null, 2)}\n`);
  } catch (error) {
    return {
      ok: false,
      changed: false,
      file,
      reason: `cannot write: ${error.message}`,
    };
  }
  return { ok: true, changed: true, file };
}
