import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { FONT, INK, INK_55, INK_70, PEACH, VIOLET, bodyText, card, hexToRgba, sectionHeadline } from '../theme'
import Attribution from './Attribution'
import RatingBadge from './RatingBadge'

const chipStyle = {
  padding: '6px 12px',
  borderRadius: '999px',
  background: hexToRgba(PEACH, 0.5),
  border: '1px solid rgba(58,12,163,0.12)',
  fontFamily: FONT,
  fontSize: '12px',
  fontWeight: 600,
  color: INK_70,
}

const detailLink = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  fontFamily: FONT,
  fontSize: '12.5px',
  fontWeight: 600,
  color: INK,
  textDecoration: 'none',
}

const methodNote = (result) => {
  if (result.method?.keyless) {
    return {
      heading: 'How this open-data ranking works',
      lines: (result.method.basis ?? []).map((line) => `Listings are scored on ${line.toLowerCase()}.`),
      footer:
        'OpenStreetMap has no diner ratings, so taste itself is not ranked here. Paste a Google Places key in .env for a rating-based leaderboard.',
    }
  }
  return {
    heading: 'How this ranking works',
    lines: [
      `Rating quality ${Math.round(result.method.weights.rating * 100)}% - the average Google rating out of 5.`,
      `Review volume ${Math.round(result.method.weights.volume * 100)}% - more reviews means a rating you can trust (log scale, capped at ${result.method.provenReviewCount} reviews).`,
      `Value for money ${Math.round(result.method.weights.value * 100)}% - cheaper price levels score slightly higher, unknown prices stay neutral.`,
    ],
    footer:
      'Only places Google returns for this area are ranked, so popular spots with few reviews can be missed.',
  }
}

const CompareAreaResult = ({ result }) => {
  const winner = result.ranking[0]
  const keyless = Boolean(result.method?.keyless)
  const notes = methodNote(result)

  return (
    <div style={{ marginTop: '34px' }}>
      {winner ? (
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{ ...card, padding: '28px 24px', textAlign: 'center', border: `2px solid ${VIOLET}` }}
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
            {keyless ? 'Best documented listing' : 'Best'} in {result.query.location}
            {result.query.cuisine ? ` for ${result.query.cuisine}` : ''}
          </p>
          <p style={{ ...sectionHeadline, fontSize: 'clamp(1.3rem, 2.8vw, 1.9rem)', marginTop: '12px' }}>
            {winner.place.name}
          </p>
          {!keyless ? (
            <RatingBadge
              rating={winner.place.rating}
              reviewCount={winner.place.reviewCount}
              style={{ justifyContent: 'center' }}
            />
          ) : null}
          <p style={{ ...bodyText, maxWidth: '640px', margin: '14px auto 0', fontSize: '13.5px' }}>{result.verdict}</p>
          <p style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginTop: '18px' }}>
            {winner.highlights.map((tag) => (
              <span key={tag} style={chipStyle}>
                {tag}
              </span>
            ))}
          </p>
          <Link
            to={`/restaurant/${encodeURIComponent(winner.place.id)}`}
            style={{ ...detailLink, marginTop: '18px' }}
          >
            <span aria-hidden="true">Open the full card</span>
            <i className="ri-arrow-right-line" aria-hidden="true" style={{ fontSize: '14px' }} />
            <span className="sr-only">{`Opening the full card for ${winner.place.name}`}</span>
          </Link>
        </motion.div>
      ) : (
        <div style={{ ...card, padding: '26px 24px', textAlign: 'center' }}>
          <p style={{ ...bodyText, fontSize: '13.5px' }}>{result.verdict}</p>
        </div>
      )}

      {result.ranking.length > 1 ? (
        <section style={{ marginTop: '34px' }} aria-labelledby="area-ranking-heading">
          <h2 id="area-ranking-heading" style={{ ...sectionHeadline, fontSize: 'clamp(1.2rem, 2.4vw, 1.5rem)' }}>
            Full ranking
          </h2>
          <ol role="list" className="list-none" style={{ marginTop: '16px', display: 'grid', gap: '12px' }}>
            {result.ranking.map((entry, index) => (
              <motion.li
                key={entry.place.id || index}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.45, delay: Math.min(index * 0.04, 0.3), ease: 'easeOut' }}
                style={{
                  ...card,
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '16px 18px',
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '30px',
                    height: '30px',
                    borderRadius: '10px',
                    background: hexToRgba(PEACH, 0.6),
                    fontFamily: FONT,
                    fontSize: '12.5px',
                    fontWeight: 700,
                    color: INK,
                  }}
                >
                  {entry.rank}
                </span>
                <span className="sr-only">{`Rank ${entry.rank} of ${result.ranking.length}`}</span>
                <div style={{ flex: '1 1 220px', minWidth: '200px' }}>
                  <h3 style={{ fontFamily: FONT, fontSize: '15px', fontWeight: 700, color: INK }}>{entry.place.name}</h3>
                  <p style={{ ...bodyText, marginTop: '4px', fontSize: '12.5px' }}>
                    {entry.highlights.join(' | ')}
                  </p>
                </div>
                <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{ fontFamily: FONT, fontSize: '20px', fontWeight: 800, color: INK }}>
                    {entry.score.total}
                  </span>
                  <span style={{ fontFamily: FONT, fontSize: '11.5px', color: INK_55 }}>/ 100</span>
                  <span className="sr-only">{`score ${entry.score.total} out of 100`}</span>
                </span>
                <Link to={`/restaurant/${encodeURIComponent(entry.place.id)}`} style={detailLink}>
                  <span aria-hidden="true">Details</span>
                  <i className="ri-arrow-right-line" aria-hidden="true" style={{ fontSize: '14px' }} />
                  <span className="sr-only">{`Details for ${entry.place.name}`}</span>
                </Link>
              </motion.li>
            ))}
          </ol>
        </section>
      ) : null}

      <section style={{ marginTop: '30px' }} aria-labelledby="method-heading">
        <h2 id="method-heading" style={{ ...sectionHeadline, fontSize: '1.1rem' }}>
          {notes.heading}
        </h2>
        <ul role="list" className="list-none" style={{ marginTop: '12px', display: 'grid', gap: '8px' }}>
          {notes.lines.map((line) => (
            <li key={line} style={{ ...bodyText, fontSize: '13px' }}>
              {line}
            </li>
          ))}
        </ul>
        <p style={{ ...bodyText, marginTop: '12px', fontSize: '12.5px', color: INK_55 }}>
          {notes.footer}
        </p>
      </section>

      <Attribution google={!keyless} osm={keyless} />
    </div>
  )
}

export default CompareAreaResult