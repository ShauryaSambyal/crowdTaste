import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { FONT, INK, INK_72, PILL_SHADOW, frost } from '../theme'

const navLinks = [
  { label: 'Home', to: '/' },
  { label: 'Discover', to: '/discover' },
  { label: 'Compare', to: '/compare' },
  { label: 'About', to: '/about' },
]

const linkStyle = {
  fontFamily: FONT,
  fontSize: '13px',
  fontWeight: 500,
  color: INK_72,
  textDecoration: 'none',
  whiteSpace: 'nowrap',
  transition: 'color 0.2s ease',
}

const Navbar = () => {
  return (
    <div style={{ position: 'fixed', top: '18px', left: 0, right: 0, zIndex: 50, display: 'flex', justifyContent: 'center', padding: '0 14px' }}>
      <motion.nav
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        aria-label="Main"
        className="flex items-center gap-[18px] sm:gap-9"
        style={{
          padding: '11px 20px',
          borderRadius: '999px',
          ...frost('rgba(255,253,247,0.72)', 'rgba(58,12,163,0.12)', 16),
          boxShadow: PILL_SHADOW,
        }}
      >
        <Link
          to="/"
          style={{ fontFamily: FONT, fontSize: '18px', fontWeight: 800, color: INK, letterSpacing: '-0.03em', textDecoration: 'none', whiteSpace: 'nowrap' }}
        >
          CrowdTaste
        </Link>

        <div className="flex items-center gap-[14px] sm:gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              to={link.to}
              className={link.compact ? 'hidden sm:block' : undefined}
              style={linkStyle}
              onMouseEnter={(event) => { event.currentTarget.style.color = INK }}
              onMouseLeave={(event) => { event.currentTarget.style.color = INK_72 }}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </motion.nav>
    </div>
  )
}

export default Navbar