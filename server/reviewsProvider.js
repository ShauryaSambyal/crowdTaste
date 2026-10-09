// Written reviews for venues that come from OpenStreetMap.
//
// OpenStreetMap carries no review data at all, so review text needs a provider
// with a key. Yelp Fusion is wired here: its Business Match endpoint resolves a
// name + coordinates to a Yelp business, and its Reviews endpoint returns up to
// three review excerpts with author, rating and date.
//
// Pricing reality (checked 2026): Yelp ended its free tier in 2024 and
// Foursquare's tips/ratings/photos sit behind paid "Premium" endpoints, so there
// is no free-of-charge reviews source to fall back on. The UI stays honest about
// that rather than inventing review text.
//
// Docs: https://docs.developer.yelp.com/reference/v3_business_match
//       https://docs.developer.yelp.com/reference/v3_business_reviews

const YELP_BASE = 'https://api.yelp.com/v3'

export class ReviewsError extends Error {
  constructor(message, { status = 502, hint = '', upstreamStatus = null } = {}) {
    super(message)
    this.name = 'ReviewsError'
    this.status = status
    this.hint = hint
    this.upstreamStatus = upstreamStatus
  }
}

export const hasYelpKey = (key) => typeof key === 'string' && key.trim().length > 0

const KEY_HINT =
  'Set YELP_API_KEY in .env and restart the dev server to pull real written reviews for mapped venues.'

// Relative time from Yelp's "YYYY-MM-DD HH:MM:SS" without pulling in a date lib.
export const relativeTimeFrom = (value, now = Date.now()) => {
  if (!value) return ''
  const then = new Date(String(value).replace(' ', 'T')).getTime()
  if (!Number.isFinite(then)) return ''
  const seconds = Math.max(0, Math.round((now - then) / 1000))
  const units = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ]
  for (const [label, size] of units) {
    const count = Math.floor(seconds / size)
    if (count >= 1) return `${count} ${label}${count === 1 ? '' : 's'} ago`
  }
  return 'just now'
}

export const normalizeYelpReview = (review = {}) => ({
  id: review.id ?? `${review.user?.id ?? 'yelp'}-${review.time_created ?? ''}`,
  author: review.user?.name ?? 'Yelp user',
  authorPhoto: review.user?.image_url ?? null,
  authorUri: review.user?.profile_url ?? null,
  rating: typeof review.rating === 'number' ? review.rating : null,
  text: String(review.text ?? '').trim(),
  relativeTime: relativeTimeFrom(review.time_created),
  publishedAt: review.time_created ?? null,
  url: review.url ?? null,
})

export const createReviewsProvider = ({ apiKey, timeoutMs = 12000 } = {}) => {
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

  const writeCache = (key, value, ttlMs = 30 * 60 * 1000) => {
    cache.set(key, { value, expiresAt: Date.now() + ttlMs })
    return value
  }

  const requireKey = () => {
    if (!hasYelpKey(apiKey)) {
      throw new ReviewsError('No reviews provider is configured.', {
        status: 501,
        hint: KEY_HINT,
      })
    }
  }

  const call = async (path, params = {}) => {
    requireKey()
    const url = new URL(`${YELP_BASE}${path}`)
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value)
    })

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
        signal: controller.signal,
      })
      if (!response.ok) {
        const hint =
          response.status === 401 || response.status === 403
            ? 'Yelp rejected the key. Check YELP_API_KEY and that the app has the Places plan attached.'
            : response.status === 429
              ? 'Yelp rate limit or quota reached for this key.'
              : 'Yelp could not complete that request.'
        throw new ReviewsError(`Yelp answered ${response.status}.`, {
          status: response.status === 429 ? 429 : 502,
          upstreamStatus: response.status,
          hint,
        })
      }
      return await response.json()
    } catch (error) {
      if (error?.name === 'AbortError') {
        throw new ReviewsError('The reviews provider timed out.', { status: 504, hint: 'Try again in a moment.' })
      }
      throw error
    } finally {
      clearTimeout(timer)
    }
  }

  // Resolve a mapped venue to a Yelp business id.
  const matchBusiness = async ({ name, address = '', city = '', lat = null, lng = null }) => {
    const cleanName = String(name ?? '').trim()
    if (!cleanName) return null

    const cacheKey = `match:${cleanName.toLowerCase()}:${String(city).toLowerCase()}`
    const cached = readCache(cacheKey)
    if (cached !== null) return cached

    try {
      const matched = await call('/businesses/matches', {
        name: cleanName,
        address1: address,
        city,
        latitude: lat,
        longitude: lng,
        limit: 1,
      })
      const business = matched?.businesses?.[0]
      if (business?.id) return writeCache(cacheKey, business)
    } catch (error) {
      // A miss on exact matching is normal; fall through to text search.
      if (error?.status !== 502) throw error
    }

    const found = await call('/businesses/search', {
      term: cleanName,
      location: city || undefined,
      latitude: city ? undefined : lat,
      longitude: city ? undefined : lng,
      categories: 'restaurants,food',
      limit: 3,
    })
    const best = found?.businesses?.[0] ?? null
    return writeCache(cacheKey, best)
  }

  const reviewsFor = async (businessId, { limit = 3 } = {}) => {
    const cacheKey = `reviews:${businessId}:${limit}`
    const cached = readCache(cacheKey)
    if (cached) return cached
    const payload = await call(`/businesses/${encodeURIComponent(businessId)}/reviews`, {
      limit,
      sort_by: 'yelp_sort',
    })
    return writeCache(cacheKey, {
      total: payload.total ?? null,
      reviews: (payload.reviews ?? []).map(normalizeYelpReview).filter((review) => review.text.length > 0),
    })
  }

  // Full lookup for one venue: match it, then fetch its reviews.
  const lookup = async (query, { limit = 3 } = {}) => {
    const business = await matchBusiness(query)
    if (!business) {
      return { source: 'yelp', matched: false, rating: null, reviewCount: null, reviews: [], business: null }
    }
    const { reviews, total } = await reviewsFor(business.id, { limit })
    return {
      source: 'yelp',
      matched: true,
      rating: typeof business.rating === 'number' ? business.rating : null,
      reviewCount: typeof business.review_count === 'number' ? business.review_count : total,
      url: business.url ?? null,
      business: {
        id: business.id,
        name: business.name ?? null,
        price: business.price ?? null,
        categories: (business.categories ?? []).map((category) => category.title).filter(Boolean),
      },
      reviews,
    }
  }

  return { configured: hasYelpKey(apiKey), matchBusiness, reviewsFor, lookup }
}
