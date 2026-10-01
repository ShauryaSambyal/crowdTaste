import { motion } from 'framer-motion'
import { bodyText, sectionHeadline } from '../theme'

const sectionTitle = { ...sectionHeadline, fontSize: 'clamp(1.3rem, 2.4vw, 1.7rem)' }

const PhotoGallery = ({ images = [], title = 'Photos', hint = '', headingId = 'gallery-heading' }) => {
  if (images.length === 0) {
    return hint ? (
      <section style={{ marginTop: '52px' }} aria-labelledby={headingId}>
        <h2 id={headingId} style={sectionTitle}>
          {title}
        </h2>
        <p style={{ ...bodyText, marginTop: '10px', fontSize: '13.5px' }}>{hint}</p>
      </section>
    ) : null
  }

  return (
    <section style={{ marginTop: '52px' }} aria-labelledby={headingId}>
      <h2 id={headingId} style={sectionTitle}>
        {title}
      </h2>
      <ul role="list" className="grid list-none gap-4 sm:grid-cols-2 lg:grid-cols-3" style={{ marginTop: '20px' }}>
        {images.map((image, index) => (
          <li key={image.src + index}>
            <motion.figure
              whileHover={{ y: -6 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              style={{
                margin: 0,
                borderRadius: '18px',
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.8)',
                boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                background: 'rgba(31,31,31,0.05)',
              }}
            >
              <img
                src={image.src}
                alt={image.alt}
                loading="lazy"
                style={{
                  display: 'block',
                  width: '100%',
                  height: index === 0 ? '240px' : '186px',
                  objectFit: 'cover',
                }}
              />
            </motion.figure>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default PhotoGallery