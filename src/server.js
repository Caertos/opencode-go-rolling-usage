// No-op server entrypoint.
//
// This package is two things: a CLI (`bin` -> dist/index.js) and an OpenCode
// TUI plugin (`exports["./tui"]` -> src/tui.tsx). This file exists only so the
// package can be resolved as a plugin without ever importing the CLI, which
// runs on import. It intentionally does nothing.
export default {};
