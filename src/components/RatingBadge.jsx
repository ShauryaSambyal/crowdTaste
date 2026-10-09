import { FONT, INDIGO, INK_55, YELLOW } from '../theme'

const formatCount = (value) => new Intl.NumberFormat('en-IN').format(Number(value) || 0)

const RatingBadge = ({ rating, reviewCount = null, style = null }) => {
  if (typeof rating !== 'number') {
    return (
      <p
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          marginTop: '8px',
          padding: '4px 11px',
          borderRadius: '999px',
          background: 'rgba(255,214,165,0.55)',
          fontFamily: FONT,
          fontSize: '12.5px',
          fontWeight: 600,
          color: INK_55,
          ...style,
        }}
      >
        <i className="ri-star-line" aria-hidden="true" />
        Not yet rated
      </p>
    )
  }

  const rounded = rating.toFixed(1)
  const hasCount = typeof reviewCount === 'number' && reviewCount > 0

  return (
    <p
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        marginTop: '8px',
        padding: '4px 12px',
        borderRadius: '999px',
        background: YELLOW,
        border: '1px solid rgba(58,12,163,0.12)',
        fontFamily: FONT,
        fontSize: '13px',
        fontWeight: 700,
        color: INDIGO,
        ...style,
      }}
    >
      <i className="ri-star-fill" aria-hidden="true" style={{ fontSize: '13px' }} />
      <span aria-hidden="true">
        {rounded}
        {hasCount ? ` | ${formatCount(reviewCount)} reviews` : ''}
      </span>
      <span className="sr-only">
        {hasCount
          ? `Rated ${rounded} out of 5 from ${formatCount(reviewCount)} reviews`
          : `Rated ${rounded} out of 5`}
      </span>
    </p>
  )
}

export default RatingBadge
