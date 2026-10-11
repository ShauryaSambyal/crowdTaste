import { motion } from 'framer-motion'
import { FONT, INK, INK_40, INK_55, INK_72, PEACH, VIOLET, bodyText, card, sectionHeadline } from '../theme'

const sectionTitle = { ...sectionHeadline, fontSize: 'clamp(1.3rem, 2.4vw, 1.7rem)' }

const formatCount = (value) => new Intl.NumberFormat('en-IN').format(Number(value) || 0)

const sourceChip = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '3px 10px',
  borderRadius: '999px',
  background: PEACH,
  border: '1px solid rgba(58,12,163,0.14)',
  fontFamily: FONT,
  fontSize: '11.5px',
  fontWeight: 700,
  letterSpacing: '0.02em',
  color: INK,
  textDecoration: 'none',
}

// Every excerpt is quoted from a named, linked source, so "what people say"
// never means "what we made up".
const ReviewsList = ({
  reviews = [],
  placeName = 'this place',
  reviewCount = null,
  ratingSource = null,
  links = [],
  note = '',
}) => {
  if (reviews.length === 0) {
    return (
      <section style={{ marginTop: '52px' }} aria-labelledby="reviews-heading">
        <h2 id="reviews-heading" style={sectionTitle}>
          What people say
        </h2>
        <p style={{ ...bodyText, marginTop: '10px', fontSize: '13.5px' }}>
          {note || `Nothing was found online for ${placeName} yet.`}
        </p>
        {links.length > 0 ? <SourceLinks links={links} /> : null}
      </section>
    )
  }

  return (
    <section style={{ marginTop: '52px' }} aria-labelledby="reviews-heading">
      <h2 id="reviews-heading" style={sectionTitle}>
        What people say
      </h2>
      <p style={{ ...bodyText, marginTop: '10px', fontSize: '13.5px' }}>
        {typeof reviewCount === 'number' && reviewCount > 0
          ? `${formatCount(reviewCount)} reviews published for ${placeName}${ratingSource ? ` on ${ratingSource}` : ''}. `
          : ''}
        {`${reviews.length} excerpt${reviews.length === 1 ? '' : 's'} below — each one links to where it was published.`}
      </p>

      <ul role="list" className="grid list-none gap-4 md:grid-cols-2" style={{ marginTop: '22px' }}>
        {reviews.map((review, index) => (
          <li key={review.id || index}>
            <motion.blockquote
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: Math.min(index * 0.06, 0.3), ease: 'easeOut' }}
              style={{ ...card, margin: 0, height: '100%', padding: '22px 24px' }}
            >
              <footer style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                {review.authorPhoto ? (
                  <img
                    src={review.authorPhoto}
                    alt=""
                    aria-hidden="true"
                    loading="lazy"
                    style={{ width: '28px', height: '28px', borderRadius: '999px', objectFit: 'cover' }}
                  />
                ) : null}
                {review.sourceUrl ? (
                  <a
                    href={review.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={sourceChip}
                    title={`Opens the original on ${review.source}`}
                  >
                    <i className="ri-links-line" aria-hidden="true" style={{ fontSize: '12px' }} />
                    {review.source ?? review.author}
                  </a>
                ) : (
                  <cite style={{ fontFamily: FONT, fontSize: '13px', fontStyle: 'normal', fontWeight: 600, color: INK }}>
                    {review.author}
                  </cite>
                )}
                {typeof review.rating === 'number' ? (
                  <span style={{ fontFamily: FONT, fontSize: '12.5px', fontWeight: 600, color: INK_55 }}>
                    <span aria-hidden="true">{review.rating} / 5</span>
                    <span className="sr-only">{`Rated ${review.rating} out of 5`}</span>
                  </span>
                ) : null}
                {review.relativeTime ? (
                  <time style={{ fontFamily: FONT, fontSize: '12px', fontWeight: 500, color: INK_55, marginLeft: 'auto' }}>
                    {review.relativeTime}
                  </time>
                ) : null}
              </footer>
              {review.title ? (
                <p style={{ fontFamily: FONT, fontSize: '13.5px', fontWeight: 700, color: INK, marginBottom: '4px' }}>
                  {review.title}
                </p>
              ) : null}
              <i className="ri-double-quotes-l" aria-hidden="true" style={{ fontSize: '18px', color: INK_40 }} />
              <p style={{ ...bodyText, marginTop: '8px', fontSize: '13.5px', color: INK_72 }}>{review.text}</p>
              {review.sourceUrl ? (
                <a
                  href={review.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginTop: '12px',
                    fontFamily: FONT,
                    fontSize: '12.5px',
                    fontWeight: 600,
                    color: VIOLET,
                    textDecoration: 'none',
                  }}
                >
                  Read the original on {review.source ?? 'the source'}
                  <i className="ri-external-link-line" aria-hidden="true" style={{ fontSize: '13px' }} />
                </a>
              ) : null}
            </motion.blockquote>
          </li>
        ))}
      </ul>

      {links.length > 0 ? <SourceLinks links={links} /> : null}
    </section>
  )
}

const SourceLinks = ({ links }) => (
  <div style={{ marginTop: '20px' }}>
    <p style={{ fontFamily: FONT, fontSize: '12px', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: INK_55 }}>
      Read the full reviews
    </p>
    <ul role="list" className="flex list-none flex-wrap gap-2.5" style={{ marginTop: '10px' }}>
      {links.map((link) => (
        <li key={`${link.source}-${link.url}`}>
          <a href={link.url} target="_blank" rel="noreferrer" style={{ ...sourceChip, padding: '7px 14px', fontSize: '12.5px' }}>
            {link.source}
            {typeof link.rating === 'number' ? <span style={{ fontWeight: 600 }}>{link.rating.toFixed(1)}</span> : null}
            <i className="ri-external-link-line" aria-hidden="true" style={{ fontSize: '12px' }} />
          </a>
        </li>
      ))}
    </ul>
  </div>
)

export default ReviewsList
