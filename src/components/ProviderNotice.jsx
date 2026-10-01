import { useState } from 'react'
import { FONT, INK, INK_70, card } from '../theme'

// Only the optional Google Places key can be missing now; everything else runs
// keyless on OpenStreetMap. The notice tells the user exactly what they gain.
const ProviderNotice = ({ live }) => {
  const [dismissed, setDismissed] = useState(false)
  const googleReady = live?.google === true

  if (dismissed || googleReady) return null

  return (
    <aside
      role="note"
      style={{
        ...card,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'flex-start',
        gap: '14px',
        marginBottom: '28px',
        padding: '16px 18px',
        textAlign: 'left',
      }}
    >
      <i className="ri-star-line" aria-hidden="true" style={{ fontSize: '18px', color: INK }} />
      <div style={{ flex: 1, minWidth: '240px' }}>
        <p style={{ fontFamily: FONT, fontSize: '13.5px', fontWeight: 600, color: INK }}>
          Ratings and reviews are switched off
        </p>
        <ul
          style={{
            margin: '8px 0 0',
            paddingLeft: '18px',
            fontFamily: FONT,
            fontSize: '12.5px',
            lineHeight: 1.7,
            color: INK_70,
          }}
        >
          <li>
            Search, addresses, opening hours, contact details and Compare already work keylessly on OpenStreetMap
            data below.
          </li>
          <li>
            Optional: paste a Google Places key into .env as GOOGLE_PLACES_API_KEY to add ratings, review counts,
            written reviews and extra photos. A Maps Demo Key needs no card: sign in at
            developers.google.com/maps/demo-key, click Get a Demo Key, and paste it in.
          </li>
        </ul>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '7px 14px',
          borderRadius: '999px',
          border: '1px solid rgba(31,31,31,0.12)',
          background: 'rgba(255,255,255,0.7)',
          fontFamily: FONT,
          fontSize: '12px',
          fontWeight: 500,
          color: INK,
          cursor: 'pointer',
        }}
      >
        <span aria-hidden="true">Dismiss</span>
        <span className="sr-only">Dismiss the ratings notice</span>
      </button>
    </aside>
  )
}

export default ProviderNotice