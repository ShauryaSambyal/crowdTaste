// Client helpers for the local live-data API (/api/live/*), served by the Vite
// middleware in /server. API keys - including any optional Google one - stay on
// the server; the browser only ever talks to /api/live/*. The default source is
// keyless OpenStreetMap (+ TheMealDB dish photos). If the map service is down or
// unreachable, search falls back to the bundled sample list.

import {
  findSampleEntry,
  sampleCount,
  searchSampleRestaurants,
  toSampleDetail,
} from './sampleData.js'

export class ApiError extends Error {
  constructor(message, { status = 0, hint = '' } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.hint = hint
  }
}

const request = async (path, params = {}) => {
  const url = new URL(path, window.location.origin)
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value)
  })

  let response
  try {
    response = await fetch(url, { headers: { Accept: 'application/json' } })
  } catch {
    throw new ApiError('Could not reach the local data service.', {
      hint: 'Make sure the dev server is running (npm run dev).',
    })
  }

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new ApiError(payload?.error?.message || `Request failed with status ${response.status}.`, {
      status: response.status,
      hint: payload?.error?.hint || '',
    })
  }
  return payload
}

export const getLiveStatus = () => request('/api/live/status')

// Sample place ids look like "sample-12"; legacy links used the bare number.
// OpenStreetMap ids look like "osm:node/1234567" and always go live.
export const isSampleId = (id) => /^\d+$/.test(String(id ?? '')) || /^sample-\d+$/.test(String(id ?? ''))

// Realtime: what is actually around the diner right now. Nominatim/Overpass
// answer on the server, keyless, so this works with zero configuration.
export const nearbyRestaurants = async ({ lat, lng, radius = 1200, cuisine = '', limit = 30 } = {}) => {
  const payload = await request('/api/live/nearby', { lat, lng, radius, cuisine, limit })
  return { source: payload.source ?? 'osm', results: payload.results ?? [] }
}

// Written reviews for a mapped venue. OpenStreetMap has none, so this needs a
// configured reviews provider; the thrown ApiError carries a readable hint when
// there is not one.
export const getReviews = async ({ name, city = '', address = '', lat = null, lng = null, limit = 3 } = {}) =>
  request('/api/live/reviews', { name, city, address, lat, lng, limit })

export const searchRestaurants = async (query) => {
  try {
    const payload = await request('/api/live/search', { q: query, limit: 20 })
    const results = payload.results ?? []

    // OpenStreetMap only knows a venue when someone has mapped and tagged it, so
    // dish-and-area searches like "biryani in Jayanagar" can legitimately come
    // back empty. Rather than dead-end on the app's own suggested searches, fall
    // back to the bundled list and label it as such.
    if (results.length === 0 && (payload.source ?? 'osm') === 'osm') {
      const bundled = searchSampleRestaurants(query)
      if (bundled.length > 0) {
        return {
          source: 'sample',
          results: bundled,
          notice: `Nothing on the map is tagged for "${query}" yet, so this ran against the bundled list of ${sampleCount} Bengaluru restaurants instead.`,
        }
      }
    }

    return { source: payload.source ?? 'osm', results, notice: payload.notice ?? null }
  } catch (error) {
    // A bad query should surface (it is the user typing); anything else means
    // the map service is down, throttled, offline or misconfigured.
    if (error.status === 400) throw error
    const detail = error.hint ? ` ${error.hint}` : ''
    return {
      source: 'sample',
      results: searchSampleRestaurants(query),
      notice: `The map service is unavailable right now (${error.message}).${detail} This search ran against the bundled sample list of ${sampleCount} Bengaluru restaurants instead.`,
    }
  }
}

export const getRestaurant = async (id, statePlace = null) => {
  if (statePlace && String(statePlace.id) === String(id)) {
    return { source: statePlace.source ?? 'osm', place: statePlace }
  }

  if (isSampleId(id)) {
    const entry = findSampleEntry(id)
    if (!entry) {
      throw new ApiError('That sample restaurant could not be found.', {
        status: 404,
        hint: 'Open Discover and pick a restaurant from the list.',
      })
    }
    return { source: 'sample', place: toSampleDetail(entry) }
  }

  const payload = await request(`/api/live/place/${encodeURIComponent(id)}`)
  return { source: payload.source ?? 'osm', place: payload.place }
}

// Dish photos typical of a cuisine (TheMealDB) - authentic photos, no prices.
export const getDishes = async (query, number = 8) => request('/api/live/dishes', { q: query, number })

export const compareRestaurantPair = async ({ left, right, city }) =>
  request('/api/live/compare', { left, right, city })

export const compareBestInArea = async ({ location, cuisine }) =>
  request('/api/live/compare/area', { location, cuisine })

export const photoUrl = (photoName, width = 800) =>
  `/api/live/photo?name=${encodeURIComponent(photoName)}&w=${width}`

// OpenStreetMap venue photos are direct Wikimedia Commons URLs; Google photos
// are proxied so the key stays on the server.
export const resolvePhoto = (photo, width = 800) => {
  if (!photo?.name) return null
  if (photo.external) return photo.name
  return photoUrl(photo.name, width)
}

// Picks the best dish lookup term for a restaurant.
export const menuQueryFor = (place) =>
  place?.cuisines?.[0] ?? place?.tags?.[0] ?? place?.primaryType ?? 'indian restaurant'