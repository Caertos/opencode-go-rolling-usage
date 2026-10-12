// No-op server entrypoint for OpenCode v2.
//
// This package is two things: a CLI (`bin` -> dist/index.js) and an OpenCode v2
// CLI plugin (`exports["./tui"]` -> dist/tui.js). This file exists so the
// package can also be resolved as a server plugin (e.g. when listed in
// `opencode.jsonc` plugins) without ever importing the CLI, which runs on
// import. It intentionally does nothing.
import { Plugin } from '@opencode/plugin';

export default Plugin.define({
  id: 'opencode-go-rolling-usage',
  setup() {},
});
