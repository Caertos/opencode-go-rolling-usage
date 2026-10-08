import {
  clampPercent,
  levelFor,
  levelColor,
  progressBar,
  formatCountdown,
  normalizeWindow,
  summarize,
  LEVEL_COLORS,
} from '../src/format.js';

describe('clampPercent', () => {
  it('clamps into [0, 100]', () => {
    expect(clampPercent(-5)).toBe(0);
    expect(clampPercent(0)).toBe(0);
    expect(clampPercent(42.5)).toBe(42.5);
    expect(clampPercent(100)).toBe(100);
    expect(clampPercent(150)).toBe(100);
  });

  it('treats non-numbers as 0', () => {
    expect(clampPercent(undefined)).toBe(0);
    expect(clampPercent(NaN)).toBe(0);
    expect(clampPercent('nope')).toBe(0);
  });
});

describe('levelFor / levelColor', () => {
  it('uses the 4-level scale: green <40, yellow 40-60, orange 60-80, red >=80', () => {
    const cases = [
      [0, 'green'],
      [39, 'green'],
      [40, 'yellow'],
      [59, 'yellow'],
      [60, 'orange'],
      [79, 'orange'],
      [80, 'red'],
      [100, 'red'],
    ];
    for (const [percent, level] of cases) {
      expect(levelFor(percent)).toBe(level);
      expect(levelColor(percent)).toBe(LEVEL_COLORS[level]);
    }
  });
});

describe('progressBar', () => {
  it('splits filled/empty to the requested width', () => {
    expect(progressBar(0, 10)).toEqual({ filled: '', empty: '░'.repeat(10) });
    expect(progressBar(50, 10)).toEqual({
      filled: '█'.repeat(5),
      empty: '░'.repeat(5),
    });
    expect(progressBar(100, 10)).toEqual({ filled: '█'.repeat(10), empty: '' });
  });

  it('rounds to the nearest cell', () => {
    expect(progressBar(59, 22).filled.length).toBe(13);
  });
});

describe('formatCountdown', () => {
  const now = Date.parse('2026-10-08T21:20:00Z');

  it('formats days+hours and hours+minutes', () => {
    expect(formatCountdown('2026-10-09T01:08:04Z', now)).toBe('3h 48m');
    expect(formatCountdown('2026-10-12T00:00:00Z', now)).toBe('3d 2h');
  });

  it('returns now for past resets and empty for invalid input', () => {
    expect(formatCountdown('2026-10-08T20:00:00Z', now)).toBe('now');
    expect(formatCountdown(undefined, now)).toBe('');
    expect(formatCountdown('not-a-date', now)).toBe('');
  });
});

describe('normalizeWindow', () => {
  it('marks a window as present only when percent is a finite number', () => {
    expect(
      normalizeWindow({ percent: 42, resetsAt: 'x', status: 'ok' })
    ).toEqual({
      status: 'ok',
      has: true,
      percent: 42,
      resetsAt: 'x',
    });
    expect(normalizeWindow({ status: 'ok' }).has).toBe(false);
    expect(normalizeWindow(undefined).has).toBe(false);
  });
});

describe('summarize', () => {
  it('returns the three windows in order with countdown and color', () => {
    const now = Date.parse('2026-10-08T21:20:00Z');
    const rows = summarize(
      {
        rolling: { percent: 59, resetsAt: '2026-10-09T01:08:04Z' },
        weekly: { percent: 26, resetsAt: '2026-10-12T00:00:00Z' },
        monthly: { percent: 61, resetsAt: '2026-10-25T00:00:32Z' },
      },
      now
    );
    expect(rows.map((r) => r.key)).toEqual(['rolling', 'weekly', 'monthly']);
    expect(rows[0]).toMatchObject({
      label: 'Rolling',
      short: '5h',
      percent: 59,
      countdown: '3h 48m',
      color: LEVEL_COLORS.yellow,
    });
    expect(rows[1].color).toBe(LEVEL_COLORS.green);
    expect(rows[2].color).toBe(LEVEL_COLORS.orange);
  });

  it('handles a missing usage payload', () => {
    const rows = summarize(undefined, Date.now());
    expect(rows).toHaveLength(3);
    expect(rows.every((r) => r.has === false)).toBe(true);
  });
});
