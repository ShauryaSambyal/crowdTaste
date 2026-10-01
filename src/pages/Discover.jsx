import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { getLiveStatus } from '../lib/api'
import { sampleCount } from '../lib/sampleData'
const visibleSourceCount = 'OpenStreetMap + TheMealDB'
import { bodyText, eyebrowPill, heroHeadline } from '../theme'
import Attribution from '../components/Attribution'
import ProviderNotice from '../components/ProviderNotice'
import Searchbar from '../components/Searchbar'

const Discover = () => {
  const [live, setLive] = useState(null)

  useEffect(() => {
    let cancelled = false
    getLiveStatus()
      .then((status) => {
        if (!cancelled) setLive(status)
      })
      .catch(() => {
        if (!cancelled) setLive({ google: false, spoonacular: false, mode: 'sample' })
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div style={{ position: 'relative', zIndex: 10, maxWidth: '1100px', margin: '0 auto', padding: '132px 24px 80px' }}>
      <header style={{ textAlign: 'center' }}>
        <motion.span
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{ ...eyebrowPill, marginBottom: '20px' }}
        >
          Discover
        </motion.span>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.08, ease: 'easeOut' }}
          style={{ ...heroHeadline, maxWidth: '680px', margin: '0 auto' }}
        >
          Search a name, a dish or an area
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.16, ease: 'easeOut' }}
          style={{ ...bodyText, maxWidth: '540px', margin: '16px auto 0' }}
        >
          Names, addresses, opening hours, contact details and photos come from OpenStreetMap. Filter on what the map knows about each place
          and what it costs, then open a card for the details.
        </motion.p>
      </header>

      <div style={{ marginTop: '34px' }}>
        <ProviderNotice live={live} />
      </div>

      <Searchbar />

      <p
        style={{
          marginTop: '34px',
          textAlign: 'center',
          ...bodyText,
          fontSize: '12.5px',
        }}
      >
        {live?.google
          ? 'Live Google ratings and reviews are switched on.'
          : `Open map data serves ${visibleSourceCount} search and Compare requests; bundled sample holds ${sampleCount} Bengaluru restaurants for the truly offline moments.`}
      </p>

      <Attribution osm google={live?.google === true} />
    </div>
  )
}

export default Discover