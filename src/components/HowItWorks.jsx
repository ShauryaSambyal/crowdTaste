import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  FONT,
  INK,
  INK_40,
  bodyText,
  card,
  eyebrowPill,
  primaryButton,
  secondaryButton,
  sectionHeadline,
} from '../theme'

const steps = [
  {
    number: '01',
    title: 'Search live data',
    copy: 'Type a name, a dish or an area. Results come from Google Places with real ratings, review counts, addresses and photos.',
  },
  {
    number: '02',
    title: 'Compare the shortlist',
    copy: 'Put two places head to head, or ask for the best restaurant in an area and see the score plus the reasons behind it.',
  },
  {
    number: '03',
    title: 'Go eat',
    copy: 'Check the opening hours, the price level, the menu price guide and what diners keep saying - then head out.',
  },
]

const HowItWorks = () => {
  return (
    <section
      id="how"
      style={{ position: 'relative', zIndex: 10, maxWidth: '1100px', margin: '0 auto', padding: '80px 24px 96px' }}
    >
      <div style={{ textAlign: 'center', marginBottom: '44px' }}>
        <motion.span
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{ ...eyebrowPill, marginBottom: '18px' }}
        >
          How it works
        </motion.span>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.7, delay: 0.08, ease: 'easeOut' }}
          style={{ ...sectionHeadline, maxWidth: '560px', margin: '0 auto' }}
        >
          Three steps to your next favourite
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.7, delay: 0.16, ease: 'easeOut' }}
          style={{ ...bodyText, maxWidth: '500px', margin: '16px auto 0' }}
        >
          CrowdTaste trades the endless scroll for live ratings, real diner reviews and a clear verdict.
        </motion.p>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {steps.map((step, index) => (
          <motion.div
            key={step.number}
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, delay: index * 0.12, ease: 'easeOut' }}
            whileHover={{ y: -6 }}
            style={{ ...card, padding: '28px 26px' }}
          >
            <p
              style={{
                fontFamily: FONT,
                fontSize: '12px',
                fontWeight: 700,
                letterSpacing: '0.12em',
                color: INK_40,
                marginBottom: '18px',
              }}
            >
              {step.number}
            </p>
            <h3
              style={{
                fontFamily: FONT,
                fontSize: '17px',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                color: INK,
                marginBottom: '10px',
              }}
            >
              {step.title}
            </h3>
            <p style={{ ...bodyText, fontSize: '13.5px' }}>{step.copy}</p>
          </motion.div>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '13px',
          marginTop: '38px',
        }}
      >
        <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} style={{ display: 'inline-flex' }}>
          <Link to="/discover" style={primaryButton}>
            Start discovering
            <i className="ri-arrow-right-line" aria-hidden="true" style={{ fontSize: '15px' }} />
          </Link>
        </motion.div>
        <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} style={{ display: 'inline-flex' }}>
          <Link to="/compare" style={secondaryButton}>
            Try compare
          </Link>
        </motion.div>
      </div>
    </section>
  )
}

export default HowItWorks