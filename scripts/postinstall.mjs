#!/usr/bin/env node
// npm/pnpm postinstall hook.
//
// Registers the OpenCode TUI plugin in the user's tui.json so that opening
// OpenCode is enough after installing. Best-effort and silent: it must never
// break an install.
//
// It only acts on global installs (npm_config_global) or when explicitly
// forced with OPENCODE_GO_ROLLING_USAGE_SETUP=1 (the Homebrew formula does
// this, since Homebrew skips npm lifecycle scripts).

const forced = process.env.OPENCODE_GO_ROLLING_USAGE_SETUP === '1';
const isGlobal =
  String(process.env.npm_config_global || '').toLowerCase() === 'true' ||
  process.env.npm_config_global === '1';

if (process.env.CI || (!isGlobal && !forced)) {
  process.exit(0);
}

try {
  const { registerPlugin } = await import('../dist/setup.js');
  const result = await registerPlugin();
  if (result.ok && result.changed) {
    process.stderr.write(
      `[opencode-go-rolling-usage] registered the TUI plugin in ${result.file}\n`,
    );
  }
} catch {
  // Never fail the install because of this.
}
process.exit(0);
