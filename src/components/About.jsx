import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { sampleCount } from '../lib/sampleData'
import {
  FONT,
  INK,
  INK_55,
  INK_70,
  bodyText,
  card,
  eyebrowPill,
  heroHeadline,
  primaryButton,
  secondaryButton,
  sectionHeadline,
} from '../theme'

// Built-in, no keys, no signup: OpenStreetMap for venues, TheMealDB for dish photos.
const values = [
  {
    icon: 'ri-database-2-line',
    title: 'Open by default',
    copy: 'Every search, card and comparison already works on live OpenStreetMap data - no keys, no signup, no card.',
  },
  {
    icon: 'ri-filter-3-line',
    title: 'Scored in the open',
    copy: 'Compare shows its maths and its limits: completeness scoring on open data, rating scoring when a Google key exists.',
  },
  {
    icon: 'ri-map-pin-2-line',
    title: 'Local-first',
    copy: 'Built around Bengaluru and Karnataka - the tiffin institutions, the biryani stops, the neighbourhood favourites.',
  },
]

const providerList = [
  {
    id: 'osm',
    icon: 'ri-map-pin-2-line',
    title: 'OpenStreetMap (built in)',
    provides:
      'Venue search and details: names, addresses, cuisines, opening hours, phone, website and official menu links for mapped restaurants in your city.',
    signup: 'https://www.openstreetmap.org/copyright',
    signupLabel: 'Read the OSM licence',
    steps: [
      'Nothing to do - Nominatim, Overpass and Wikimedia Commons run without keys or signup.',
      'You can improve the map yourself at openstreetmap.org: richer tags mean richer cards here.',
    ],
    cost: 'Free forever. The app throttles itself to one map-search request per second and caches answers.',
  },
  {
    id: 'mealdb',
    icon: 'ri-restaurant-2-line',
    title: 'TheMealDB (built in)',
    provides:
      'Authentic dish photos and ingredient lists for dishes typical of a cuisine. Nothing is priced, so nothing is shown as priced - honesty over invention.',
    signup: 'https://www.themealdb.com/api.php',
    signupLabel: 'Read the API docs',
    steps: ['Nothing to do - the free test key is already bundled in the app.'],
    cost: 'Free for development and education. Photo credit goes to TheMealDB on every gallery.',
  },
  {
    id: 'google',
    icon: 'ri-star-line',
    title: 'Google Places (optional)',
    provides:
      'Adds ratings, review counts, written diner reviews and extra venue photos. Without it, search, details and Compare already work on open data.',
    keyName: 'GOOGLE_PLACES_API_KEY',
    signup: 'https://developers.google.com/maps/demo-key',
    signupLabel: 'Get a card-free demo key',
    steps: [
      'Sign in with a Google account and click "Get a Demo Key" - no credit card or billing account needed.',
      'Paste the key into .env as GOOGLE_PLACES_API_KEY and restart npm run dev.',
      'Basic ratings and extra photos switch on automatically. Reviews and photos stay off on demo keys.',
    ],
    cost: 'Demo keys are free with a daily limit. Production use would need a billing key instead.',
  },
]

const codeChip = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: '12px',
  padding: '2px 8px',
  borderRadius: '8px',
  background: 'rgba(31,31,31,0.06)',
  color: INK,
}

const About = () => {
  const stats = [
    { value: '0', label: 'keys or signups needed to run the app' },
    { value: '20', label: 'places ranked per area in Compare' },
    { value: String(sampleCount), label: 'sample entries for the offline fallback' },
  ]

  return (
    <div style={{ position: 'relative', zIndex: 10, maxWidth: '1100px', margin: '0 auto', padding: '128px 24px 96px' }}>
      <header style={{ textAlign: 'center' }}>
        <motion.span
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: 'easeOut' }}
          style={{ ...eyebrowPill, marginBottom: '20px' }}
        >
          About CrowdTaste
        </motion.span>
        <motion.h1
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.22, ease: 'easeOut' }}
          style={{ ...heroHeadline, maxWidth: '660px', margin: '0 auto' }}
        >
          Open data, honest verdicts.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.38, ease: 'easeOut' }}
          style={{ ...bodyText, maxWidth: '560px', margin: '16px auto 0' }}
        >
            CrowdTaste pulls restaurant data straight from the open web, shows you hours, menus and photos for every
            place, and tells you which listing is the best documented - honestly flagging that taste itself needs
            ratings it does not have yet.
        </motion.p>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.5, ease: 'easeOut' }}
        className="flex flex-wrap items-center justify-center gap-4"
        style={{ marginTop: '42px' }}
      >
        {stats.map((stat) => (
          <div key={stat.label} style={{ ...card, minWidth: '210px', padding: '22px 26px', textAlign: 'center' }}>
            <p style={{ fontFamily: FONT, fontSize: '30px', fontWeight: 600, letterSpacing: '-0.03em', color: INK }}>
              {stat.value}
            </p>
            <p style={{ ...bodyText, marginTop: '6px', fontSize: '12.5px' }}>{stat.label}</p>
          </div>
        ))}
      </motion.div>

      <section style={{ marginTop: '72px' }} aria-labelledby="values-heading">
        <h2 id="values-heading" style={{ ...sectionHeadline, maxWidth: '520px', margin: '0 auto', textAlign: 'center' }}>
          What we care about
        </h2>
        <div className="grid gap-5 md:grid-cols-3" style={{ marginTop: '38px' }}>
          {values.map((value, index) => (
            <motion.div
              key={value.title}
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, delay: index * 0.12, ease: 'easeOut' }}
              whileHover={{ y: -6 }}
              style={{ ...card, padding: '28px 26px' }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  background: 'rgba(31,31,31,0.06)',
                  border: '1px solid rgba(31,31,31,0.05)',
                  color: INK,
                  fontSize: '17px',
                  marginBottom: '18px',
                }}
              >
                <i className={value.icon} aria-hidden="true" />
              </span>
              <h3 style={{ fontFamily: FONT, fontSize: '17px', fontWeight: 600, letterSpacing: '-0.01em', color: INK, marginBottom: '10px' }}>
                {value.title}
              </h3>
              <p style={{ ...bodyText, fontSize: '13.5px' }}>{value.copy}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section style={{ marginTop: '80px' }} aria-labelledby="providers-heading">
        <h2 id="providers-heading" style={{ ...sectionHeadline, maxWidth: '560px', margin: '0 auto', textAlign: 'center' }}>
          Where the data comes from
        </h2>
        <p style={{ ...bodyText, maxWidth: '620px', margin: '16px auto 0', textAlign: 'center' }}>
          Two data sources power the app out of the box with no signup at all - the local
          API layer talks to them directly. Only ratings and written reviews need an optional Google key.
        </p>

        <div className="grid gap-5 md:grid-cols-2" style={{ marginTop: '34px' }}>
          {providerList.map((provider, index) => (
            <motion.article
              key={provider.id}
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6, delay: index * 0.1, ease: 'easeOut' }}
              style={{ ...card, display: 'flex', flexDirection: 'column', padding: '26px 26px 24px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '38px',
                    height: '38px',
                    borderRadius: '12px',
                    background: 'rgba(31,31,31,0.06)',
                    color: INK,
                    fontSize: '16px',
                  }}
                >
                  <i className={provider.icon} aria-hidden="true" />
                </span>
                <h3 style={{ fontFamily: FONT, fontSize: '16px', fontWeight: 600, color: INK }}>{provider.title}</h3>
              </div>

              <p style={{ ...bodyText, marginTop: '14px', fontSize: '13.5px' }}>{provider.provides}</p>

              {provider.keyName ? (
                <p style={{ ...bodyText, marginTop: '14px', fontSize: '13px' }}>
                  Add the key to .env as <code style={codeChip}>{provider.keyName}</code> and restart npm run dev.
                </p>
              ) : (
                <p style={{ ...bodyText, marginTop: '14px', fontSize: '13px', color: INK_70 }}>
                  No key needed - already switched on.
                </p>
              )}

              <ol style={{ margin: '14px 0 0', paddingLeft: '20px', display: 'grid', gap: '6px' }}>
                {provider.steps.map((step) => (
                  <li key={step} style={{ ...bodyText, fontSize: '13px' }}>
                    {step}
                  </li>
                ))}
              </ol>

              <p style={{ ...bodyText, marginTop: '14px', fontSize: '12.5px', color: INK_55 }}>{provider.cost}</p>

              <p style={{ marginTop: 'auto', paddingTop: '18px' }}>
                <a
                  href={provider.signup}
                  target="_blank"
                  rel="noreferrer"
                  style={{ ...secondaryButton, padding: '10px 18px', fontSize: '13px' }}
                >
                  {provider.signupLabel}
                  <i className="ri-external-link-line" aria-hidden="true" style={{ fontSize: '13px' }} />
                </a>
              </p>
            </motion.article>
          ))}
        </div>

        <p style={{ ...bodyText, marginTop: '20px', textAlign: 'center', fontSize: '12.5px', color: INK_70 }}>
          Want ratings too? One optional Google Places key - demo keys need no card - adds them. Until then every
          verdict says plainly what it is and is not ranking.
        </p>
      </section>

      <motion.div
        initial={{ opacity: 0, y: 22 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        style={{ ...card, marginTop: '64px', padding: '48px 32px', textAlign: 'center' }}
      >
        <h2 style={{ ...sectionHeadline, maxWidth: '520px', margin: '0 auto' }}>Ready to find your next favourite?</h2>
        <p style={{ ...bodyText, maxWidth: '460px', margin: '16px auto 0' }}>
          Search a name, a dish or an area - or settle the argument with a head to head.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '13px', marginTop: '28px' }}>
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} style={{ display: 'inline-flex' }}>
            <Link to="/discover" style={primaryButton}>
              Start discovering
              <i className="ri-arrow-right-line" aria-hidden="true" style={{ fontSize: '15px' }} />
            </Link>
          </motion.div>
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} style={{ display: 'inline-flex' }}>
            <Link to="/compare" style={secondaryButton}>
              Compare restaurants
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}

export default About