// Pure formatting helpers. No colors, no I/O — shared by the CLI and the TUI
// plugin so both render the same numbers the same way.

export const DEFAULT_BAR_WIDTH = 22;
export const LEVEL_YELLOW_PCT = 40;
export const LEVEL_ORANGE_PCT = 60;
export const LEVEL_RED_PCT = 80;

// Hex colors for the 4-level scale: verde <40, amarillo 40-60, naranja 60-80,
// rojo >=80. Kept as plain strings so both chalk (CLI) and opentui (TUI) can
// consume them without sharing a color dependency.
export const LEVEL_COLORS = {
  green: '#3fb950',
  yellow: '#e3b341',
  orange: '#f0883e',
  red: '#f85149',
};

export const WINDOWS = [
  { key: 'rolling', label: 'Rolling', short: '5h' },
  { key: 'weekly', label: 'Weekly', short: 'wk' },
  { key: 'monthly', label: 'Monthly', short: 'mo' },
];

/** Clamp any input to a finite percentage in [0, 100]. */
export function clampPercent(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

/** Map a percentage to its level name. */
export function levelFor(percent) {
  const p = clampPercent(percent);
  if (p >= LEVEL_RED_PCT) return 'red';
  if (p >= LEVEL_ORANGE_PCT) return 'orange';
  if (p >= LEVEL_YELLOW_PCT) return 'yellow';
  return 'green';
}

/** Map a percentage to its hex color. */
export function levelColor(percent) {
  return LEVEL_COLORS[levelFor(percent)];
}

/**
 * Build a progress bar from a percentage.
 * Returns the filled and empty halves separately so callers can color them
 * differently.
 */
export function progressBar(percent, width = DEFAULT_BAR_WIDTH) {
  const w = Math.max(1, Math.floor(width));
  const filled = Math.round((clampPercent(percent) / 100) * w);
  return {
    filled: '█'.repeat(filled),
    empty: '░'.repeat(w - filled),
  };
}

/** Human-readable countdown until an ISO timestamp. Empty string if invalid. */
export function formatCountdown(resetsAt, now = Date.now()) {
  if (!resetsAt) return '';
  const target = Date.parse(resetsAt);
  if (!Number.isFinite(target)) return '';
  const ms = target - now;
  if (ms <= 0) return 'now';
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/** Normalize a raw usage window into a stable shape. */
export function normalizeWindow(win) {
  const source = win && typeof win === 'object' ? win : {};
  const has =
    typeof source.percent === 'number' && Number.isFinite(source.percent);
  return {
    status: typeof source.status === 'string' ? source.status : undefined,
    has,
    percent: has ? clampPercent(source.percent) : 0,
    resetsAt: typeof source.resetsAt === 'string' ? source.resetsAt : undefined,
  };
}

/**
 * Turn a raw `usage` payload into a list of window rows ready to render.
 * `now` is injectable so countdowns are deterministic in tests.
 */
export function summarize(usage, now = Date.now()) {
  const source = usage && typeof usage === 'object' ? usage : {};
  return WINDOWS.map(({ key, label, short }) => {
    const win = normalizeWindow(source[key]);
    return {
      key,
      label,
      short,
      ...win,
      countdown: formatCountdown(win.resetsAt, now),
      color: levelColor(win.percent),
    };
  });
}
