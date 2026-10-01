import { Link } from 'react-router-dom'
import { FONT, INK, INK_55, INK_72, bodyText } from '../theme'

const footerLinks = [
  { label: 'Home', to: '/' },
  { label: 'Discover', to: '/discover' },
  { label: 'Compare', to: '/compare' },
  { label: 'How it works', to: '/#how' },
  { label: 'About', to: '/about' },
]

const Footer = () => {
  return (
    <footer style={{ position: 'relative', zIndex: 10, borderTop: '1px solid rgba(31,31,31,0.1)' }}>
      <div className="mx-auto flex flex-wrap items-center justify-between gap-4 px-6 py-7" style={{ maxWidth: '1100px' }}>
        <div>
          <p style={{ fontFamily: FONT, fontSize: '15px', fontWeight: 700, color: INK, letterSpacing: '-0.01em' }}>
            CrowdTaste
          </p>
          <p style={{ ...bodyText, fontSize: '12.5px', marginTop: '4px' }}>
            Restaurant discovery with live ratings, reviews and menu prices. Bengaluru, India.
          </p>
        </div>

        <nav aria-label="Footer" className="flex flex-wrap items-center gap-6">
          {footerLinks.map((link) => (
            <Link
              key={link.label}
              to={link.to}
              style={{
                fontFamily: FONT,
                fontSize: '13px',
                fontWeight: 500,
                color: INK_72,
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                transition: 'color 0.2s ease',
              }}
              onMouseEnter={(event) => { event.currentTarget.style.color = INK }}
              onMouseLeave={(event) => { event.currentTarget.style.color = INK_72 }}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="mx-auto px-6 pb-8" style={{ maxWidth: '1100px' }}>
        <p style={{ fontFamily: FONT, fontSize: '12px', color: INK_55 }}>
          {'(c) '}
          {new Date().getFullYear()} CrowdTaste. Restaurant data by Google Places, menu data by Spoonacular.
        </p>
      </div>
    </footer>
  )
}

export default Footer