# opencode-go-rolling-usage

<p align="center">
  <img src="https://img.shields.io/npm/v/opencode-go-rolling-usage?color=blue&label=npm%20package" alt="npm version"/>
  <img src="https://img.shields.io/npm/dt/opencode-go-rolling-usage?color=green&label=downloads" alt="npm downloads"/>
  <img src="https://img.shields.io/badge/node-%3E%3D18-brightgreen" alt="node >= 18"/>
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="license MIT"/>
</p>

> **Keep an eye on your OpenCode Go quota — rolling (5h), weekly and monthly — right in your terminal and in the OpenCode TUI sidebar.**

`opencode-go-rolling-usage` reads the official OpenCode Go usage endpoint and
shows how much of each subscription window you have consumed, with a
color-coded progress bar and a countdown to the next reset. It ships two
frontends over the same data:

- **CLI** — `ogr show` prints the table (or JSON) in any terminal.
- **TUI plugin** — a sidebar widget for the OpenCode TUI.

```text

OpenCode Go usage

  Rolling   62% used   ██████████████░░░░░░░░   resets in 3h 30m
  Weekly    28% used   ██████░░░░░░░░░░░░░░░░   resets in 3d 2h
  Monthly   62% used   ██████████████░░░░░░░░   resets in 16d 2h

```

## Color scale

| Used        | Color  |
| ----------- | ------ |
| < 40%       | green  |
| 40% – 59%   | yellow |
| 60% – 79%   | orange |
| ≥ 80%       | red    |

## Requirements

- **Node.js >= 18** — the CLI uses the global `fetch`.
- **An OpenCode Go subscription** with a stored API key — run
  `opencode auth login` once, or export `OPENCODE_API_KEY`.

## Installation

### npm

```bash
npm install -g opencode-go-rolling-usage
# or
pnpm add -g opencode-go-rolling-usage
```

This installs two commands: `opencode-go-rolling-usage` and its short alias
`ogr`.

### Homebrew

```bash
brew tap caertos/tap
brew install opencode-go-rolling-usage
```

### Without installing

```bash
npx opencode-go-rolling-usage show
# or
pnpm dlx opencode-go-rolling-usage show
```

## Usage

```bash
ogr                          # same as `ogr show`
ogr show                     # print the quota table
ogr --json                   # raw usage payload as JSON (scripts, status bars)
ogr --no-color               # plain text
ogr --help
ogr --version
```

`opencode-go-rolling-usage` is the long form of `ogr`; both accept the same
options:

| Option            | Description                                        |
| ----------------- | -------------------------------------------------- |
| `--json`          | Print the raw usage payload as JSON                |
| `--key <key>`     | Use this API key instead of the stored one         |
| `--base-url <url>`| Override the usage API base URL                    |
| `--color`         | Force ANSI colors                                  |
| `--no-color`      | Disable ANSI colors                                 |
| `-h, --help`      | Show help                                           |
| `-v, --version`   | Show the version                                    |

### Where the API key comes from

In order of precedence:

1. `--key` / `OPENCODE_API_KEY` — an explicit Go API key.
2. `~/.local/share/opencode/auth.json` — the `opencode-go` provider entry
   (falling back to `opencode`). Honors `XDG_DATA_HOME` and `OPENCODE_AUTH_JSON`.

If no key is found, run `opencode auth login` first.

## TUI plugin (sidebar widget)

The package ships an OpenCode TUI plugin and registers it in your
`~/.config/opencode/tui.json` automatically:

- **npm** — the `postinstall` hook registers it for you, so opening OpenCode is
  enough.
- **pnpm** — pnpm blocks install scripts by default; run `pnpm approve-builds`
  once (or run `ogr setup`).
- **Homebrew** — run `ogr setup` once; Homebrew's sandbox prevents the formula
  from writing to your OpenCode config.

`ogr setup` adds `opencode-go-rolling-usage` to the `plugin` array of `tui.json`
(idempotent and safe; it never touches anything else). Then just restart
OpenCode: the widget appears in the session sidebar and refreshes on every
`session.idle` and every 90 seconds. It reads the same key sources as the CLI and
**hides itself** when no key is configured.

## Development

Want to clone the source and hack on it?

```bash
git clone https://github.com/Caertos/opencode-go-rolling-usage.git
cd opencode-go-rolling-usage
pnpm install
```

### Scripts

```bash
pnpm test              # jest unit tests
pnpm run test:coverage # tests with coverage report
pnpm run lint          # eslint
pnpm run format        # prettier --write
pnpm run format:check  # prettier --check
pnpm run build         # babel src -> dist
```

Run the CLI straight from source:

```bash
node src/index.js show
# or, after building:
pnpm run build && node dist/index.js show
```

Install your local build globally to test the `ogr` command:

```bash
pnpm run build
pnpm add -g .
ogr show
```

### Project layout

```text
src/
  format.js   pure helpers (clamp, bar, countdown, 4-level colors)
  usage.js    API key resolution + usage endpoint client
  render.js   terminal rendering (chalk)
  index.js    CLI entry point (bin)
  tui.tsx     OpenCode TUI plugin (self-contained, single file)
test/
  format.test.js
  usage.test.js
  render.test.js
packaging/
  homebrew/   Homebrew formula
```

### Testing

```bash
pnpm test
pnpm run lint && pnpm run format:check
```

Pull requests are welcome. Please keep the tests green and run
`pnpm run format` before opening one.

### Releasing

Publishing uses npm **Trusted Publishing (OIDC)** — there is **no npm token
secret**. It runs the `publish.yml` workflow on `v*` tags. Provenance is
generated automatically.

One-time setup on npmjs.com (package → **Settings → Trusted Publisher → GitHub
Actions**):

| Field              | Value                        |
| ------------------ | ---------------------------- |
| Organization/user  | `Caertos`                    |
| Repository         | `opencode-go-rolling-usage`  |
| Workflow filename  | `publish.yml`                |

> The package must exist on npm before the trusted publisher can be configured.
> For the very first release, publish once manually (`npm login` +
> `npm publish`), then add the trusted publisher and use the tag flow below.

Then, for each release:

1. Bump `version` in `package.json` and add a `CHANGELOG.md` entry.
2. Tag and push:
   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```
3. The **Publish** workflow runs lint/format/tests, publishes to npm with
   provenance, and creates the GitHub Release.

**Homebrew:** run the **Bump Homebrew formula** workflow with the published
version. It updates `url` + `sha256` in the tap and opens a PR. This needs a
`homebrew-tap` repository and the `HOMEBREW_TAP_TOKEN` secret.

## Notes

- The usage endpoint (`https://opencode.ai/zen/go/v1/usage`) is the one the Go
  dashboard uses. It is not publicly documented and may change.
- Colors are truecolor ANSI when the output is a TTY; pipe-safe otherwise.

## License

MIT © caertos
