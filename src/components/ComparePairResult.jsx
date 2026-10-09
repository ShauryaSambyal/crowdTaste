import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  FONT,
  GREEN,
  INK,
  INK_40,
  INK_55,
  INK_70,
  PEACH,
  VIOLET,
  YELLOW,
  bodyText,
  card,
  hexToRgba,
  sectionHeadline,
} from '../theme'
import Attribution from './Attribution'
import RatingBadge from './RatingBadge'

const formatCount = (value) => new Intl.NumberFormat('en-IN').format(Number(value) || 0)

const cellStyle = {
  padding: '10px 12px',
  borderTop: '1px solid rgba(58,12,163,0.1)',
  fontFamily: FONT,
  fontSize: '13px',
  fontWeight: 500,
  color: INK_70,
  verticalAlign: 'top',
  textAlign: 'left',
}

const headStyle = { ...cellStyle, borderTop: 'none', fontWeight: 600, color: INK }

const googleRows = [
  { key: 'rating', label: 'Rating quality' },
  { key: 'volume', label: 'Review volume' },
  { key: 'value', label: 'Value for money' },
]

const signalCell = (place, key, method) => {
  if (method?.keyless) return placeScoreCell(place, key)
  if (key === 'rating') return typeof place.rating === 'number' ? `${place.rating.toFixed(1)} / 5` : 'Not listed'
  if (key === 'volume') {
    return typeof place.reviewCount === 'number' ? `${formatCount(place.reviewCount)} reviews` : 'Not listed'
  }
  return place.priceLabel || 'Not listed'
}

const placeScoreCell = (place, key) => {
  if (key === 'rating') return `${place.score?.total ?? '?'} / 100`
  if (key === 'volume') return `${place.present?.length ?? 0} signals found`
  return place.cuisinesNote ?? 'Listed detail'
}

const ScoreBar = ({ score }) => (
  <span style={{ display: 'block', marginTop: '10px' }}>
    <span
      aria-hidden="true"
      style={{
        display: 'block',
        height: '8px',
        borderRadius: '999px',
        background: hexToRgba(PEACH, 0.55),
        overflow: 'hidden',
      }}
    >
      <motion.span
        initial={{ width: 0 }}
        animate={{ width: `${score}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        style={{ display: 'block', height: '100%', background: VIOLET }}
      />
    </span>
    <span className="sr-only">{`Score ${score} out of 100`}</span>
  </span>
)

const keylessRows = [
  { id: 'cuisines', label: 'Cuisine listed' },
  { id: 'hours', label: 'Opening hours' },
  { id: 'contact', label: 'Phone or website' },
  { id: 'menu', label: 'Menu link' },
  { id: 'richness', label: 'Listing richness' },
  { id: 'photos', label: 'Photos' },
]

const SignalIcon = ({ hit }) => (
  <i
    className={hit ? 'ri-check-line' : 'ri-close-line'}
    aria-hidden="true"
    style={{ fontSize: '15px', color: hit ? GREEN : INK_40 }}
  />
)

const SidePanel = ({ side, isWinner, method }) => {
  const keyless = Boolean(method?.keyless)
  const weights = keyless
    ? [
        { id: 'cuisines', label: 'Cuisine listed', weight: '22%' },
        { id: 'hours', label: 'Opening hours', weight: '18%' },
        { id: 'contact', label: 'Phone or website', weight: '16%' },
        { id: 'menu', label: 'Menu link', weight: '14%' },
        { id: 'richness', label: 'Listing richness', weight: '16%' },
        { id: 'photos', label: 'Photos', weight: '14%' },
      ]
    : [
        { id: 'rating', label: 'Rating quality', weight: '50%' },
        { id: 'volume', label: 'Review volume', weight: '30%' },
        { id: 'value', label: 'Value for money', weight: '20%' },
      ]

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      style={{ ...card, padding: '22px', border: isWinner ? `2px solid ${VIOLET}` : card.border }}
    >
      <p
        style={{
          fontFamily: FONT,
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: isWinner ? GREEN : INK_55,
        }}
      >
        {isWinner ? 'Winner' : 'Runner up'}
      </p>
      <h3
        style={{
          fontFamily: FONT,
          fontSize: '17px',
          fontWeight: 700,
          letterSpacing: '-0.02em',
          color: INK,
          marginTop: '8px',
        }}
      >
        {side.place.name}
      </h3>
      {!keyless ? <RatingBadge rating={side.place.rating} reviewCount={side.place.reviewCount} /> : null}
      {side.place.address ? (
        <p style={{ ...bodyText, marginTop: '8px', fontSize: '12.5px' }}>{side.place.address}</p>
      ) : null}
      <p style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '16px' }}>
        <span style={{ fontFamily: FONT, fontSize: '30px', fontWeight: 800, letterSpacing: '-0.04em', color: INK }}>
          {side.score.total}
        </span>
        <span style={{ fontFamily: FONT, fontSize: '12px', color: INK_55 }}>out of 100</span>
      </p>
      <ScoreBar score={side.score.total} />
      <h4 style={{ fontFamily: FONT, fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: INK_55, marginTop: '18px' }}>
        {keyless ? 'What the public listing shows' : 'What the score weighs'}
      </h4>
      <ul role="list" className="list-none" style={{ margin: '10px 0 0', display: 'grid', gap: '8px' }}>
        {weights.map((row) => {
          const entry = side.score.components?.[row.id]
          const hit = keyless ? Boolean(entry?.hit) : typeof entry?.score === 'number'
          return (
            <li key={row.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <SignalIcon hit={hit} />
              <div>
                <p style={{ fontFamily: FONT, fontSize: '12.5px', fontWeight: 600, color: INK }}>
                  {row.label}{' '}
                  <span style={{ color: INK_40 }}>({row.weight})</span>
                  <span className="sr-only">{hit ? ' - signal present' : ' - signal missing'}</span>
                </p>
                {!keyless ? (
                  <p style={{ fontFamily: FONT, fontSize: '12px', fontWeight: 500, color: INK_70 }}>
                    {entry?.score} points
                  </p>
                ) : null}
              </div>
            </li>
          )
        })}
      </ul>
      <Link
        to={`/restaurant/${encodeURIComponent(side.place.id)}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          marginTop: '16px',
          fontFamily: FONT,
          fontSize: '12.5px',
          fontWeight: 600,
          color: INK,
          textDecoration: 'none',
        }}
      >
        <span aria-hidden="true">Open full card</span>
        <i className="ri-arrow-right-line" aria-hidden="true" style={{ fontSize: '14px' }} />
        <span className="sr-only">{`Opening the full card for ${side.place.name}`}</span>
      </Link>
    </motion.article>
  )
}

const tableRows = (result) => {
  if (result.method?.keyless) {
    return [
      { label: 'Completeness score', left: `${result.left.score.total}/100`, right: `${result.right.score.total}/100` },
      {
        label: 'Signals found',
        left: result.left.score.present.join(' | ') || 'None of the six signals',
        right: result.right.score.present.join(' | ') || 'None of the six signals',
      },
      {
        label: 'Cuisines',
        left: result.left.place.cuisines?.join(', ') || 'Not listed',
        right: result.right.place.cuisines?.join(', ') || 'Not listed',
      },
      {
        label: 'Hours known',
        left: result.left.place.hours?.length ? 'Yes' : 'Not listed',
        right: result.right.place.hours?.length ? 'Yes' : 'Not listed',
      },
      {
        label: 'Phone',
        left: result.left.place.contacts?.phone || 'Not listed',
        right: result.right.place.contacts?.phone || 'Not listed',
      },
      {
        label: 'Website',
        left: result.left.place.contacts?.website ? 'Listed' : 'Not listed',
        right: result.right.place.contacts?.website ? 'Listed' : 'Not listed',
      },
      {
        label: 'Menu link',
        left: result.left.place.menuUrl ? 'Available' : 'Not listed',
        right: result.right.place.menuUrl ? 'Available' : 'Not listed',
      },
    ]
  }
  return [
    { label: 'Rating quality', left: signalCell(result.left.place, 'rating'), right: signalCell(result.right.place, 'rating') },
    { label: 'Review volume', left: signalCell(result.left.place, 'volume'), right: signalCell(result.right.place, 'volume') },
    { label: 'Value for money', left: signalCell(result.left.place, 'value'), right: signalCell(result.right.place, 'value') },
    {
      label: 'Cuisines',
      left: result.left.place.cuisines?.join(', ') || 'Not listed',
      right: result.right.place.cuisines?.join(', ') || 'Not listed',
    },
    {
      label: 'Open now',
      left: result.left.place.openNow === null ? 'Not listed' : result.left.place.openNow ? 'Yes' : 'No',
      right: result.right.place.openNow === null ? 'Not listed' : result.right.place.openNow ? 'Yes' : 'No',
    },
  ]
}

const ComparePairResult = ({ result }) => {
  const leftWins = result.winner?.id === result.left.place.id

  return (
    <div style={{ marginTop: '34px' }}>
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        style={{ ...card, padding: '26px 24px', textAlign: 'center' }}
      >
        <p
          style={{
            fontFamily: FONT,
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: INK_55,
          }}
        >
          Verdict
        </p>
        <p style={{ ...sectionHeadline, fontSize: 'clamp(1.2rem, 2.6vw, 1.7rem)', marginTop: '10px' }}>
          {result.verdict}
        </p>
        {result.method?.keyless ? (
          <p style={{ ...bodyText, maxWidth: '560px', margin: '12px auto 0', fontSize: '13px' }}>
            Open-data mode weighs cuisine, hours, contacts, menu links, listing richness and photos - taste itself stays
            unranked without a ratings source.
          </p>
        ) : (
          <p style={{ ...bodyText, maxWidth: '540px', margin: '12px auto 0', fontSize: '13px' }}>
            Weighed on rating quality ({Math.round(result.method.weights.rating * 100)}%), review volume (
            {Math.round(result.method.weights.volume * 100)}%) and value for money (
            {Math.round(result.method.weights.value * 100)}%).
          </p>
        )}
      </motion.div>

      <div className="grid gap-5 md:grid-cols-2" style={{ marginTop: '20px' }}>
        <SidePanel side={result.left} isWinner={leftWins} method={result.method} />
        <SidePanel side={result.right} isWinner={!leftWins} method={result.method} />
      </div>

      <section style={{ marginTop: '34px' }} aria-labelledby="pair-table-heading">
        <h2 id="pair-table-heading" style={{ ...sectionHeadline, fontSize: 'clamp(1.2rem, 2.4vw, 1.5rem)' }}>
          Side by side
        </h2>
        <div style={{ ...card, marginTop: '16px', padding: '6px', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <caption className="sr-only">
              {`Metrics compared between ${result.left.place.name} and ${result.right.place.name}`}
            </caption>
            <thead>
              <tr>
                <th scope="col" style={headStyle}>
                  Metric
                </th>
                <th scope="col" style={headStyle}>
                  {result.left.place.name}
                </th>
                <th scope="col" style={headStyle}>
                  {result.right.place.name}
                </th>
              </tr>
            </thead>
            <tbody>
              {tableRows(result).map((row) => (
                <tr key={row.label}>
                  <th scope="row" style={{ ...cellStyle, fontWeight: 600, color: INK }}>
                    {row.label}
                  </th>
                  <td style={cellStyle}>{row.left}</td>
                  <td style={cellStyle}>{row.right}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section style={{ marginTop: '34px' }} aria-labelledby="pair-reasons-heading">
        <h2 id="pair-reasons-heading" style={{ ...sectionHeadline, fontSize: 'clamp(1.2rem, 2.4vw, 1.5rem)' }}>
          Why
        </h2>
        <ul role="list" className="list-none" style={{ marginTop: '14px', display: 'grid', gap: '10px' }}>
          {result.reasons.map((reason, index) => (
            <li
              key={index}
              style={{ ...card, padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}
            >
              <i
                className="ri-checkbox-blank-circle-fill"
                aria-hidden="true"
                style={{ fontSize: '5px', marginTop: '8px', color: YELLOW, WebkitTextStroke: '1px rgba(58,12,163,0.5)' }}
              />
              <p style={{ ...bodyText, fontSize: '13px' }}>{reason.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <Attribution google={!result.method?.keyless} osm={Boolean(result.method?.keyless)} />
    </div>
  )
}

export default ComparePairResult