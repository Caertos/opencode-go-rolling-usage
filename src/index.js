#!/usr/bin/env node
// CLI entry point for opencode-go-usage.

import { readFileSync } from 'node:fs';
import { resolveApiKey, fetchUsage, UsageError } from './usage.js';
import { renderUsage } from './render.js';

const HELP = `opencode-go-rolling-usage (ogr) — OpenCode Go quota in your terminal

Usage:
  opencode-go-rolling-usage [show] [options]
  ogr [show] [options]
  opencode-go-rolling-usage help
  opencode-go-rolling-usage version

Options:
  --json            Print the raw usage payload as JSON
  --key <key>       Use this API key instead of the stored one
  --base-url <url>  Override the usage API base URL
  --no-color        Disable ANSI colors
  --color           Force ANSI colors
  -h, --help        Show this help
  -v, --version     Show the version

The API key is read from OPENCODE_API_KEY or ~/.local/share/opencode/auth.json
(the \`opencode-go\` provider). Run \`opencode auth login\` if none is found.`;

function readVersion() {
  try {
    const url = new URL('../package.json', import.meta.url);
    return JSON.parse(readFileSync(url, 'utf8')).version;
  } catch {
    return '0.0.0';
  }
}

export function parseArgs(argv) {
  const args = [...argv];
  const opts = { json: false, color: undefined };
  const command =
    args.length > 0 && !args[0].startsWith('-') ? args.shift() : 'show';

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--json') opts.json = true;
    else if (arg === '--no-color') opts.color = false;
    else if (arg === '--color') opts.color = true;
    else if (arg === '--help' || arg === '-h') opts.help = true;
    else if (arg === '--version' || arg === '-v') opts.version = true;
    else if (arg === '--key') opts.key = args[(i += 1)];
    else if (arg.startsWith('--key=')) opts.key = arg.slice('--key='.length);
    else if (arg === '--base-url') opts.baseUrl = args[(i += 1)];
    else if (arg.startsWith('--base-url=')) {
      opts.baseUrl = arg.slice('--base-url='.length);
    }
  }
  return { command, opts };
}

function resolveColor(opts) {
  if (opts.color !== undefined) return opts.color;
  return process.stdout.isTTY === true && !process.env.NO_COLOR;
}

async function main() {
  const { command, opts } = parseArgs(process.argv.slice(2));

  if (opts.help || command === 'help') {
    process.stdout.write(`${HELP}\n`);
    return 0;
  }
  if (opts.version || command === 'version') {
    process.stdout.write(`${readVersion()}\n`);
    return 0;
  }
  if (command !== 'show') {
    process.stderr.write(`unknown command: ${command}\n\n${HELP}\n`);
    return 2;
  }

  let apiKey = opts.key;
  let source = opts.key ? 'option' : undefined;
  if (!apiKey) {
    const resolved = await resolveApiKey();
    if (resolved) {
      apiKey = resolved.apiKey;
      source = resolved.source;
    }
  }
  if (!apiKey) {
    process.stderr.write(
      'No OpenCode Go API key found.\n' +
        'Run `opencode auth login` or set OPENCODE_API_KEY.\n'
    );
    return 1;
  }

  try {
    const usage = await fetchUsage(apiKey, { baseUrl: opts.baseUrl });
    if (opts.json) {
      const payload = {
        usage,
        source,
        fetchedAt: new Date().toISOString(),
      };
      process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    } else {
      process.stdout.write(
        `${renderUsage(usage, { color: resolveColor(opts) })}\n`
      );
    }
    return 0;
  } catch (error) {
    if (error instanceof UsageError) {
      process.stderr.write(`error: ${error.message}\n`);
      if (error.kind === 'no-subscription') {
        process.stderr.write('This key has no OpenCode Go subscription.\n');
      }
      return 1;
    }
    process.stderr.write(
      `error: ${error && error.message ? error.message : error}\n`
    );
    return 1;
  }
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    process.stderr.write(
      `unexpected error: ${error && error.stack ? error.stack : error}\n`
    );
    process.exitCode = 1;
  });
