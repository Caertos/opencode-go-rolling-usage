# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2026-10-11

### Added

- Support for OpenCode **v1 and v2** from the same package. `dist/tui.js` now
  targets both plugin APIs (`setup` for v2, `tui` for v1) without importing a
  plugin core package, so one installed version works on either runtime.

### Changed

- `ogr setup` (and the `postinstall` hook) now registers the plugin in both the
  v2 `~/.config/opencode/cli.json` (`plugins`) and the v1
  `~/.config/opencode/tui.json` (`plugin`), whichever exists.
- `peerDependencies` no longer require `@opencode/plugin` /
  `@opencode-ai/plugin` (the plugin core is not imported at runtime);
  `@opentui/core` / `@opentui/solid` now require `>=0.5.10`.

### Fixed

- Restored OpenCode v1 support that the 0.2.0 v2-only port had dropped.

## [0.2.0] - 2026-10-11

### Changed

- **Breaking: requires OpenCode v2.** The TUI plugin was ported to the v2 CLI
  plugin API (`@opencode/plugin/tui`, `Plugin.define` + `setup`, the
  `sidebar.content` slot, `ctx.ui.slot` / `ctx.data.on`, and the resolved theme
  tokens). OpenCode v1 no longer loads it.
- `ogr setup` and the `postinstall` hook now register the plugin in
  `~/.config/opencode/cli.json` (the `plugins` array) instead of `tui.json`
  (the v1 `plugin` array), matching OpenCode v2's single global CLI config.
- `peerDependencies` now require `@opencode/plugin >=2 <3` and
  `@opentui/core` / `@opentui/solid` `>=0.5.10`.

### Removed

- OpenCode v1 support (`@opencode-ai/plugin`, `tui.json` registration).

## [0.1.4] - 2026-10-08

### Fixed

- The TUI plugin is now compiled ahead of time (`src/tui.tsx` -> `dist/tui.js`)
  with explicit `@opentui/solid` imports. OpenCode loads npm plugins by resolving
  explicit imports from the plugin location; a bare `@jsxImportSource` pragma is
  only resolved for local file plugins, so the plugin previously failed to load
  from OpenCode's plugin cache.

## [0.1.3] - 2026-10-08

### Fixed

- The TUI plugin now declares `peerDependencies` (`@opentui/solid`, `@opentui/core`,
  `@opencode-ai/plugin`, `solid-js`). OpenCode installs these into its plugin
  cache; without them the plugin failed to load with "Cannot find package
  '@opentui/solid'".

## [0.1.2] - 2026-10-08

### Added

- Documented what to do when the `postinstall` hook does not run (pnpm's script
  gate, Homebrew's sandbox, `npm install --ignore-scripts`, CI) — run `ogr setup`
  or add the package to `tui.json` by hand. `ogr --help` now describes the `setup`
  command.

## [0.1.1] - 2026-10-08

### Added

- The package now ships the TUI plugin as a proper npm plugin via
  `exports["./tui"]`, so `tui.json` can reference it by package name.
- Zero-config setup: installing the package (npm/pnpm global, or Homebrew)
  registers the TUI plugin in `tui.json`, so opening OpenCode is enough. It can
  also be run on demand with `ogr setup`.

### Fixed

- The TUI plugin is no longer referenced by an absolute path outside the OpenCode
  config directory, which OpenCode does not load.

## [0.1.0] - 2026-10-08

### Added

- CLI (`opencode-go-rolling-usage` / `ogr`) that prints the OpenCode Go rolling
  (5h), weekly and monthly quota with color-coded progress bars and a reset
  countdown.
- Options: `--json`, `--key`, `--base-url`, `--color` / `--no-color`, `--help`,
  `--version`.
- OpenCode TUI plugin that renders the quota in the session sidebar, refreshing
  on every `session.idle` and every 90 seconds.
- Pure formatting helpers shared by the CLI and the plugin (4-level color scale:
  green <40%, yellow 40–59%, orange 60–79%, red ≥80%).
- Unit tests for formatting, the usage client and the terminal renderer.
- GitHub Actions: CI (lint, format, test, build on Node 18/20/22 + security
  audit), npm release via Trusted Publishing, and a Homebrew formula bumper.

[0.1.0]: https://github.com/Caertos/opencode-go-rolling-usage/releases/tag/v0.1.0
