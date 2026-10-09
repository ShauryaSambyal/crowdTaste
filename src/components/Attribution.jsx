import { FONT, INK_55 } from '../theme'

const linkStyle = {
  color: INK_55,
  fontWeight: 600,
  textDecoration: 'underline',
  textDecorationColor: 'rgba(58,12,163,0.3)',
}

// Attribution required by the data providers: OpenStreetMap asks to credit its
// contributors (ODbL) wherever Places-style data is shown, TheMealDB needs a
// mention wherever dish photos appear, and Google requires "Powered by Google"
// for Places data. The app shows exactly the set it is using.
const Attribution = ({ osm = false, meals = false, google = false, yelp = false, sample = false, align = 'center' }) => {
  const blocks = []
  if (sample) {
    blocks.push({
      id: 'sample',
      label: 'Restaurant data',
      linkText: 'bundled CrowdTaste sample list',
      href: 'https://www.openstreetmap.org/copyright',
    })
  }
  if (osm) {
    blocks.push({
      id: 'osm',
      label: 'Restaurant data',
      linkText: 'OpenStreetMap contributors, ODbL',
      href: 'https://www.openstreetmap.org/copyright',
    })
  }
  if (google) {
    blocks.push({
      id: 'google',
      label: 'Restaurant data',
      linkText: 'Powered by Google',
      href: 'https://www.google.com/maps',
    })
  }
  if (yelp) {
    blocks.push({
      id: 'yelp',
      label: 'Reviews',
      linkText: 'Powered by Yelp',
      href: 'https://www.yelp.com/',
    })
  }
  if (meals) {
    blocks.push({
      id: 'meals',
      label: 'Dish photos',
      linkText: 'TheMealDB',
      href: 'https://www.themealdb.com/',
    })
  }

  if (blocks.length === 0) return null

  return (
    <p
      style={{
        marginTop: '20px',
        fontFamily: FONT,
        fontSize: '11.5px',
        fontWeight: 500,
        lineHeight: 1.6,
        color: INK_55,
        textAlign: align,
      }}
    >
      {blocks.map((block, index) => (
        <span key={block.id}>
          {index > 0 ? <span aria-hidden="true"> | </span> : null}
          {block.label}{' '}
          <a href={block.href} target="_blank" rel="noreferrer" style={linkStyle}>
            {block.linkText}
          </a>
        </span>
      ))}
    </p>
  )
}

export default Attribution