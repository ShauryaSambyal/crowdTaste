import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useSearchParams } from 'react-router-dom'
import { compareBestInArea, compareRestaurantPair, getLiveStatus } from '../lib/api'
import { FONT, INK, INK_55, INK_70, PILL_SHADOW, PEACH, bodyText, card, eyebrowPill, frost, heroHeadline, hexToRgba, primaryButton } from '../theme'
import CompareAreaResult from '../components/CompareAreaResult'
import ComparePairResult from '../components/ComparePairResult'
import ProviderNotice from '../components/ProviderNotice'

const MODES = [
  { id: 'pair', label: 'Two restaurants' },
  { id: 'area', label: 'Best in an area' },
]

const inputStyle = {
  width: '100%',
  padding: '11px 14px',
  borderRadius: '12px',
  border: '1px solid rgba(58,12,163,0.16)',
  background: 'rgba(255,253,247,0.9)',
  fontFamily: FONT,
  fontSize: '14px',
  fontWeight: 500,
  color: INK,
}

const labelStyle = { display: 'block', fontFamily: FONT, fontSize: '12.5px', fontWeight: 600, color: INK_70, marginBottom: '6px' }

const modeChip = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '9px 16px',
  borderRadius: '999px',
  border: '1px solid rgba(58,12,163,0.14)',
  background: 'rgba(255,253,247,0.7)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  fontFamily: FONT,
  fontSize: '13px',
  fontWeight: 600,
  color: INK_70,
  cursor: 'pointer',
}

const Compare = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const mode = searchParams.get('mode') === 'area' ? 'area' : 'pair'

  const [left, setLeft] = useState(() => searchParams.get('left') ?? '')
  const [right, setRight] = useState(() => searchParams.get('right') ?? '')
  const [city, setCity] = useState(() => searchParams.get('city') ?? '')
  const [locationValue, setLocationValue] = useState(() => searchParams.get('location') ?? '')
  const [cuisine, setCuisine] = useState(() => searchParams.get('cuisine') ?? '')

  const [state, setState] = useState('idle')
  const [result, setResult] = useState(null)
  const [problem, setProblem] = useState(null)
  const [live, setLive] = useState(null)
  const ranFromUrl = useRef(false)

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

  const runComparison = useCallback(async (nextMode, values) => {
    setState('loading')
    setProblem(null)
    setResult(null)
    try {
      const outcome =
        nextMode === 'pair'
          ? await compareRestaurantPair({ left: values.left, right: values.right, city: values.city })
          : await compareBestInArea({ location: values.location, cuisine: values.cuisine })
      setResult(outcome)
      setState('ready')
    } catch (error) {
      setState('error')
      setProblem({ message: error.message, hint: error.hint })
    }
  }, [])

  useEffect(() => {
    if (ranFromUrl.current) return
    const urlLeft = searchParams.get('left') ?? ''
    const urlRight = searchParams.get('right') ?? ''
    const urlLocation = searchParams.get('location') ?? ''
    const canPair = mode === 'pair' && urlLeft && urlRight
    const canArea = mode === 'area' && urlLocation.length > 1
    if (!canPair && !canArea) return
    ranFromUrl.current = true
    runComparison(mode, {
      left: urlLeft,
      right: urlRight,
      city: searchParams.get('city') ?? '',
      location: urlLocation,
      cuisine: searchParams.get('cuisine') ?? '',
    })
  }, [mode, searchParams, runComparison])

  const switchMode = (nextMode) => {
    setSearchParams(nextMode === 'area' ? { mode: 'area' } : { mode: 'pair' })
    setState('idle')
    setResult(null)
    setProblem(null)
  }

  const submitPair = (event) => {
    event.preventDefault()
    const params = { mode: 'pair', left, right }
    if (city.trim()) params.city = city.trim()
    setSearchParams(params)
    runComparison('pair', { left, right, city })
  }

  const submitArea = (event) => {
    event.preventDefault()
    const params = { mode: 'area', location: locationValue }
    if (cuisine.trim()) params.cuisine = cuisine.trim()
    setSearchParams(params)
    runComparison('area', { location: locationValue, cuisine })
  }

  const statusMessage =
    state === 'loading'
      ? 'Working out which restaurant comes out on top.'
      : state === 'error'
        ? `Comparison failed. ${problem?.message ?? ''}`
        : state === 'ready' && result
          ? result.mode === 'pair'
            ? result.verdict
            : result.verdict
          : ''

  return (
    <div style={{ position: 'relative', zIndex: 10, maxWidth: '1100px', margin: '0 auto', padding: '132px 24px 88px' }}>
      <header style={{ textAlign: 'center' }}>
        <motion.span
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{ ...eyebrowPill, marginBottom: '20px' }}
        >
          Compare
        </motion.span>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.08, ease: 'easeOut' }}
          style={{ ...heroHeadline, maxWidth: '720px', margin: '0 auto' }}
        >
          Which restaurant is actually better?
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.16, ease: 'easeOut' }}
          style={{ ...bodyText, maxWidth: '560px', margin: '16px auto 0' }}
        >
          Compare two places head to head, or name an area and CrowdTaste ranks its restaurants by rating, review volume
          and price.
        </motion.p>
      </header>

      <div style={{ marginTop: '34px' }}>
        <ProviderNotice live={live} />
      </div>

      <fieldset style={{ margin: 0, padding: 0, border: 'none' }}>
        <legend className="sr-only">Choose a comparison mode</legend>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {MODES.map((item) => {
            const active = mode === item.id
            return (
              <span key={item.id} style={{ display: 'inline-flex' }}>
                <input
                  id={`compare-mode-${item.id}`}
                  type="radio"
                  name="compare-mode"
                  className="sr-only"
                  checked={active}
                  onChange={() => switchMode(item.id)}
                />
                <label
                  htmlFor={`compare-mode-${item.id}`}
                  style={{
                    ...modeChip,
                    background: active ? hexToRgba(PEACH, 0.9) : modeChip.background,
                    borderColor: active ? 'rgba(58,12,163,0.35)' : modeChip.border,
                    color: active ? INK : INK_70,
                  }}
                >
                  {item.label}
                </label>
              </span>
            )
          })}
        </div>
      </fieldset>

      {mode === 'pair' ? (
        <form
          onSubmit={submitPair}
          className="mx-auto grid w-full max-w-3xl gap-4 sm:grid-cols-2"
          style={{
            marginTop: '26px',
            padding: '22px',
            borderRadius: '20px',
            ...frost('rgba(255,253,247,0.8)', 'rgba(255,214,165,0.9)', 14),
            boxShadow: PILL_SHADOW,
          }}
        >
          <div>
            <label htmlFor="compare-left" style={labelStyle}>
              Restaurant A
            </label>
            <input
              id="compare-left"
              name="left"
              type="text"
              value={left}
              onChange={(event) => setLeft(event.target.value)}
              placeholder="e.g. Toit"
              autoComplete="off"
              required
              style={inputStyle}
            />
          </div>
          <div>
            <label htmlFor="compare-right" style={labelStyle}>
              Restaurant B
            </label>
            <input
              id="compare-right"
              name="right"
              type="text"
              value={right}
              onChange={(event) => setRight(event.target.value)}
              placeholder="e.g. Meghana Foods"
              autoComplete="off"
              required
              style={inputStyle}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="compare-city" style={labelStyle}>
              City or area (optional - helps disambiguate similar names)
            </label>
            <input
              id="compare-city"
              name="city"
              type="text"
              value={city}
              onChange={(event) => setCity(event.target.value)}
              placeholder="e.g. Bengaluru"
              autoComplete="off"
              style={inputStyle}
            />
          </div>
          <div className="sm:col-span-2">
            <motion.button
              type="submit"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              style={{ ...primaryButton, width: '100%' }}
            >
              Compare these two
            </motion.button>
          </div>
        </form>
      ) : (
        <form
          onSubmit={submitArea}
          className="mx-auto grid w-full max-w-3xl gap-4 sm:grid-cols-2"
          style={{
            marginTop: '26px',
            padding: '22px',
            borderRadius: '20px',
            ...frost('rgba(255,253,247,0.8)', 'rgba(255,214,165,0.9)', 14),
            boxShadow: PILL_SHADOW,
          }}
        >
          <div>
            <label htmlFor="compare-location" style={labelStyle}>
              Area, neighbourhood or city
            </label>
            <input
              id="compare-location"
              name="location"
              type="text"
              value={locationValue}
              onChange={(event) => setLocationValue(event.target.value)}
              placeholder="e.g. Indiranagar, Bengaluru"
              autoComplete="off"
              required
              style={inputStyle}
            />
          </div>
          <div>
            <label htmlFor="compare-cuisine" style={labelStyle}>
              Cuisine or dish (optional)
            </label>
            <input
              id="compare-cuisine"
              name="cuisine"
              type="text"
              value={cuisine}
              onChange={(event) => setCuisine(event.target.value)}
              placeholder="e.g. biryani"
              autoComplete="off"
              style={inputStyle}
            />
          </div>
          <div className="sm:col-span-2">
            <motion.button
              type="submit"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              style={{ ...primaryButton, width: '100%' }}
            >
              Rank this area
            </motion.button>
          </div>
        </form>
      )}

      <p role="status" aria-live="polite" className="sr-only">
        {statusMessage}
      </p>

      {state === 'loading' ? (
        <p style={{ ...bodyText, marginTop: '26px', textAlign: 'center', fontSize: '13.5px' }}>
          <i className="ri-refresh-line" aria-hidden="true" style={{ marginRight: '8px' }} />
          Pulling live ratings, reviews and prices...
        </p>
      ) : null}

      {state === 'error' ? (
        <div
          role="alert"
          style={{ ...card, maxWidth: '620px', margin: '30px auto 0', padding: '26px 24px', textAlign: 'center' }}
        >
          <i className="ri-error-warning-line" aria-hidden="true" style={{ fontSize: '22px', color: INK_55 }} />
          <p style={{ fontFamily: FONT, fontSize: '15px', fontWeight: 700, color: INK, marginTop: '12px' }}>
            That comparison could not be completed
          </p>
          <p style={{ ...bodyText, marginTop: '8px', fontSize: '13.5px' }}>{problem?.message}</p>
          {problem?.hint ? (
            <p style={{ ...bodyText, marginTop: '8px', fontSize: '12.5px', color: INK_55 }}>{problem.hint}</p>
          ) : null}
        </div>
      ) : null}

      {state === 'ready' && result ? (
        result.mode === 'pair' ? <ComparePairResult result={result} /> : <CompareAreaResult result={result} />
      ) : null}
    </div>
  )
}

export default Compare