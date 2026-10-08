// Terminal rendering for the CLI. Colors are optional so output stays
// deterministic (and testable) with `color: false`.

import { Chalk } from 'chalk';
import { summarize, progressBar, DEFAULT_BAR_WIDTH } from './format.js';

// A chalk instance with colors forced on, so `color: true` always emits ANSI
// even when the process is not attached to a TTY (tests, piped output).
const COLORED = new Chalk({ level: 3 });

function makePainter(color) {
  if (!color) {
    const id = (value) => String(value);
    return { hex: () => id, bold: id, dim: id, gray: id };
  }
  return {
    hex: (hex) => COLORED.hex(hex),
    bold: (value) => COLORED.bold(value),
    dim: (value) => COLORED.dim(value),
    gray: (value) => COLORED.hex('#8b949e')(value),
  };
}

/** Render the quota table as plain (or colored) text. */
export function renderUsage(usage, options = {}) {
  const color = options.color === true;
  const now = options.now || Date.now();
  const paint = makePainter(color);
  const rows = summarize(usage, now);

  const lines = ['', paint.bold('OpenCode Go usage'), ''];
  for (const row of rows) {
    const label = paint.gray(row.label.padEnd(9));
    const pct = row.has
      ? paint.hex(row.color)(`${String(row.percent).padStart(3)}% used`)
      : paint.gray('   —');
    const bars = progressBar(row.percent, DEFAULT_BAR_WIDTH);
    const bar = row.has
      ? paint.hex(row.color)(bars.filled) + paint.dim(bars.empty)
      : paint.dim(bars.empty);
    const reset = row.countdown ? paint.gray(`resets in ${row.countdown}`) : '';
    lines.push(`  ${label}${pct}   ${bar}   ${reset}`.trimEnd());
  }
  lines.push('');
  return lines.join('\n');
}
