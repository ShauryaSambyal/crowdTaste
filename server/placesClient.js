// Google Places API (New) client.
// Runs on the server (Vite middleware / preview server) so the API key never
// reaches the browser. Docs: https://developers.google.com/maps/documentation/places/web-service/op-overview

const PLACES_BASE = 'https://places.googleapis.com/v1'
const MEDIA_BASE = 'https://places.googleapis.com/v1'

// Field masks are grouped by risk. If Google rejects a richer mask we retry
// with the safe mask so the UI still receives useful data instead of failing.
const SEARCH_FIELDS = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.shortFormattedAddress',
  'places.location',
  'places.rating',
  'places.userRatingCount',
  'places.priceLevel',
  'places.types',
  'places.primaryTypeDisplayName',
  'places.photos',
  'places.googleMapsUri',
  'places.businessStatus',
  'places.currentOpeningHours.openNow',
].join(',')

const SEARCH_FIELDS_SAFE = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.rating',
  'places.userRatingCount',
  'places.priceLevel',
  'places.types',
  'places.photos',
  'places.googleMapsUri',
].join(',')

const DETAIL_FIELDS = [
  'id',
  'displayName',
  'formattedAddress',
  'location',
  'rating',
  'userRatingCount',
  'priceLevel',
  'types',
  'primaryTypeDisplayName',
  'photos',
  'reviews',
  'regularOpeningHours',
  'websiteUri',
  'nationalPhoneNumber',
  'googleMapsUri',
  'businessStatus',
].join(',')

const DETAIL_FIELDS_SAFE = [
  'id',
  'displayName',
  'formattedAddress',
  'location',
  'rating',
  'userRatingCount',
  'priceLevel',
  'types',
  'primaryTypeDisplayName',
  'photos',
  'googleMapsUri',
  'businessStatus',
].join(',')

const PRICE_LEVELS = {
  PRICE_LEVEL_FREE: 0,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
}

const PRICE_LEVEL_LABELS = {
  0: 'Free',
  1: 'Inexpensive',
  2: 'Moderate',
  3: 'Expensive',
  4: 'Very expensive',
}

// Types that carry no useful "cuisine" meaning for diners.
const GENERIC_TYPES = new Set([
  'restaurant',
  'food',
  'point_of_interest',
  'establishment',
  'store',
  'service',
  'meal_takeaway',
  'meal_delivery',
  'meal_dine_in',
  'food_store',
  'bar',
])

export class LiveDataError extends Error {
  constructor(message, { status = 502, hint = '', upstreamStatus = null } = {}) {
    super(message)
    this.name = 'LiveDataError'
    this.status = status
    this.hint = hint
    this.upstreamStatus = upstreamStatus
    this.fieldMaskProblem = false
  }
}

export const hasGoogleKey = (key) => typeof key === 'string' && key.trim().length > 0

export const priceLevelNumber = (value) =>
  value && Object.prototype.hasOwnProperty.call(PRICE_LEVELS, value) ? PRICE_LEVELS[value] : null

export const priceLevelLabel = (level) =>
  typeof level === 'number' && PRICE_LEVEL_LABELS[level] ? PRICE_LEVEL_LABELS[level] : null

const titleCase = (value) =>
  value
    .split(' ')
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ')

// "south_indian_restaurant" -> "South Indian"
export const cuisineLabels = (types = []) => {
  const labels = types
    .map((type) => type.replace(/_/g, ' ').replace(/\brestaurants?\b/g, '').trim())
    .filter((label) => label && !GENERIC_TYPES.has(label.replace(/ /g, '_')))
    .map(titleCase)

  return [...new Set(labels)].slice(0, 4)
}

const toNumberOrNull = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : null)

// Shape shared by every restaurant card in the UI, whether it came from Google
// or from the bundled sample file.
export const normalizePlace = (place = {}) => ({
  id: place.id ?? null,
  source: 'google',
  name: place.displayName?.text ?? 'Unnamed place',
  address: place.formattedAddress ?? place.shortFormattedAddress ?? '',
  location: place.location ? { lat: place.location.latitude, lng: place.location.longitude } : null,
  rating: toNumberOrNull(place.rating),
  reviewCount: toNumberOrNull(place.userRatingCount),
  priceLevel: priceLevelNumber(place.priceLevel),
  priceLabel: priceLevelLabel(priceLevelNumber(place.priceLevel)),
  cuisines: cuisineLabels(place.types ?? []),
  primaryType: place.primaryTypeDisplayName?.text ?? null,
  openNow:
    typeof place.currentOpeningHours?.openNow === 'boolean'
      ? place.currentOpeningHours.openNow
      : typeof place.regularOpeningHours?.openNow === 'boolean'
        ? place.regularOpeningHours.openNow
        : null,
  photos: (place.photos ?? []).map((photo) => ({
    name: photo.name,
    width: photo.widthPx ?? null,
    height: photo.heightPx ?? null,
  })),
  googleMapsUri: place.googleMapsUri ?? null,
  businessStatus: place.businessStatus ?? null,
})

export const normalizePlaceDetails = (place = {}) => ({
  ...normalizePlace(place),
  phone: place.nationalPhoneNumber ?? null,
  website: place.websiteUri ?? null,
  hours: place.regularOpeningHours?.weekdayDescriptions ?? [],
  reviews: (place.reviews ?? [])
    .map((review, index) => ({
      id: review.name ?? `${place.id ?? 'place'}-review-${index}`,
      author: review.authorAttribution?.displayName ?? 'Google user',
      authorPhoto: review.authorAttribution?.photoUri ?? null,
      authorUri: review.authorAttribution?.uri ?? null,
      rating: toNumberOrNull(review.rating),
      text: review.text?.text ?? review.originalText?.text ?? '',
      relativeTime: review.relativePublishTimeDescription ?? '',
      publishedAt: review.publishTime ?? null,
    }))
    .filter((review) => review.text.length > 0),
})

const KEY_HINT =
  'Google rejected the key. Make sure "Places API (New)" is enabled on the project, that billing is active, and that the key is not restricted to a different API.'

const hintForStatus = (status, message = '') => {
  // Google reports an invalid/unauthorised key as HTTP 400, so the message
  // matters more than the status code here.
  if (/api key|api_key|key not valid|not authorized|permission denied|billing/i.test(message)) {
    return KEY_HINT
  }
  if (status === 401 || status === 403) {
    return KEY_HINT
  }
  if (status === 429) {
    return 'Google rate limit or quota reached for this key. Wait a moment, or raise the quota in Google Cloud.'
  }
  if (status === 400) {
    return 'Google could not understand the request. Try a simpler search.'
  }
  return 'Check your internet connection and that the key in .env is correct.'
}

export const createPlacesClient = ({ apiKey, timeoutMs = 12000, cacheTtlMs = 300000 } = {}) => {
  const cache = new Map()

  const readCache = (key) => {
    const entry = cache.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
      cache.delete(key)
      return null
    }
    return entry.value
  }

  const writeCache = (key, value, ttlMs = cacheTtlMs) => {
    cache.set(key, { value, expiresAt: Date.now() + ttlMs })
    return value
  }

  const requireKey = () => {
    if (!hasGoogleKey(apiKey)) {
      throw new LiveDataError('Google Places API key is missing.', {
        status: 501,
        hint: 'Add GOOGLE_PLACES_API_KEY to the .env file in the project root and restart the dev server (see README.md -> "Get the API keys").',
      })
    }
  }

  const call = async (path, { method = 'GET', fieldMask, body } = {}) => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await fetch(`${PLACES_BASE}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          ...(fieldMask ? { 'X-Goog-FieldMask': fieldMask } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        const message = payload?.error?.message || `Places API request failed with status ${response.status}.`
        const error = new LiveDataError(message, {
          status: 502,
          upstreamStatus: response.status,
          hint: hintForStatus(response.status, message),
        })
        if (response.status === 400 && /field/i.test(message)) {
          error.fieldMaskProblem = true
        }
        throw error
      }

      return await response.json()
    } catch (error) {
      if (error?.name === 'AbortError') {
        throw new LiveDataError('The live restaurant provider timed out.', {
          status: 504,
          hint: 'Try again in a moment.',
        })
      }
      throw error
    } finally {
      clearTimeout(timer)
    }
  }

  const search = async ({ query, limit = 20, includedType = 'restaurant', languageCode = 'en' }) => {
    requireKey()
    const cleanQuery = String(query ?? '').trim()
    if (cleanQuery.length < 2) {
      throw new LiveDataError('Please enter at least two characters to search.', { status: 400 })
    }

    const maxResultCount = Math.min(Math.max(Number(limit) || 20, 1), 20)
    const cacheKey = `search:${includedType}:${maxResultCount}:${cleanQuery.toLowerCase()}`
    const cached = readCache(cacheKey)
    if (cached) return cached

    const body = {
      textQuery: cleanQuery,
      maxResultCount,
      includedType,
      languageCode,
      strictTypeFiltering: false,
    }

    let payload
    try {
      payload = await call('/places:searchText', { method: 'POST', fieldMask: SEARCH_FIELDS, body })
    } catch (error) {
      if (!(error instanceof LiveDataError) || !error.fieldMaskProblem) throw error
      payload = await call('/places:searchText', { method: 'POST', fieldMask: SEARCH_FIELDS_SAFE, body })
    }

    return writeCache(cacheKey, (payload.places ?? []).map(normalizePlace), 5 * 60 * 1000)
  }

  const getDetails = async (placeId) => {
    requireKey()
    const id = String(placeId ?? '').trim()
    if (!id) throw new LiveDataError('A place id is required.', { status: 400 })

    const cacheKey = `place:${id}`
    const cached = readCache(cacheKey)
    if (cached) return cached

    const path = `/places/${encodeURIComponent(id)}`
    let payload
    try {
      payload = await call(path, { fieldMask: DETAIL_FIELDS })
    } catch (error) {
      if (!(error instanceof LiveDataError) || !error.fieldMaskProblem) throw error
      payload = await call(path, { fieldMask: DETAIL_FIELDS_SAFE })
    }

    return writeCache(cacheKey, normalizePlaceDetails(payload), 15 * 60 * 1000)
  }

  const getPhoto = async (photoName, maxWidthPx = 1200) => {
    requireKey()
    if (!/^places\/[^/]+\/photos\/[^/]+$/.test(String(photoName ?? ''))) {
      throw new LiveDataError('Invalid photo reference.', { status: 400 })
    }

    const width = Math.min(Math.max(Number(maxWidthPx) || 1200, 200), 4800)
    const url = `${MEDIA_BASE}/${photoName}/media?maxWidthPx=${width}&key=${encodeURIComponent(apiKey)}`
    const response = await fetch(url, { redirect: 'follow' })

    if (!response.ok) {
      throw new LiveDataError('Photo could not be loaded from Google.', {
        status: 502,
        upstreamStatus: response.status,
        hint: hintForStatus(response.status),
      })
    }

    return {
      contentType: response.headers.get('content-type') || 'image/jpeg',
      buffer: Buffer.from(await response.arrayBuffer()),
    }
  }

  return { search, getDetails, getPhoto }
}
