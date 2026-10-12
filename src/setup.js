// Registers the OpenCode plugin in the user's config so that, after installing
// the package, simply opening OpenCode is enough.
//
// The same package supports OpenCode v1 and v2, which use different config
// files:
//   - v2: one global `cli.json` with a `plugins` array.
//   - v1: layered `tui.json(c)` files with a `plugin` array.
//
// `registerPlugin` ensures the entry in both, so whichever OpenCode the user
// runs the plugin is registered. Everything here is best-effort and idempotent:
// it never throws on a missing or unparseable config, and it never removes
// anything the user already has.

import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';

/** The plugin spec to register. Matches the package name / exports["./tui"]. */
export const PLUGIN_SPEC = 'opencode-go-rolling-usage';

/** Schema OpenCode writes into a freshly created v2 cli.json. */
export const CLI_SCHEMA = 'https://opencode.ai/v2/cli.json';

/** Schema OpenCode v1 wrote into a freshly created tui.json. */
export const TUI_SCHEMA = 'https://opencode.ai/tui.json';

function configBase(env) {
  return (
    (env.XDG_CONFIG_HOME && env.XDG_CONFIG_HOME.trim()) ||
    join(homedir(), '.config')
  );
}

/**
 * Candidate OpenCode v2 CLI config files, in order of preference. v2 reads one
 * global file: `$XDG_CONFIG_HOME/opencode/cli.json` (or `~/.config/opencode/`).
 */
export function cliConfigCandidates(env = process.env) {
  return [join(configBase(env), 'opencode', 'cli.json')];
}

/** Candidate OpenCode v1 TUI config files, in order of preference. */
export function tuiConfigCandidates(env = process.env) {
  if (env.OPENCODE_TUI_CONFIG && env.OPENCODE_TUI_CONFIG.trim()) {
    return [env.OPENCODE_TUI_CONFIG.trim()];
  }
  const dir = join(configBase(env), 'opencode');
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

/** Prefer an existing candidate; otherwise the first one (to create). */
async function pickFile(candidates) {
  for (const candidate of candidates) {
    if (await exists(candidate)) return candidate;
  }
  return candidates[0];
}

/**
 * Ensure `spec` is present in the `json[key]` array of `file`.
 * Returns `{ ok, changed, file, reason? }`.
 */
async function ensureInFile(file, { spec, key, schema }) {
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
    json = { $schema: schema };
  }

  if (!Array.isArray(json[key])) json[key] = [];
  if (json[key].includes(spec)) {
    return { ok: true, changed: false, file };
  }

  json[key].push(spec);
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

/**
 * Register the plugin in the OpenCode config.
 *
 * - With `options.file`, act on just that file using `options.key` (default
 *   `plugins`) — used by tests and explicit callers.
 * - Otherwise register for both runtimes: v2 `cli.json` (`plugins`) and v1
 *   `tui.json` (`plugin`), so whichever OpenCode the user runs, it is set up.
 *
 * Returns `{ ok, changed, file, files }`; `files` lists each per-file result.
 */
export async function registerPlugin(options = {}) {
  const spec = options.spec || PLUGIN_SPEC;

  if (options.file) {
    return ensureInFile(options.file, {
      spec,
      key: options.key || 'plugins',
      schema: options.schema || CLI_SCHEMA,
    });
  }

  const [cli, tui] = await Promise.all([
    ensureInFile(await pickFile(cliConfigCandidates(options.env)), {
      spec,
      key: 'plugins',
      schema: CLI_SCHEMA,
    }),
    ensureInFile(await pickFile(tuiConfigCandidates(options.env)), {
      spec,
      key: 'plugin',
      schema: TUI_SCHEMA,
    }),
  ]);

  return {
    ok: cli.ok && tui.ok,
    changed: Boolean(cli.changed || tui.changed),
    file: cli.file,
    files: [cli, tui],
  };
}
