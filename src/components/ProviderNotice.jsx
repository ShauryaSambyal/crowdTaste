import { useState } from 'react'
import { FONT, INK, INK_55, INK_70, YELLOW, card, frost } from '../theme'

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
      <span
        aria-hidden="true"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          width: '34px',
          height: '34px',
          borderRadius: '11px',
          background: YELLOW,
          color: INK,
          fontSize: '17px',
        }}
      >
        <i className="ri-star-line" />
      </span>
      <div style={{ flex: 1, minWidth: '240px' }}>
        <p style={{ fontFamily: FONT, fontSize: '13.5px', fontWeight: 700, color: INK }}>
          Ratings and reviews are switched off
        </p>
        <ul
          style={{
            margin: '8px 0 0',
            paddingLeft: '18px',
            fontFamily: FONT,
            fontSize: '12.5px',
            fontWeight: 500,
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
          fontFamily: FONT,
          fontSize: '12px',
          fontWeight: 600,
          color: INK,
          cursor: 'pointer',
          ...frost('rgba(255,253,247,0.8)', 'rgba(58,12,163,0.16)', 8),
        }}
      >
        <span aria-hidden="true">Dismiss</span>
        <span className="sr-only">Dismiss the ratings notice</span>
      </button>
    </aside>
  )
}

export default ProviderNotice