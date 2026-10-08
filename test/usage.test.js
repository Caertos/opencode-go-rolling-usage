import { join } from 'node:path';
import {
  authFilePath,
  resolveApiKey,
  parseUsage,
  fetchUsage,
  UsageError,
} from '../src/usage.js';

const AUTH = {
  'opencode-go': { type: 'api', key: 'oc_sk_go_test' },
  opencode: { key: 'oc_sk_zen_test' },
};

const readerFor = (data) => async () => JSON.stringify(data);

describe('authFilePath', () => {
  it('honors OPENCODE_AUTH_JSON', () => {
    expect(authFilePath({ OPENCODE_AUTH_JSON: '/tmp/custom.json' })).toBe(
      '/tmp/custom.json'
    );
  });

  it('honors XDG_DATA_HOME', () => {
    expect(authFilePath({ XDG_DATA_HOME: '/data' })).toBe(
      join('/data', 'opencode', 'auth.json')
    );
  });

  it('falls back to ~/.local/share', () => {
    expect(authFilePath({})).toContain(join('opencode', 'auth.json'));
  });
});

describe('resolveApiKey', () => {
  it('prefers OPENCODE_API_KEY over the file', async () => {
    const result = await resolveApiKey({
      env: { OPENCODE_API_KEY: 'env-key' },
      readFileImpl: readerFor(AUTH),
    });
    expect(result).toEqual({ apiKey: 'env-key', source: 'env' });
  });

  it('reads opencode-go first', async () => {
    const result = await resolveApiKey({
      env: {},
      readFileImpl: readerFor(AUTH),
    });
    expect(result).toEqual({ apiKey: 'oc_sk_go_test', source: 'auth' });
  });

  it('falls back to the opencode provider', async () => {
    const result = await resolveApiKey({
      env: {},
      readFileImpl: readerFor({ opencode: { key: 'zen' } }),
    });
    expect(result).toEqual({ apiKey: 'zen', source: 'auth' });
  });

  it('returns undefined when nothing is configured', async () => {
    const result = await resolveApiKey({
      env: {},
      readFileImpl: async () => {
        throw new Error('ENOENT');
      },
    });
    expect(result).toBeUndefined();
  });
});

describe('parseUsage', () => {
  it('returns the usage object when present', () => {
    expect(parseUsage({ usage: { rolling: { percent: 1 } } })).toEqual({
      rolling: { percent: 1 },
    });
  });

  it('returns undefined for malformed bodies', () => {
    expect(parseUsage({})).toBeUndefined();
    expect(parseUsage(null)).toBeUndefined();
    expect(parseUsage({ usage: 'nope' })).toBeUndefined();
  });
});

describe('fetchUsage', () => {
  const usageBody = {
    usage: {
      rolling: { status: 'ok', percent: 59, resetsAt: '2026-10-09T01:08:04Z' },
      weekly: { status: 'ok', percent: 26, resetsAt: '2026-10-12T00:00:00Z' },
      monthly: { status: 'ok', percent: 61, resetsAt: '2026-10-25T00:00:32Z' },
    },
  };

  it('returns parsed usage on 200', async () => {
    const calls = [];
    const fetchImpl = async (...args) => {
      calls.push(args);
      return { ok: true, status: 200, json: async () => usageBody };
    };
    const usage = await fetchUsage('key', { fetchImpl });
    expect(usage.rolling.percent).toBe(59);
    const [url, init] = calls[0];
    expect(url).toBe('https://opencode.ai/zen/go/v1/usage');
    expect(init.headers.Authorization).toBe('Bearer key');
  });

  it('maps 401 to unauthorized', async () => {
    const fetchImpl = async () => ({
      ok: false,
      status: 401,
      json: async () => ({}),
    });
    await expect(fetchUsage('key', { fetchImpl })).rejects.toMatchObject({
      kind: 'unauthorized',
    });
  });

  it('maps 403 to no-subscription', async () => {
    const fetchImpl = async () => ({
      ok: false,
      status: 403,
      json: async () => ({}),
    });
    await expect(fetchUsage('key', { fetchImpl })).rejects.toMatchObject({
      kind: 'no-subscription',
    });
  });

  it('maps other statuses to http', async () => {
    const fetchImpl = async () => ({
      ok: false,
      status: 500,
      json: async () => ({}),
    });
    await expect(fetchUsage('key', { fetchImpl })).rejects.toBeInstanceOf(
      UsageError
    );
    await expect(fetchUsage('key', { fetchImpl })).rejects.toMatchObject({
      kind: 'http',
    });
  });

  it('maps invalid JSON to bad-response', async () => {
    const fetchImpl = async () => ({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error('bad json');
      },
    });
    await expect(fetchUsage('key', { fetchImpl })).rejects.toMatchObject({
      kind: 'bad-response',
    });
  });

  it('maps a thrown fetch to network', async () => {
    const fetchImpl = async () => {
      throw new Error('ECONNREFUSED');
    };
    await expect(fetchUsage('key', { fetchImpl })).rejects.toMatchObject({
      kind: 'network',
    });
  });
});
