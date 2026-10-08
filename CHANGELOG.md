# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
