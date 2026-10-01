import { FONT, INK, INK_55 } from '../theme'

const formatCount = (value) => new Intl.NumberFormat('en-IN').format(Number(value) || 0)

const RatingBadge = ({ rating, reviewCount = null, style = null }) => {
  if (typeof rating !== 'number') {
    return (
      <p
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          marginTop: '6px',
          fontFamily: FONT,
          fontSize: '12.5px',
          fontWeight: 500,
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
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        marginTop: '6px',
        fontFamily: FONT,
        fontSize: '13px',
        fontWeight: 600,
        color: INK,
        ...style,
      }}
    >
      <i className="ri-star-fill" aria-hidden="true" style={{ color: '#1a1a1a' }} />
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