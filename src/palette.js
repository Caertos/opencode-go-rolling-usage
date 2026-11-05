// Normalises the theme object handed to the TUI plugin into the flat palette
// the sidebar widget renders with.
//
// OpenCode v2 (`ResolvedTheme` from `@opencode/theme/tui`) nests RGBA tokens
// under `text.base`, `text.muted`, `text.feedback.*.base`, `background.*` and
// `border.base`. OpenCode v1 exposed flat tokens (`text`, `textMuted`,
// `border`, `backgroundElement`).
//
// Every value that is not a real color must be discarded. Passing a token
// group (for example the whole `text` subtree) to an OpenTUI `<text fg>`
// makes the renderer throw while parsing it, which surfaces as
// "crashed in slot sidebar.content".

export const FALLBACK_COLORS = Object.freeze({
  text: '#e6e6e6',
  muted: '#9a9a9a',
  border: '#4a4a4a',
  bg: 'transparent',
  green: '#3fb950',
  yellow: '#e3b341',
  orange: '#f0883e',
  red: '#f85149',
});

/**
 * Whether `value` can be handed to OpenTUI as a color.
 *
 * `RGBA` instances from `@opentui/core` wrap a typed array in `buffer` (this
 * holds for both the v1 and v2 runtimes). Hex/CSS strings are also valid.
 */
export function isColor(value) {
  if (typeof value === 'string') return value.length > 0;
  if (!value || typeof value !== 'object') return false;
  const buffer = value.buffer;
  return ArrayBuffer.isView(buffer) || Array.isArray(buffer);
}

function pick(theme, path, fallback) {
  let current = theme;
  for (const key of path) {
    if (current == null) return fallback;
    current = current[key];
  }
  return isColor(current) ? current : fallback;
}

/** Build the widget palette from an OpenCode v1 or v2 theme. */
export function toPalette(theme) {
  const fallback = FALLBACK_COLORS;

  // v2: semantic token tree. Detect it by `text.base`, the token that replaced
  // the old `text.default`; checking the old path made v2 fall through to the
  // v1 branch and pass the whole `text` object as `fg`.
  if (isColor(theme?.text?.base)) {
    return {
      text: pick(theme, ['text', 'base'], fallback.text),
      muted: pick(theme, ['text', 'muted'], fallback.muted),
      border: pick(theme, ['border', 'base'], fallback.border),
      bg: pick(theme, ['background', 'raised', 'base'], fallback.bg),
      green: pick(
        theme,
        ['text', 'feedback', 'success', 'base'],
        fallback.green
      ),
      yellow: pick(
        theme,
        ['text', 'feedback', 'warning', 'base'],
        fallback.yellow
      ),
      // v2 `ResolvedTheme` has no orange hue scale (its `hue` only carries
      // accent/interactive/neutral), so the 4-level scale keeps a literal
      // orange.
      orange: fallback.orange,
      red: pick(theme, ['text', 'feedback', 'error', 'base'], fallback.red),
    };
  }

  // v1: flat tokens. isColor() keeps non-color values out of the palette.
  return {
    text: pick(theme, ['text'], fallback.text),
    muted: pick(theme, ['textMuted'], fallback.muted),
    border: pick(theme, ['border'], fallback.border),
    bg: pick(theme, ['backgroundElement'], fallback.bg),
    green: fallback.green,
    yellow: fallback.yellow,
    orange: fallback.orange,
    red: fallback.red,
  };
}
