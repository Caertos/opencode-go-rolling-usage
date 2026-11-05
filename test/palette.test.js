import { FALLBACK_COLORS, isColor, toPalette } from '../src/palette.js';

// RGBA instances from @opentui/core wrap a typed array in `buffer`.
const rgba = (name) => ({ buffer: new Uint16Array(4), name });

const v2Theme = () => ({
  text: {
    base: rgba('text.base'),
    muted: rgba('text.muted'),
    faint: rgba('text.faint'),
    feedback: {
      success: { base: rgba('success.base'), muted: rgba('success.muted') },
      warning: { base: rgba('warning.base'), muted: rgba('warning.muted') },
      error: { base: rgba('error.base'), muted: rgba('error.muted') },
      info: { base: rgba('info.base'), muted: rgba('info.muted') },
    },
  },
  background: {
    base: rgba('background.base'),
    raised: { base: rgba('background.raised.base') },
  },
  border: { base: rgba('border.base') },
  hue: { accent: { 700: rgba('hue.accent.700') } },
});

describe('isColor', () => {
  it('accepts hex strings and RGBA objects', () => {
    expect(isColor('#fff')).toBe(true);
    expect(isColor(rgba('x'))).toBe(true);
  });

  it('rejects token groups, empty strings and nullish values', () => {
    expect(isColor({ base: rgba('x') })).toBe(false);
    expect(isColor('')).toBe(false);
    expect(isColor(undefined)).toBe(false);
    expect(isColor(null)).toBe(false);
  });
});

describe('toPalette (OpenCode v2)', () => {
  it('reads the current ResolvedTheme token paths', () => {
    const theme = v2Theme();
    const palette = toPalette(theme);

    expect(palette.text).toBe(theme.text.base);
    expect(palette.muted).toBe(theme.text.muted);
    expect(palette.border).toBe(theme.border.base);
    expect(palette.bg).toBe(theme.background.raised.base);
    expect(palette.green).toBe(theme.text.feedback.success.base);
    expect(palette.yellow).toBe(theme.text.feedback.warning.base);
    expect(palette.red).toBe(theme.text.feedback.error.base);
    expect(palette.orange).toBe(FALLBACK_COLORS.orange);
  });

  it('never passes the text token group as a color (crash regression)', () => {
    const theme = v2Theme();
    const palette = toPalette(theme);

    // Before the fix `text.default` did not exist, the v1 branch ran and
    // `palette.text` was the whole `theme.text` object; OpenTUI then threw
    // "undefined is not an object (evaluating 'e.length')" in the slot.
    expect(palette.text).not.toBe(theme.text);
    for (const value of Object.values(palette)) {
      expect(isColor(value)).toBe(true);
    }
  });

  it('falls back to safe colors for unknown tokens', () => {
    const theme = { text: { base: rgba('text.base') } };
    const palette = toPalette(theme);

    expect(palette.muted).toBe(FALLBACK_COLORS.muted);
    expect(palette.border).toBe(FALLBACK_COLORS.border);
    expect(palette.green).toBe(FALLBACK_COLORS.green);
    expect(palette.red).toBe(FALLBACK_COLORS.red);
  });
});

describe('toPalette (OpenCode v1)', () => {
  it('reads the flat token names', () => {
    const theme = {
      text: rgba('text'),
      textMuted: rgba('textMuted'),
      border: rgba('border'),
      backgroundElement: rgba('backgroundElement'),
    };
    const palette = toPalette(theme);

    expect(palette.text).toBe(theme.text);
    expect(palette.muted).toBe(theme.textMuted);
    expect(palette.border).toBe(theme.border);
    expect(palette.bg).toBe(theme.backgroundElement);
    expect(palette.green).toBe(FALLBACK_COLORS.green);
  });

  it('rejects a token group instead of using it as a color', () => {
    const theme = { text: { muted: rgba('x') } };
    const palette = toPalette(theme);
    expect(palette.text).toBe(FALLBACK_COLORS.text);
    expect(isColor(palette.text)).toBe(true);
  });

  it('survives a missing theme', () => {
    const palette = toPalette(undefined);
    expect(palette).toEqual(FALLBACK_COLORS);
  });
});
