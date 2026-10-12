// No-op server entrypoint for OpenCode v1 and v2.
//
// This package is two things: a CLI (`bin` -> dist/index.js) and a plugin
// (`exports["./tui"]` -> dist/tui.js). This file exists so the package can also
// be resolved as a server plugin (e.g. when listed in `opencode.jsonc` plugins)
// without ever importing the CLI, which runs on import. It intentionally does
// nothing.
//
// v2 calls `setup()`; v1 calls `server()`. Neither imports a plugin core
// package, so the entry loads under either runtime.

export default {
  id: 'opencode-go-rolling-usage',
  setup() {},
  async server() {
    return {};
  },
};
