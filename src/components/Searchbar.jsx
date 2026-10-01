import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useSearchParams } from 'react-router-dom'
import { getLiveStatus, resolvePhoto, searchRestaurants } from '../lib/api'
import { FILTERS, SORTS, applyFilters, applySort } from '../lib/searchOptions'
import { FONT, INK, INK_40, INK_55, INK_70, INK_72, bodyText, card, frost, primaryButton, PILL_SHADOW, tinyLabel } from '../theme'
import Attribution from './Attribution'
import RatingBadge from './RatingBadge'

const SUGGESTIONS = ['biryani in Jayanagar', 'dosa in Basavanagudi', 'cafe in Indiranagar', 'Toit']

const chipBase = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  padding: '8px 14px',
  borderRadius: '999px',
  background: 'rgba(255,255,255,0.6)',
  border: '1px solid rgba(255,255,255,0.7)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  fontFamily: FONT,
  fontSize: '12.5px',
  fontWeight: 500,
  color: INK_72,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}

const methodHint = {
  display: 'flex',
  alignItems: 'center',
  gap: '7px',
  marginTop: '7px',
  fontFamily: FONT,
  fontSize: '12.5px',
  lineHeight: 1.5,
  color: INK_70,
  fontWeight: 500,
}

const Searchbar = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '')
  const [results, setResults] = useState([])
  const [source, setSource] = useState(null)
  const [notice, setNotice] = useState(null)
  const [state, setState] = useState('idle')
  const [problem, setProblem] = useState(null)
  const [activeFilters, setActiveFilters] = useState([])
  const [sortId, setSortId] = useState('relevance')
  const [live, setLive] = useState(null)
  const resultsHeadingRef = useRef(null)
  const ranFromUrl = useRef(false)

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

  const runSearch = useCallback(
    async (rawQuery) => {
      const clean = String(rawQuery ?? '').trim()
      setQuery(clean)
      setSearchParams(clean ? { q: clean } : {}, { replace: true })
      setActiveFilters([])

      if (!clean) {
        setResults([])
        setSource(null)
        setNotice(null)
        setState('idle')
        setProblem(null)
        return
      }

      setState('loading')
      setProblem(null)

      try {
        const outcome = await searchRestaurants(clean)
        setSource(outcome.source)
        setResults(outcome.results)
        setNotice(outcome.notice ?? null)
        setState('ready')
        window.requestAnimationFrame(() => resultsHeadingRef.current?.focus())
      } catch (error) {
        setResults([])
        setState('error')
        setProblem({ message: error.message, hint: error.hint })
      }
    },
    [setSearchParams],
  )

  useEffect(() => {
    const deepLinked = searchParams.get('q')
    if (deepLinked && !ranFromUrl.current) {
      ranFromUrl.current = true
      runSearch(deepLinked)
    }
  }, [searchParams, runSearch])

  const handleSubmit = (event) => {
    event.preventDefault()
    runSearch(query)
  }

  const toggleFilter = (filterId) => {
    setActiveFilters((current) =>
      current.includes(filterId) ? current.filter((item) => item !== filterId) : [...current, filterId],
    )
  }

  const visibleResults = useMemo(
    () => applySort(applyFilters(results, activeFilters), sortId),
    [results, activeFilters, sortId],
  )

  const hiddenByFilters = results.length - visibleResults.length
  const isLive = source === 'google'

  const statusMessage =
    state === 'loading'
      ? `Searching for ${query}`
      : state === 'error'
        ? `Search failed. ${problem?.message ?? ''}`
        : state === 'ready'
          ? `${visibleResults.length} restaurants found for ${query}`
          : ''

  const suggestionChips = (
    <div className="flex flex-wrap items-center justify-center gap-2.5" style={{ marginTop: '12px' }}>
      {SUGGESTIONS.map((suggestion) => (
        <motion.button
          key={suggestion}
          type="button"
          onClick={() => runSearch(suggestion)}
          whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.92)' }}
          whileTap={{ scale: 0.96 }}
          style={{ ...chipBase, color: INK, fontWeight: 600 }}
        >
          {suggestion}
        </motion.button>
      ))}
    </div>
  )

  return (
    <div style={{ position: 'relative', zIndex: 10 }}>
      <h2 id="search-heading" className="sr-only">
        Search restaurants
      </h2>
      <p id="restaurant-query-hint" className="sr-only">
        Search by restaurant name, cuisine, dish or neighbourhood. Results come from Google Places when a key is
        configured, otherwise from the bundled Bengaluru sample list.
      </p>

      <form
        role="search"
        aria-labelledby="search-heading"
        onSubmit={handleSubmit}
        className="mx-auto flex w-full max-w-3xl items-center gap-2"
        style={{
          marginTop: '30px',
          padding: '7px 7px 7px 18px',
          borderRadius: '999px',
          ...frost('rgba(255,255,255,0.7)', 'rgba(255,255,255,0.8)', 14),
          boxShadow: PILL_SHADOW,
        }}
      >
        <i className="ri-search-line" aria-hidden="true" style={{ fontSize: '16px', color: INK_55 }} />
        <label htmlFor="restaurant-query" className="sr-only">
          Search by restaurant name, cuisine, dish or area
        </label>
        <input
          id="restaurant-query"
          name="q"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Try biryani in Jayanagar, or a name like Toit"
          autoComplete="off"
          enterKeyHint="search"
          aria-describedby="restaurant-query-hint"
          style={{
            flex: 1,
            minWidth: 0,
            padding: '9px 0',
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontFamily: FONT,
            fontSize: '14.5px',
            color: INK,
          }}
        />
        <motion.button
          type="submit"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          style={{ ...primaryButton, borderRadius: '999px', padding: '11px 22px', whiteSpace: 'nowrap' }}
        >
          Search
        </motion.button>
      </form>

      <fieldset style={{ marginTop: '18px', padding: 0, border: 'none' }}>
        <legend className="sr-only">Refine results</legend>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {FILTERS.map((filter) => {
            const active = activeFilters.includes(filter.id)
            return (
              <span key={filter.id} style={{ display: 'inline-flex' }}>
                <input
                  id={`filter-${filter.id}`}
                  type="checkbox"
                  className="sr-only filter-checkbox"
                  checked={active}
                  onChange={() => toggleFilter(filter.id)}
                  aria-describedby="filter-hint"
                />
                <label
                  htmlFor={`filter-${filter.id}`}
                  style={{
                    ...chipBase,
                    background: active ? '#1a1a1a' : chipBase.background,
                    borderColor: active ? '#1a1a1a' : chipBase.border,
                    color: active ? '#fff' : INK_72,
                  }}
                >
                  <i className={filter.icon} aria-hidden="true" style={{ fontSize: '14px' }} />
                  {filter.label}
                </label>
              </span>
            )
          })}
        </div>
        <p id="filter-hint" className="sr-only">
          Filters are applied to the current results. Use the sort menu to change the order.
        </p>
      </fieldset>

      {live && !live.google && (
        <p style={{ ...methodHint, justifyContent: 'center', marginTop: '14px' }} role="note">
          <i className="ri-information-line" aria-hidden="true" />
          Live data is off, so results come from the bundled sample list. Add GOOGLE_PLACES_API_KEY to .env and
          restart the dev server to search real restaurants.
        </p>
      )}

      <p role="status" aria-live="polite" className="sr-only">
        {statusMessage}
      </p>

      {state === 'idle' && (
        <div style={{ marginTop: '26px', textAlign: 'center' }}>
          <p style={tinyLabel}>Try a search like</p>
          {suggestionChips}
        </div>
      )}

      {state === 'loading' && (
        <p role="status" style={{ ...methodHint, justifyContent: 'center', marginTop: '26px', fontSize: '13.5px' }}>
          <i className="ri-refresh-line" aria-hidden="true" style={{ animation: 'spin 1s linear infinite' }} />
          Searching live restaurant data...
        </p>
      )}

      {state === 'error' && (
        <div
          role="alert"
          style={{ ...card, maxWidth: '620px', margin: '30px auto 0', padding: '26px 24px', textAlign: 'center' }}
        >
          <i className="ri-error-warning-line" aria-hidden="true" style={{ fontSize: '22px', color: INK_55 }} />
          <p style={{ fontFamily: FONT, fontSize: '15px', fontWeight: 600, color: INK, marginTop: '12px' }}>
            That search could not be completed
          </p>
          <p style={{ ...bodyText, marginTop: '8px', fontSize: '13.5px' }}>{problem?.message}</p>
          {problem?.hint ? (
            <p style={{ ...bodyText, marginTop: '8px', fontSize: '12.5px', color: INK_55 }}>{problem.hint}</p>
          ) : null}
        </div>
      )}

      {state === 'ready' && (
        <div style={{ marginTop: '40px' }}>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: '12px',
              marginBottom: '18px',
            }}
          >
            <h3
              id="results-heading"
              ref={resultsHeadingRef}
              tabIndex={-1}
              style={{ fontFamily: FONT, fontSize: '17px', fontWeight: 600, color: INK, letterSpacing: '-0.01em' }}
            >
              {visibleResults.length} {visibleResults.length === 1 ? 'restaurant' : 'restaurants'} for &ldquo;
              {query}&rdquo;
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <label htmlFor="results-sort" style={{ fontFamily: FONT, fontSize: '12.5px', color: INK_70 }}>
                Sort by
              </label>
              <select
                id="results-sort"
                value={sortId}
                onChange={(event) => setSortId(event.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '999px',
                  border: '1px solid rgba(255,255,255,0.8)',
                  background: 'rgba(255,255,255,0.75)',
                  fontFamily: FONT,
                  fontSize: '12.5px',
                  color: INK,
                }}
              >
                {SORTS.map((sort) => (
                  <option key={sort.id} value={sort.id}>
                    {sort.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {hiddenByFilters > 0 && (
            <p style={{ ...methodHint, marginTop: 0 }}>
              <i className="ri-filter-3-line" aria-hidden="true" />
              {hiddenByFilters} result{hiddenByFilters === 1 ? '' : 's'} hidden by the active filters.
            </p>
          )}

          {visibleResults.length === 0 ? (
            <div style={{ ...card, maxWidth: '560px', margin: '10px auto 0', padding: '32px 28px', textAlign: 'center' }}>
              <p style={{ fontFamily: FONT, fontSize: '15px', fontWeight: 600, color: INK }}>
                {results.length === 0 ? 'No restaurants matched' : 'Nothing left after filtering'}
              </p>
              <p style={{ ...bodyText, marginTop: '8px', fontSize: '13.5px' }}>
                {results.length === 0
                  ? 'Google Places returned nothing for that search. Try a dish, a cuisine or add an area - or tap an example below.'
                  : 'Clear a filter, or try a different search.'}
              </p>
              {suggestionChips}
            </div>
          ) : (
            <>
              {notice ? (
                <p style={{ ...methodHint, marginTop: '0', marginBottom: '16px' }} role="note">
                  <i className="ri-information-line" aria-hidden="true" />
                  {notice}
                </p>
              ) : null}

              <ul role="list" aria-labelledby="results-heading" className="grid list-none gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {visibleResults.map((place, index) => {
                  const imageSrc = place.photos?.length ? resolvePhoto(place.photos[0]) : (place.image ?? null)
                  return (
                    <li key={place.id}>
                      <motion.article
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: Math.min(index * 0.05, 0.4), ease: 'easeOut' }}
                        whileHover={{ y: -6 }}
                        style={{ ...card, padding: '14px', height: '100%' }}
                      >
                        <Link
                          to={`/restaurant/${encodeURIComponent(place.id)}`}
                          style={{ display: 'block', height: '100%', textDecoration: 'none' }}
                        >
                          {imageSrc ? (
                            <img
                              src={imageSrc}
                              alt={`Food or interior at ${place.name}`}
                              loading="lazy"
                              style={{
                                display: 'block',
                                width: '100%',
                                height: '172px',
                                objectFit: 'cover',
                                borderRadius: '12px',
                                background: 'rgba(31,31,31,0.06)',
                              }}
                            />
                          ) : (
                            <div
                              aria-hidden="true"
                              style={{
                                height: '172px',
                                borderRadius: '12px',
                                background: 'rgba(31,31,31,0.06)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: INK_40,
                                fontSize: '20px',
                              }}
                            >
                              <i className="ri-image-line" />
                            </div>
                          )}

                          <h4
                            style={{
                              fontFamily: FONT,
                              fontSize: '16.5px',
                              fontWeight: 600,
                              letterSpacing: '-0.01em',
                              color: INK,
                              marginTop: '14px',
                            }}
                          >
                            {place.name}
                          </h4>

                          <RatingBadge rating={place.rating} reviewCount={place.reviewCount} />

                          {place.address ? (
                            <p style={{ ...methodHint, marginTop: '6px' }}>
                              <i className="ri-map-pin-2-line" aria-hidden="true" style={{ color: INK_55 }} />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {place.address}
                              </span>
                            </p>
                          ) : null}

                          {place.cuisines?.length ? (
                            <p style={{ ...methodHint, marginTop: '4px' }}>
                              <i className="ri-restaurant-2-line" aria-hidden="true" style={{ color: INK_55 }} />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {place.cuisines.join(' / ')}
                              </span>
                            </p>
                          ) : null}

                          <p style={{ ...methodHint, marginTop: '10px', gap: '8px' }}>
                            {place.openNow === true ? (
                              <span style={{ ...chipBase, cursor: 'default', padding: '3px 10px', color: INK }}>Open now</span>
                            ) : null}
                            {place.priceLabel ? (
                              <span style={{ ...chipBase, cursor: 'default', padding: '3px 10px' }}>{place.priceLabel}</span>
                            ) : null}
                            <span style={{ ...chipBase, cursor: 'default', padding: '3px 10px' }}>
                              {place.source === 'google' ? 'Live data' : place.source === 'sample' ? 'Sample data' : 'Map data'}
                            </span>
                          </p>

                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              marginTop: '12px',
                              fontFamily: FONT,
                              fontSize: '12.5px',
                              fontWeight: 600,
                              color: INK,
                            }}
                          >
                            <span aria-hidden="true">View details</span>
                            <i className="ri-arrow-right-line" aria-hidden="true" style={{ fontSize: '14px' }} />
                          </span>
                        </Link>
                      </motion.article>
                    </li>
                  )
                })}
              </ul>

              <Attribution google={isLive} osm={!isLive} />
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default Searchbar