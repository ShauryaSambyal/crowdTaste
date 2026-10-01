// Design tokens for the Monsoon-inspired CrowdTaste UI.
// Dark ink on a bright surface, light frosted-glass pills, Inter typography.
// Values mirror the reference build exactly, with a light dot-grid backdrop
// in place of the reference hero video.

export const INK = '#1f1f1f'
export const INK_78 = 'rgba(40,40,40,0.78)'
export const INK_72 = 'rgba(40,40,40,0.72)'
export const INK_70 = 'rgba(40,40,40,0.7)'
export const INK_55 = 'rgba(31,31,31,0.55)'
export const INK_40 = 'rgba(31,31,31,0.4)'
export const INK_10 = 'rgba(31,31,31,0.1)'
export const FONT = "'Inter', sans-serif"

export const PILL_SHADOW = '0 6px 24px rgba(0,0,0,0.12)'
export const CARD_SHADOW = '0 10px 30px rgba(0,0,0,0.08)'
export const CARD_SHADOW_HOVER = '0 18px 44px rgba(0,0,0,0.14)'

// Light frosted-glass surface (navbar, buttons, chips, cards)
export const frost = (background, border = 'rgba(255,255,255,0.65)', blur = 16) => ({
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
  ...frost('rgba(255,255,255,0.5)', 'rgba(255,255,255,0.55)', 8),
  fontFamily: FONT,
  fontSize: '11px',
  fontWeight: 500,
  letterSpacing: '0.02em',
  color: INK_78,
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
  color: '#fff',
  textDecoration: 'none',
  background: '#1a1a1a',
  border: '1px solid transparent',
  boxShadow: '0 6px 20px rgba(0,0,0,0.22)',
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
  color: INK,
  textDecoration: 'none',
  ...frost('rgba(255,255,255,0.65)', 'rgba(255,255,255,0.7)', 8),
  cursor: 'pointer',
}

export const card = {
  ...frost('rgba(255,255,255,0.72)', 'rgba(255,255,255,0.8)', 12),
  borderRadius: '18px',
  boxShadow: CARD_SHADOW,
}

export const heroHeadline = {
  margin: 0,
  fontFamily: FONT,
  fontWeight: 600,
  fontSize: 'clamp(1.9rem, 4.4vw, 3.1rem)',
  lineHeight: 1.08,
  letterSpacing: '-0.025em',
  color: INK,
}

export const sectionHeadline = {
  ...heroHeadline,
  fontSize: 'clamp(1.6rem, 3vw, 2.2rem)',
  lineHeight: 1.15,
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
  fontWeight: 500,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'rgba(40,40,40,0.55)',
}
