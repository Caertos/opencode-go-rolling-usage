import { renderUsage } from '../src/render.js';

const usage = {
  rolling: { percent: 59, resetsAt: '2026-10-09T01:08:04Z' },
  weekly: { percent: 26, resetsAt: '2026-10-12T00:00:00Z' },
  monthly: { percent: 61, resetsAt: '2026-10-25T00:00:32Z' },
};
const now = Date.parse('2026-10-08T21:20:00Z');

describe('renderUsage', () => {
  it('renders a plain table when color is disabled', () => {
    const out = renderUsage(usage, { color: false, now });
    expect(out).toContain('OpenCode Go usage');
    expect(out).toContain('Rolling');
    expect(out).toContain('59% used');
    expect(out).toContain('resets in 3h 48m');
    expect(out).toContain('3d 2h');
    expect(out).toContain('16d 2h');
    // No ANSI escape sequences in plain mode.
    expect(out).not.toContain('\u001b[');
  });

  it('emits ANSI codes when color is enabled', () => {
    const out = renderUsage(usage, { color: true, now });
    expect(out).toContain('\u001b[');
    expect(out).toContain('59% used');
  });

  it('shows a dash for windows without data', () => {
    const out = renderUsage(
      { rolling: { percent: 10 } },
      { color: false, now }
    );
    expect(out).toContain('10% used');
    expect(out).toContain('—');
  });
});
