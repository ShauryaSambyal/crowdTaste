import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useLocation, useParams } from 'react-router-dom'
import { getDishes, getLiveStatus, getRestaurant, getReviews, menuQueryFor, resolvePhoto } from '../lib/api'
import {
  FONT,
  GREEN,
  INK,
  INK_40,
  INK_55,
  INK_70,
  INK_72,
  PEACH,
  bodyText,
  card,
  eyebrowPill,
  heroHeadline,
  hexToRgba,
  primaryButton,
  secondaryButton,
  sectionHeadline,
} from '../theme'
import Attribution from '../components/Attribution'
import MenuSection from '../components/MenuSection'
import PhotoGallery from '../components/PhotoGallery'
import ProviderNotice from '../components/ProviderNotice'
import RatingBadge from '../components/RatingBadge'
import ReviewsList from '../components/ReviewsList'

const formatCount = (value) => new Intl.NumberFormat('en-IN').format(Number(value) || 0)

const iconChip = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  width: '36px',
  height: '36px',
  borderRadius: '11px',
  background: hexToRgba(PEACH, 0.6),
  border: '1px solid rgba(58,12,163,0.1)',
  color: INK,
  fontSize: '15px',
}

const cardTitle = { fontFamily: FONT, fontSize: '15px', fontWeight: 700, letterSpacing: '-0.02em', color: INK }

const factLabel = { fontFamily: FONT, fontSize: '12px', fontWeight: 600, color: INK_55 }
const factValue = { margin: '2px 0 0', fontFamily: FONT, fontSize: '13.5px', fontWeight: 500, color: INK }

const tagChip = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '7px',
  padding: '6px 13px',
  borderRadius: '999px',
  background: hexToRgba(PEACH, 0.5),
  border: '1px solid rgba(58,12,163,0.12)',
  fontFamily: FONT,
  fontSize: '12.5px',
  fontWeight: 600,
  color: INK_72,
}

const backLinkStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  padding: '8px 16px',
  borderRadius: '999px',
  background: 'rgba(255,253,247,0.72)',
  border: '1px solid rgba(58,12,163,0.16)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  fontFamily: FONT,
  fontSize: '12.5px',
  fontWeight: 600,
  color: INK_72,
  textDecoration: 'none',
}

const smallLink = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  marginTop: '12px',
  fontFamily: FONT,
  fontSize: '12.5px',
  fontWeight: 600,
  color: INK,
  textDecoration: 'none',
}

const shortHost = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

const RestaurantDetail = () => {
  const { id } = useParams()
  const location = useLocation()
  const statePlace = location.state?.restaurant ?? null

  const [place, setPlace] = useState(statePlace)
  const [source, setSource] = useState(statePlace?.source ?? null)
  const [state, setState] = useState(statePlace ? 'ready' : 'loading')
  const [problem, setProblem] = useState(null)
  const [live, setLive] = useState(null)
  const [menuItems, setMenuItems] = useState([])
  const [menuState, setMenuState] = useState('idle')
  const [menuProblem, setMenuProblem] = useState(null)
  // OpenStreetMap has no reviews, so written reviews arrive from the configured
  // reviews provider (none, and we say so plainly).
  const [providerReviews, setProviderReviews] = useState(null)
  const [reviewsState, setReviewsState] = useState('idle')
  const [reviewsNote, setReviewsNote] = useState('')

  useEffect(() => {
    let cancelled = false
    getLiveStatus()
      .then((status) => {
        if (!cancelled) setLive(status)
      })
      .catch(() => {
        if (!cancelled) setLive({ google: false, meals: true, mode: 'sample' })
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (statePlace && String(statePlace.id) === String(id)) {
      setPlace(statePlace)
      setSource(statePlace.source ?? 'google')
      setState('ready')
      return undefined
    }

    let cancelled = false
    setState('loading')
    setProblem(null)
    getRestaurant(id)
      .then((outcome) => {
        if (cancelled) return
        setPlace(outcome.place)
        setSource(outcome.source)
        setState('ready')
      })
      .catch((error) => {
        if (cancelled) return
        setPlace(null)
        setState('error')
        setProblem({ message: error.message, hint: error.hint })
      })

    return () => {
      cancelled = true
    }
  }, [id, statePlace])

  useEffect(() => {
    if (!place || state !== 'ready') return undefined
    if (source !== 'osm') return undefined
    if (place.reviews?.length) return undefined
    // Wait for the status check, then skip the request entirely when no reviews
    // provider is configured - no point asking for something we know is absent.
    if (!live) return undefined
    if (!live.reviews) {
      setReviewsState('unavailable')
      return undefined
    }

    let cancelled = false
    setReviewsState('loading')
    setReviewsNote('')
    getReviews({
      name: place.name,
      city: place.areaHint ?? '',
      lat: place.location?.lat ?? null,
      lng: place.location?.lng ?? null,
    })
      .then((payload) => {
        if (cancelled) return
        setProviderReviews(payload)
        setReviewsState(payload.reviews?.length ? 'ready' : 'empty')
      })
      .catch((error) => {
        if (cancelled) return
        setReviewsState(error.status === 501 ? 'unavailable' : 'error')
        setReviewsNote(error.hint || error.message)
      })

    return () => {
      cancelled = true
    }
  }, [place, state, source, live])

  useEffect(() => {
    if (!place || state !== 'ready') return undefined
    const query = menuQueryFor(place)
    let cancelled = false
    setMenuState('loading')
    setMenuProblem(null)
    getDishes(query, 8)
      .then((payload) => {
        if (cancelled) return
        setMenuItems(payload.items ?? [])
        setMenuState('ready')
      })
      .catch((error) => {
        if (cancelled) return
        setMenuState(error.status === 501 ? 'unavailable' : 'error')
        setMenuProblem({ message: error.message, hint: error.hint })
      })

    return () => {
      cancelled = true
    }
  }, [place, state])

  if (state === 'loading') {
    return (
      <div style={{ position: 'relative', zIndex: 10, maxWidth: '1100px', margin: '0 auto', padding: '150px 24px 80px' }}>
        <p role="status" style={{ ...bodyText, textAlign: 'center' }}>
          <i className="ri-refresh-line" aria-hidden="true" style={{ marginRight: '8px' }} />
          Loading restaurant details...
        </p>
      </div>
    )
  }

  if (state === 'error' || !place) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ position: 'relative', zIndex: 10, minHeight: '72svh', padding: '150px 24px 96px' }}
      >
        <div style={{ ...card, maxWidth: '470px', padding: '40px 32px', textAlign: 'center' }}>
          <i className="ri-search-eye-line" aria-hidden="true" style={{ fontSize: '26px', color: INK_55 }} />
          <h1 style={{ ...sectionHeadline, fontSize: '21px', marginTop: '16px' }}>We could not open that restaurant</h1>
          <p role="alert" style={{ ...bodyText, marginTop: '12px' }}>
            {problem?.message ?? 'Unknown error.'}
          </p>
          {problem?.hint ? (
            <p style={{ ...bodyText, marginTop: '8px', fontSize: '12.5px', color: INK_55 }}>{problem.hint}</p>
          ) : null}
          <Link to="/discover" style={{ ...primaryButton, marginTop: '22px' }}>
            Back to discover
          </Link>
        </div>
      </div>
    )
  }

  const isLive = source === 'google'
  // Photos arrive from Google (proxied) and from Wikimedia Commons (direct
  // URLs), so both sources feed the hero and the gallery.
  const hasPhotos = Boolean(place.photos?.length)
  const heroImage = hasPhotos ? resolvePhoto(place.photos[0], 1600) : (place.image ?? null)

  const galleryImages = hasPhotos
    ? (place.photos ?? [])
        .slice(1, 7)
        .map((photo, index) => ({ src: resolvePhoto(photo, 900), alt: `Photo ${index + 2} of ${place.name}`, credit: photo.credit, pageUrl: photo.pageUrl }))
    : (place.plates ?? []).map((src, index) => ({ src, alt: `Dish ${index + 1} at ${place.name}` }))

  const menuQuery = menuQueryFor(place)
  const menuReady = menuState === 'ready' && menuItems.length > 0

  // Prefer reviews that came with the place itself; fall back to the provider.
  const shownReviews = place.reviews?.length ? place.reviews : (providerReviews?.reviews ?? [])
  const shownReviewCount = place.reviewCount ?? providerReviews?.reviewCount ?? null
  const reviewNote = isLive
    ? ''
    : source === 'sample'
      ? 'This is a bundled sample entry, so only the short review snippets from data.json are shown.'
      : reviewsState === 'loading'
        ? `Looking up written reviews for ${place.name}...`
        : reviewsState === 'unavailable'
          ? 'OpenStreetMap carries no review data. Add a YELP_API_KEY to .env and restart the dev server to pull real written reviews for mapped venues.'
          : reviewsState === 'error'
            ? reviewsNote || 'The reviews provider could not be reached just now.'
            : `No written reviews were found for ${place.name} yet.`

  return (
    <div style={{ position: 'relative', zIndex: 10, maxWidth: '1100px', margin: '0 auto', padding: '124px 24px 88px' }}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: 'easeOut' }}>
        <Link to="/discover" style={backLinkStyle}>
          <i className="ri-arrow-left-line" aria-hidden="true" />
          Back to discover
        </Link>
      </motion.div>

      {heroImage ? (
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.08, ease: 'easeOut' }}
          style={{
            position: 'relative',
            marginTop: '18px',
            borderRadius: '24px',
            overflow: 'hidden',
            background: hexToRgba(PEACH, 0.3),
            boxShadow: '0 18px 44px rgba(58,12,163,0.2)',
          }}
        >
          <img
            src={heroImage}
            alt={`${place.name} - lead photo`}
            style={{ display: 'block', width: '100%', height: 'clamp(240px, 38vw, 420px)', objectFit: 'cover' }}
          />
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to top, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0) 58%)',
            }}
          />
          {place.primaryType || place.cuisines?.length ? (
            <span
              style={{
                ...eyebrowPill,
                position: 'absolute',
                bottom: '18px',
                left: '18px',
                background: 'rgba(255,253,247,0.94)',
                color: INK,
              }}
            >
              {place.primaryType ?? place.cuisines.join(' / ')}
            </span>
          ) : null}
        </motion.div>
      ) : null}

      <motion.header
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.16, ease: 'easeOut' }}
        style={{ marginTop: '26px' }}
      >
        <h1 style={{ ...heroHeadline, maxWidth: '880px' }}>{place.name}</h1>
        <RatingBadge
          rating={place.rating ?? providerReviews?.rating ?? null}
          reviewCount={place.reviewCount ?? providerReviews?.reviewCount ?? null}
        />
        {place.address ? (
          <p
            style={{
              ...bodyText,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginTop: '10px',
              fontSize: '13.5px',
            }}
          >
            <i className="ri-map-pin-2-line" aria-hidden="true" style={{ color: INK_55, fontSize: '15px' }} />
            {place.address}
          </p>
        ) : null}
        <p style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '16px' }}>
          <span style={tagChip}>
            {isLive ? 'Live Google data' : source === 'osm' ? 'Live OpenStreetMap data' : 'Sample data'}
          </span>
          {place.openNow === true ? (
            <span style={{ ...tagChip, background: hexToRgba(GREEN, 0.12), borderColor: hexToRgba(GREEN, 0.28), color: GREEN }}>
              Open now
            </span>
          ) : null}
          {place.priceLabel ? <span style={tagChip}>{place.priceLabel}</span> : null}
          {place.businessStatus === 'CLOSED_PERMANENTLY' ? (
            <span style={{ ...tagChip, color: '#9b1c1c' }}>Permanently closed</span>
          ) : null}
        </p>
      </motion.header>

      {!isLive ? (
        <div style={{ marginTop: '26px' }}>
          <ProviderNotice live={live} />
        </div>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2" style={{ marginTop: '26px' }}>
        <div style={{ ...card, padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={iconChip}>
              <i className="ri-information-line" aria-hidden="true" />
            </span>
            <h2 style={cardTitle}>Key facts</h2>
          </div>
          <dl style={{ margin: '16px 0 0', display: 'grid', gap: '12px' }}>
            <div>
              <dt style={factLabel}>Rating</dt>
              <dd style={factValue}>
                {typeof (place.rating ?? providerReviews?.rating) === 'number'
                  ? `${(place.rating ?? providerReviews.rating).toFixed(1)} / 5`
                  : 'Not listed'}
              </dd>
            </div>
            <div>
              <dt style={factLabel}>Reviews</dt>
              <dd style={factValue}>
                {typeof (place.reviewCount ?? providerReviews?.reviewCount) === 'number'
                  ? formatCount(place.reviewCount ?? providerReviews.reviewCount)
                  : 'Not listed'}
              </dd>
            </div>
            <div>
              <dt style={factLabel}>Price level</dt>
              <dd style={factValue}>{place.priceLabel || 'Not listed'}</dd>
            </div>
            <div>
              <dt style={factLabel}>Open now</dt>
              <dd style={factValue}>
                {place.openNow === null ? 'Not listed' : place.openNow ? 'Yes' : 'No'}
              </dd>
            </div>
            {place.phone ? (
              <div>
                <dt style={factLabel}>Phone</dt>
                <dd style={factValue}>
                  <a href={`tel:${place.phone}`} style={{ color: INK, textDecoration: 'none' }}>
                    {place.phone}
                  </a>
                </dd>
              </div>
            ) : null}
            {place.website ? (
              <div>
                <dt style={factLabel}>Website</dt>
                <dd style={factValue}>
                  <a href={place.website} target="_blank" rel="noreferrer" style={{ color: INK, textDecoration: 'none' }}>
                    {shortHost(place.website)}
                  </a>
                </dd>
              </div>
            ) : null}
          </dl>
        </div>

        <div style={{ ...card, padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={iconChip}>
              <i className="ri-map-pin-2-line" aria-hidden="true" />
            </span>
            <h2 style={cardTitle}>Where</h2>
          </div>
          <p style={{ ...bodyText, marginTop: '16px', fontSize: '13.5px' }}>
            {place.address || 'Address not listed.'}
          </p>            {place.googleMapsUri ? (
            <a href={place.googleMapsUri} target="_blank" rel="noreferrer" style={smallLink}>
              <span aria-hidden="true">{isLive ? 'Open in Google Maps' : 'View on OpenStreetMap'}</span>
              <i className="ri-external-link-line" aria-hidden="true" style={{ fontSize: '13px' }} />
            </a>
          ) : null}
          {place.hours?.length ? (
            <>
              <h3 style={{ ...cardTitle, marginTop: '20px', fontSize: '13.5px' }}>Opening hours</h3>
              <ul role="list" className="list-none" style={{ marginTop: '10px', display: 'grid', gap: '4px' }}>
                {place.hours.map((line) => (
                  <li key={line} style={{ ...bodyText, fontSize: '12.5px' }}>
                    {line}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      </div>

      {place.tags?.length ? (
        <div style={{ ...card, marginTop: '20px', padding: '24px' }}>
          <h2 style={cardTitle}>Known for</h2>
          <ul role="list" className="flex list-none flex-wrap gap-2" style={{ marginTop: '14px' }}>
            {place.tags.map((tag) => (
              <li key={tag} style={tagChip}>
                <i className="ri-checkbox-blank-circle-fill" aria-hidden="true" style={{ fontSize: '5px', color: INK_40 }} />
                {tag}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <ReviewsList
        reviews={shownReviews}
        placeName={place.name}
        reviewCount={shownReviewCount}
        note={reviewNote}
      />

      <MenuSection items={menuItems} state={menuState} query={menuQuery} problem={menuProblem} />

      <PhotoGallery
        images={galleryImages}
        title={hasPhotos ? 'More photos' : 'On the plate'}
        hint={
          hasPhotos
            ? ''
            : source === 'osm'
              ? 'No Wikimedia Commons photo has been geotagged here yet.'
              : ''
        }
      />

      <div
        className="flex flex-wrap items-center justify-between gap-4"
        style={{ ...card, marginTop: '52px', padding: '30px 28px' }}
      >
        <div>
          <h2 style={{ ...sectionHeadline, fontSize: '19px' }}>Still deciding?</h2>
          <p style={{ ...bodyText, marginTop: '8px', fontSize: '13.5px' }}>
            Put {place.name} head to head with another place, or ask which restaurant wins in an area.
          </p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          <Link to={`/compare?mode=pair&left=${encodeURIComponent(place.name)}`} style={primaryButton}>
            Compare this place
          </Link>
          <Link to="/discover" style={secondaryButton}>
            Search again
          </Link>
        </div>
      </div>

      <Attribution
        google={isLive}
        osm={source === 'osm'}
        sample={source === 'sample'}
        meals={menuReady}
        yelp={Boolean(providerReviews?.reviews?.length)}
      />
    </div>
  )
}

export default RestaurantDetail