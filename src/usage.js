// OpenCode Go usage client: credential resolution + the usage endpoint call.
//
// Go exposes an official (undocumented) usage endpoint the web dashboard is
// built on: `GET https://opencode.ai/zen/go/v1/usage`, authenticated with the
// regular Go API key (`Authorization: Bearer <key>`). It reports the used
// percentage and reset time for the rolling (5h), weekly and monthly windows.

import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

export const DEFAULT_BASE_URL = 'https://opencode.ai/zen/go';
export const DEFAULT_TIMEOUT_MS = 15000;

export class UsageError extends Error {
  constructor(kind, message, status) {
    super(message);
    this.name = 'UsageError';
    this.kind = kind;
    this.status = status;
  }
}

/**
 * Candidate locations of OpenCode's credentials file, in order of precedence.
 * Honors `OPENCODE_AUTH_JSON`, then the platform data dir:
 *   - Linux:   $XDG_DATA_HOME/opencode/auth.json or ~/.local/share/opencode/auth.json
 *   - macOS:   ~/Library/Application Support/opencode/auth.json
 *   - Windows: %LOCALAPPDATA%\opencode\auth.json
 */
export function authFileCandidates(env = process.env) {
  if (env.OPENCODE_AUTH_JSON && env.OPENCODE_AUTH_JSON.trim()) {
    return [env.OPENCODE_AUTH_JSON.trim()];
  }
  const home = homedir();
  const candidates = [];
  if (env.XDG_DATA_HOME && env.XDG_DATA_HOME.trim()) {
    candidates.push(join(env.XDG_DATA_HOME.trim(), 'opencode', 'auth.json'));
  }
  switch (process.platform) {
    case 'darwin':
      candidates.push(
        join(home, 'Library', 'Application Support', 'opencode', 'auth.json')
      );
      break;
    case 'win32':
      candidates.push(
        join(
          env.LOCALAPPDATA || join(home, 'AppData', 'Local'),
          'opencode',
          'auth.json'
        )
      );
      break;
  }
  candidates.push(join(home, '.local', 'share', 'opencode', 'auth.json'));
  return [...new Set(candidates)];
}

/** The primary credentials path (first candidate). */
export function authFilePath(env = process.env) {
  return authFileCandidates(env)[0];
}

/**
 * Resolve the Go API key from (in order): `OPENCODE_API_KEY`, then the
 * `opencode-go` entry in any auth.json candidate, then the `opencode` fallback.
 * Returns `{ apiKey, source }` or `undefined` when nothing is configured.
 */
export async function resolveApiKey(options = {}) {
  const env = options.env || process.env;
  const reader = options.readFileImpl || readFile;

  const fromEnv = env.OPENCODE_API_KEY && env.OPENCODE_API_KEY.trim();
  if (fromEnv) return { apiKey: fromEnv, source: 'env' };

  const files = options.authFile ? [options.authFile] : authFileCandidates(env);
  for (const file of files) {
    let parsed;
    try {
      parsed = JSON.parse(await reader(file, 'utf8'));
    } catch {
      continue;
    }
    for (const provider of ['opencode-go', 'opencode']) {
      const entry = parsed && parsed[provider];
      if (!entry || typeof entry !== 'object') continue;
      const key = typeof entry.key === 'string' ? entry.key : entry.apiKey;
      if (typeof key === 'string' && key.trim()) {
        return { apiKey: key.trim(), source: 'auth' };
      }
    }
  }
  return undefined;
}

/** Validate the raw JSON body and return the `usage` object. */
export function parseUsage(body) {
  const usage = body && typeof body === 'object' ? body.usage : undefined;
  if (!usage || typeof usage !== 'object') return undefined;
  return usage;
}

/**
 * Fetch the usage windows. `fetchImpl` and `timeoutMs` are injectable so the
 * network can be controlled in tests.
 */
export async function fetchUsage(apiKey, options = {}) {
  const baseUrl = (options.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '');
  const url = `${baseUrl}/v1/usage`;
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const doFetch = options.fetchImpl || fetch;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response;
  try {
    response = await doFetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
      redirect: 'error',
      signal: controller.signal,
    });
  } catch (error) {
    const aborted = controller.signal.aborted;
    throw new UsageError(
      'network',
      aborted
        ? `request timed out after ${timeoutMs}ms`
        : `could not reach ${url}`
    );
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 401) {
    throw new UsageError(
      'unauthorized',
      'API key was rejected (HTTP 401)',
      401
    );
  }
  if (response.status === 403) {
    throw new UsageError(
      'no-subscription',
      'no OpenCode Go subscription for this key (HTTP 403)',
      403
    );
  }
  if (!response.ok) {
    throw new UsageError(
      'http',
      `usage endpoint returned HTTP ${response.status}`,
      response.status
    );
  }

  let body;
  try {
    body = await response.json();
  } catch {
    throw new UsageError('bad-response', 'response was not valid JSON');
  }

  const usage = parseUsage(body);
  if (!usage) {
    throw new UsageError(
      'bad-response',
      'response did not match the expected shape'
    );
  }
  return usage;
}
