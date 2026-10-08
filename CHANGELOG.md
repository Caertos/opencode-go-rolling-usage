# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
