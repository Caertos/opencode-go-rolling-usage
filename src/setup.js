// Registers the OpenCode TUI plugin in the user's tui.json so that, after
// installing the package, simply opening OpenCode is enough.
//
// Everything here is best-effort and idempotent: it never throws on a missing
// or unparseable config, and it never removes anything the user already has.

import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';

/** The plugin spec to register. Matches the package name / exports["./tui"]. */
export const PLUGIN_SPEC = 'opencode-go-rolling-usage';

/** Candidate tui config files, in order of preference. */
export function tuiConfigCandidates(env = process.env) {
  if (env.OPENCODE_TUI_CONFIG && env.OPENCODE_TUI_CONFIG.trim()) {
    return [env.OPENCODE_TUI_CONFIG.trim()];
  }
  const base =
    (env.XDG_CONFIG_HOME && env.XDG_CONFIG_HOME.trim()) ||
    join(homedir(), '.config');
  const dir = join(base, 'opencode');
  return [join(dir, 'tui.json'), join(dir, 'tui.jsonc')];
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
 * Ensure `spec` is present in the `plugin` array of the OpenCode TUI config.
 * Returns `{ ok, changed, file, reason? }`.
 */
export async function registerPlugin(options = {}) {
  const candidates = options.file
    ? [options.file]
    : tuiConfigCandidates(options.env);
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
    json = { $schema: 'https://opencode.ai/tui.json' };
  }

  if (!Array.isArray(json.plugin)) json.plugin = [];
  if (json.plugin.includes(spec)) {
    return { ok: true, changed: false, file };
  }

  json.plugin.push(spec);
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
