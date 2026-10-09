// Design tokens for the CrowdTaste UI.
//
// Palette (fixed, six hexes):
//   INDIGO  #3A0CA3  deep indigo  - headings and body ink
//   VIOLET  #6A00F4  vivid violet - primary actions, links, focus
//   GREEN   #064E3B  deep green   - success, "open now", rating accents
//   YELLOW  #FFF275  bright yellow- highlight, stars, active chips
//   CREAM   #F8E7C9  warm cream   - page surface
//   PEACH   #FFD6A5  soft peach   - secondary surfaces and gradients
//
// Typography is Bricolage Grotesque everywhere, with weights chosen per
// role: 800 display, 700 headlines, 600 buttons and subheads, 500 body,
// 400 fine print. Every text style below sets an explicit weight.

export const INDIGO = '#3A0CA3'
export const VIOLET = '#6A00F4'
export const GREEN = '#064E3B'
export const YELLOW = '#FFF275'
export const CREAM = '#F8E7C9'
export const PEACH = '#FFD6A5'

// Deep indigo is the ink; the muted steps are the same hue at lower alpha so
// text stays on-palette instead of drifting to grey.
export const INK = INDIGO
export const INK_78 = 'rgba(58,12,163,0.78)'
export const INK_72 = 'rgba(58,12,163,0.72)'
export const INK_70 = 'rgba(58,12,163,0.7)'
export const INK_55 = 'rgba(58,12,163,0.55)'
export const INK_40 = 'rgba(58,12,163,0.4)'
export const INK_10 = 'rgba(58,12,163,0.1)'

export const FONT = "'Bricolage Grotesque', 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif"

// Turns a palette hex into an rgba() string, for gradients and glows that need
// the same hue at low alpha.
export const hexToRgba = (hex, alpha = 1) => {
  const raw = String(hex).replace('#', '')
  const full = raw.length === 3 ? raw.split('').map((char) => char + char).join('') : raw
  const value = parseInt(full, 16)
  const r = (value >> 16) & 255
  const g = (value >> 8) & 255
  const b = value & 255
  return `rgba(${r},${g},${b},${alpha})`
}

// Warm, on-palette shadows instead of neutral black.
export const PILL_SHADOW = '0 8px 26px rgba(58,12,163,0.14)'
export const CARD_SHADOW = '0 12px 32px rgba(58,12,163,0.12)'
export const CARD_SHADOW_HOVER = '0 20px 46px rgba(58,12,163,0.2)'

// Frosted surface used by the navbar, buttons, chips and cards. Defaults to a
// cream-tinted glass with a peach hairline.
export const frost = (background, border = 'rgba(255,214,165,0.75)', blur = 16) => ({
  background,
  border: `1px solid ${border}`,
  backdropFilter: `blur(${blur}px)`,
  WebkitBackdropFilter: `blur(${blur}px)`,
})

export const eyebrowPill = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '7px',
  padding: '5px 13px',
  borderRadius: '999px',
  ...frost('rgba(255,242,117,0.55)', 'rgba(58,12,163,0.14)', 8),
  fontFamily: FONT,
  fontSize: '11px',
  fontWeight: 600,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: INDIGO,
}

export const primaryButton = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  padding: '12px 24px',
  borderRadius: '9px',
  fontFamily: FONT,
  fontSize: '14px',
  fontWeight: 600,
  color: '#FFFDF7',
  textDecoration: 'none',
  background: VIOLET,
  border: '1px solid transparent',
  boxShadow: '0 8px 22px rgba(106,0,244,0.32)',
  cursor: 'pointer',
}

export const secondaryButton = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  padding: '12px 24px',
  borderRadius: '9px',
  fontFamily: FONT,
  fontSize: '14px',
  fontWeight: 600,
  color: INDIGO,
  textDecoration: 'none',
  ...frost('rgba(255,253,247,0.72)', 'rgba(58,12,163,0.16)', 8),
  cursor: 'pointer',
}

export const card = {
  ...frost('rgba(255,253,247,0.82)', 'rgba(255,214,165,0.9)', 12),
  borderRadius: '18px',
  boxShadow: CARD_SHADOW,
}

export const heroHeadline = {
  margin: 0,
  fontFamily: FONT,
  fontWeight: 800,
  fontSize: 'clamp(1.9rem, 4.4vw, 3.1rem)',
  lineHeight: 1.06,
  letterSpacing: '-0.03em',
  color: INK,
}

export const sectionHeadline = {
  ...heroHeadline,
  fontWeight: 700,
  fontSize: 'clamp(1.6rem, 3vw, 2.2rem)',
  lineHeight: 1.14,
}

export const bodyText = {
  margin: 0,
  fontFamily: FONT,
  fontSize: '14px',
  lineHeight: 1.6,
  fontWeight: 500,
  color: INK_70,
}

export const tinyLabel = {
  margin: 0,
  fontFamily: FONT,
  fontSize: '11px',
  fontWeight: 600,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: INK_55,
}
