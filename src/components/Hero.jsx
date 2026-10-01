import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  FONT,
  INK,
  bodyText,
  eyebrowPill,
  heroHeadline,
  primaryButton,
  secondaryButton,
  tinyLabel,
} from '../theme'

const sponsors = ['MTR', 'Karavalli', 'Vidyarthi Bhavan', 'Mylari', 'Toit']

const Hero = () => {
  return (
    <section
      className="hero-shell"
      style={{ position: 'relative', width: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      {/* Bright misty wash over the dot grid - stands in for the reference video */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse 75% 52% at 50% 16%, rgba(255,255,255,0.88) 0%, rgba(255,255,255,0) 72%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(to bottom, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 30%, rgba(255,255,255,0) 62%, rgba(255,255,255,0.5) 100%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '-14%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '1000px',
          height: '720px',
          background: 'radial-gradient(ellipse at 50% 30%, rgba(55,48,163,0.05) 0%, transparent 68%)',
          pointerEvents: 'none',
        }}
      />

      {/* Top-anchored content */}
      <div
        className="relative flex flex-1 flex-col items-center text-center"
        style={{ zIndex: 10, padding: '15vh 24px 0' }}
      >
        <motion.span
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: 'easeOut' }}
          style={{ ...eyebrowPill, marginBottom: '20px' }}
        >
          Live ratings, real reviews
        </motion.span>

        <motion.h1
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.22, ease: 'easeOut' }}
          style={{ ...heroHeadline, maxWidth: '640px' }}
        >
          Discover restaurants that speak to you
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.38, ease: 'easeOut' }}
          style={{ ...bodyText, margin: '16px 0 0', maxWidth: '470px' }}
        >
          Search live restaurant data, then compare two places head to head - or ask which restaurant wins in an area.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.52, ease: 'easeOut' }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexWrap: 'wrap',
            gap: '13px',
            marginTop: '28px',
          }}
        >
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} style={{ display: 'inline-flex' }}>
            <Link to="/discover" style={primaryButton}>
              Start discovering
              <i className="ri-arrow-right-line" aria-hidden="true" style={{ fontSize: '15px' }} />
            </Link>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.04, backgroundColor: 'rgba(255,255,255,0.85)' }}
            whileTap={{ scale: 0.97 }}
            style={{ display: 'inline-flex', borderRadius: '9px' }}
          >
            <Link to="/compare" style={secondaryButton}>
              Compare restaurants
            </Link>
          </motion.div>
        </motion.div>
      </div>

      {/* Sponsor strip */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.7, ease: 'easeOut' }}
        style={{ position: 'relative', zIndex: 10, width: '100%', padding: '20px 24px 30px', textAlign: 'center' }}
      >
        <p style={{ ...tinyLabel, marginBottom: '16px' }}>Trusted by diners at</p>
        <div
          className="flex flex-wrap items-center justify-center gap-x-7 gap-y-3 sm:gap-x-11"
          style={{ maxWidth: '820px', margin: '0 auto' }}
        >
          {sponsors.map((name) => (
            <span
              key={name}
              style={{
                fontFamily: FONT,
                fontSize: '18px',
                fontWeight: 700,
                letterSpacing: '0.02em',
                color: 'rgba(31,31,31,0.5)',
                transition: 'color 0.25s ease',
                cursor: 'default',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(event) => { event.currentTarget.style.color = INK }}
              onMouseLeave={(event) => { event.currentTarget.style.color = 'rgba(31,31,31,0.5)' }}
            >
              {name}
            </span>
          ))}
        </div>
      </motion.div>
    </section>
  )
}

export default Hero