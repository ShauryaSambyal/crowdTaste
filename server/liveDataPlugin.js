// Local API layer for CrowdTaste.
//
// It runs inside the Vite dev server and the Vite preview server, so the API
// keys from .env never reach the browser bundle. The browser only talks to
// /api/live/*. The default data source is keyless OpenStreetMap plus TheMealDB
// for dish photos, so the app works with zero configuration. An optional
// Google Places key switches search and Compare to rating-based data.

import { LiveDataError, createPlacesClient, hasGoogleKey } from './placesClient.js'
import { createOsmProvider, OsmError } from './osmProvider.js'
import { createMealsProvider } from './mealsProvider.js'
import { createReviewsProvider, hasYelpKey } from './reviewsProvider.js'
import { compareArea, comparePair } from './compare.js'
import { keylessAreaCompare, keylessPairCompare } from './keylessRank.js'

const sendJson = (res, status, payload) => {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(payload))
}

const sendError = (res, error, context = '') => {
  const status = Number.isFinite(Number(error?.status)) ? Number(error.status) : 500
  if (status >= 500 || status === 429) {
    console.error(`[live-data]${context ? ` ${context}:` : ''}`, error?.message ?? error)
  }
  sendJson(res, status, {
    error: {
      message: error?.message || 'Unexpected server error.',
      hint: error?.hint || '',
      upstreamStatus: error?.upstreamStatus ?? null,
    },
  })
}

const paramsOf = (req) => new URL(req.url, 'http://localhost').searchParams

// Picks the restaurant the user most likely meant out of a result page.
const pickBestMatch = (results = [], name = '') => {
  const needle = String(name).trim().toLowerCase()
  if (!needle) return results[0] ?? null
  return (
    results.find((place) => place.name.toLowerCase() === needle) ??
    results.find((place) => place.name.toLowerCase().includes(needle)) ??
    results.find((place) => needle.includes(place.name.toLowerCase())) ??
    results[0] ??
    null
  )
}

export default function liveDataPlugin(env = {}) {
  const googleKey = env.GOOGLE_PLACES_API_KEY ?? ''
  const timeoutMs = Number(env.LIVE_REQUEST_TIMEOUT_MS) || 12000
  const nominatimEmail = env.NOMINATIM_CONTACT_EMAIL ?? ''

  const places = createPlacesClient({ apiKey: googleKey, timeoutMs })
  const osm = createOsmProvider({ timeoutMs, nominatimEmail })
  const meals = createMealsProvider({ timeoutMs })
  const reviews = createReviewsProvider({ apiKey: env.YELP_API_KEY ?? '', timeoutMs })

  // Which source can actually answer for written reviews. Google-sourced venues
  // carry their own reviews; Yelp fills them in for mapped (OSM) venues.
  const reviewsSource = hasYelpKey(env.YELP_API_KEY) ? 'yelp' : null

  const status = {
    osm: true,
    google: hasGoogleKey(googleKey),
    meals: true,
    reviews: reviewsSource,
    nearby: true,
  }

  const missingPair = (left, right, label) => {
    const missing = !left ? label : !right ? label : null
    if (missing) {
      throw new LiveDataError(`We could not find "${missing}" on the map.`, {
        status: 404,
        hint: 'Check the spelling, or add the area or city, for example "Toit Indiranagar".',
      })
    }
    return { left, right }
  }

  const pairComparisonGoogle = async (left, right, city) => {
    const leftQuery = city ? `${left} ${city}` : left
    const rightQuery = city ? `${right} ${city}` : right

    const [leftResults, rightResults] = await Promise.all([
      places.search({ query: leftQuery, limit: 5 }),
      places.search({ query: rightQuery, limit: 5 }),
    ])
    const leftMatch = pickBestMatch(leftResults, left)
    const rightMatch = pickBestMatch(rightResults, right)
    const absent = !leftMatch ? left : !rightMatch ? right : null
    if (absent) {
      throw new LiveDataError(`We could not find "${absent}" on Google Maps.`, {
        status: 404,
        hint: 'Check the spelling, or add the area or city, for example "Toit Indiranagar".',
      })
    }

    const [leftDetails, rightDetails] = await Promise.all([
      places.getDetails(leftMatch.id),
      places.getDetails(rightMatch.id),
    ])

    // Demo/limited keys return no ratings: fall back to keyless scoring rather
    // than pretending incomplete data is a quality signal.
    if (typeof leftDetails.rating !== 'number' && typeof rightDetails.rating !== 'number') {
      return keylessPairCompare(leftDetails, rightDetails, {})
    }
    return comparePair(leftDetails, rightDetails)
  }

  const pairComparisonOsm = async (left, right, city) => {
    const [leftSearch, rightSearch] = await Promise.all([
      osm.searchPlaces({ query: city ? `${left} ${city}` : left, limit: 5 }),
      osm.searchPlaces({ query: city ? `${right} ${city}` : right, limit: 5 }),
    ])
    const leftMatch = pickBestMatch(leftSearch.results, left)
    const rightMatch = pickBestMatch(rightSearch.results, right)
    const { left: leftPlace, right: rightPlace } = missingPair(leftMatch, rightMatch, !leftMatch ? left : right)

    const parseRef = (place) => place.id.replace('osm:', '').split('/')
    const [leftKind, leftId] = parseRef(leftPlace)
    const [rightKind, rightId] = parseRef(rightPlace)
    const [leftDetails, rightDetails] = await Promise.all([
      osm.getPlace(leftKind, leftId, leftPlace.searchHint || {}),
      osm.getPlace(rightKind, rightId, rightPlace.searchHint || {}),
    ])
    return keylessPairCompare(leftDetails, rightDetails, {})
  }

  const areaComparisonGoogle = async (location, cuisine) => {
    const query = `${cuisine ? `${cuisine} ` : ''}best rated restaurants in ${location}`
    const results = await places.search({ query, limit: 20 })
    const rated = results.filter((place) => typeof place.rating === 'number')
    if (rated.length > 0) return compareArea(rated, { location, cuisine })
    if (results.length > 0) return keylessAreaCompare(results, { location, cuisine })
    throw new OsmError(`No rated restaurants were found for ${location}.`, {
      status: 404,
      hint: 'Try a different area or a broader cuisine.',
    })
  }

  const areaComparisonOsm = async (location, cuisine) => {
    const area = await osm.geocodeArea(location)
    const elements = await osm.restaurantsInArea({ area, cuisine, limit: 60 })
    if (elements.length === 0) {
      throw new OsmError(`No restaurants were found in ${area.label} on OpenStreetMap.`, {
        status: 404,
        hint: 'Try a bigger city or a broader cuisine.',
      })
    }
    const shortlist = elements.slice(0, 15)
    const ranked = await osm.withPhotos(shortlist, { max: 6 })
    return keylessAreaCompare(ranked, { location: area.label, cuisine })
  }

  const handleRequest = async (req, res, pathname) => {
    const params = paramsOf(req)

    if (pathname === '/' || pathname === '/status') {
      return sendJson(res, 200, {
        ...status,
        mode: status.google ? 'live' : 'open',
        providers: {
          openStreetMap: 'https://wiki.openstreetmap.org/wiki/Overpass_API',
          nominatim: 'https://nominatim.org/release-docs/develop/api/Overview/',
          theMealDB: 'https://www.themealdb.com/api.php',
          googlePlaces: 'https://developers.google.com/maps/documentation/places/web-service/op-overview',
          yelp: 'https://docs.developer.yelp.com/docs/places-intro',
        },
        endpoints: ['/search', '/nearby', '/place/:id', '/photo', '/dishes', '/reviews', '/compare', '/compare/area'],
      })
    }

    if (pathname === '/nearby') {
      const lat = Number(params.get('lat'))
      const lng = Number(params.get('lng'))
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        throw new OsmError('A latitude and longitude are required for a nearby search.', { status: 400 })
      }
      const results = await osm.restaurantsNear({
        lat,
        lng,
        radius: params.get('radius') ?? 1200,
        cuisine: params.get('cuisine') ?? '',
        limit: params.get('limit') ?? 30,
      })
      return sendJson(res, 200, { source: 'osm', results })
    }

    if (pathname === '/reviews') {
      const name = (params.get('name') ?? '').trim()
      if (name.length < 2) {
        throw new LiveDataError('A venue name is required to look up reviews.', { status: 400 })
      }
      if (reviewsSource !== 'yelp') {
        throw new LiveDataError('No reviews provider is configured.', {
          status: 501,
          hint: 'OpenStreetMap has no review data. Add YELP_API_KEY to .env and restart the dev server to pull real written reviews for mapped venues.',
        })
      }
      const outcome = await reviews.lookup(
        {
          name,
          city: (params.get('city') ?? '').trim(),
          address: (params.get('address') ?? '').trim(),
          lat: params.get('lat') ? Number(params.get('lat')) : null,
          lng: params.get('lng') ? Number(params.get('lng')) : null,
        },
        { limit: params.get('limit') ?? 3 },
      )
      return sendJson(res, 200, outcome)
    }

    if (pathname === '/search') {
      const query = String(params.get('q') ?? '')
      const limit = params.get('limit') ?? 20
      if (status.google) {
        const results = await places.search({ query, limit })
        return sendJson(res, 200, { source: 'google', query, results })
      }
      const outcome = await osm.searchPlaces({ query, limit })
      return sendJson(res, 200, { source: 'osm', query, results: outcome.results, notice: outcome.notice })
    }

    if (pathname.startsWith('/place/')) {
      const placeId = decodeURIComponent(pathname.slice('/place/'.length))
      if (placeId.startsWith('osm:')) {
        const [kind, numeric] = placeId.replace('osm:', '').split('/')
        const place = await osm.getPlace(kind, numeric)
        return sendJson(res, 200, { source: 'osm', place })
      }
      const place = await places.getDetails(placeId)
      return sendJson(res, 200, { source: 'google', place })
    }

    if (pathname === '/photo') {
      const photo = await places.getPhoto(params.get('name'), params.get('w'))
      res.statusCode = 200
      res.setHeader('Content-Type', photo.contentType)
      res.setHeader('Cache-Control', 'public, max-age=86400, immutable')
      return res.end(photo.buffer)
    }

    if (pathname === '/dishes') {
      const outcome = await meals.searchDishes({
        query: params.get('q') ?? '',
        limit: params.get('number') ?? 8,
      })
      return sendJson(res, 200, { source: 'mealdb', query: outcome.query, items: outcome.items })
    }

    if (pathname === '/compare') {
      const left = (params.get('left') ?? '').trim()
      const right = (params.get('right') ?? '').trim()
      if (!left || !right) {
        throw new LiveDataError('Two restaurant names are required to compare.', { status: 400 })
      }
      const city = (params.get('city') ?? '').trim()
      const result = status.google
        ? await pairComparisonGoogle(left, right, city)
        : await pairComparisonOsm(left, right, city)
      return sendJson(res, 200, result)
    }

    if (pathname === '/compare/area') {
      const location = (params.get('location') ?? '').trim()
      if (location.length < 2) {
        throw new LiveDataError('Enter an area or city to rank its restaurants.', { status: 400 })
      }
      const cuisine = (params.get('cuisine') ?? '').trim()
      const result = status.google
        ? await areaComparisonGoogle(location, cuisine)
        : await areaComparisonOsm(location, cuisine)
      return sendJson(res, 200, result)
    }

    return sendJson(res, 404, {
      error: { message: `Unknown live data endpoint: ${pathname}`, hint: '' },
    })
  }

  const middleware = (req, res, next) => {
    // req.url is already relative to the mounted /api/live prefix.
    const pathname = new URL(req.url, 'http://localhost').pathname.replace(/\/+$/, '') || '/'
    if (req.method !== 'GET') {
      return sendJson(res, 405, { error: { message: 'Only GET is supported.', hint: '' } })
    }
    handleRequest(req, res, pathname).catch((error) => sendError(res, error, pathname))
    // The response is always ended by the handlers above, so next() is only
    // needed when the request was never claimed by this middleware.
    return undefined
  }

  return {
    name: 'crowdtaste-live-data',
    configureServer(server) {
      server.middlewares.use('/api/live', middleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/live', middleware)
    },
  }
}