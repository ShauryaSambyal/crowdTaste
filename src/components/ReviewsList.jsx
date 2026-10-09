import { motion } from 'framer-motion'
import { FONT, INK, INK_40, INK_55, INK_72, bodyText, card, sectionHeadline } from '../theme'

const sectionTitle = { ...sectionHeadline, fontSize: 'clamp(1.3rem, 2.4vw, 1.7rem)' }

const formatCount = (value) => new Intl.NumberFormat('en-IN').format(Number(value) || 0)

const ReviewsList = ({ reviews = [], placeName = 'this place', reviewCount = null, note = '' }) => {
  if (reviews.length === 0) {
    return (
      <section style={{ marginTop: '52px' }} aria-labelledby="reviews-heading">
        <h2 id="reviews-heading" style={sectionTitle}>
          What people say
        </h2>
        <p style={{ ...bodyText, marginTop: '10px', fontSize: '13.5px' }}>
          {note || `No written reviews were returned for ${placeName} yet.`}
        </p>
      </section>
    )
  }

  return (
    <section style={{ marginTop: '52px' }} aria-labelledby="reviews-heading">
      <h2 id="reviews-heading" style={sectionTitle}>
        What people say
      </h2>
      <p style={{ ...bodyText, marginTop: '10px', fontSize: '13.5px' }}>
        {typeof reviewCount === 'number' && reviewCount > reviews.length
          ? `Showing ${reviews.length} of ${formatCount(reviewCount)} diner reviews for ${placeName}.`
          : `Condensed from ${reviews.length} diner ${reviews.length === 1 ? 'review' : 'reviews'} for ${placeName}.`}
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
                <cite style={{ fontFamily: FONT, fontSize: '13px', fontStyle: 'normal', fontWeight: 600, color: INK }}>
                  {review.author}
                </cite>
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
              <i className="ri-double-quotes-l" aria-hidden="true" style={{ fontSize: '18px', color: INK_40 }} />
              <p style={{ ...bodyText, marginTop: '8px', fontSize: '13.5px', color: INK_72 }}>{review.text}</p>
            </motion.blockquote>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default ReviewsList