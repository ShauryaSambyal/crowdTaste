// Keyless OpenStreetMap provider: venue search and details via Nominatim and
// the Overpass API, photos via Wikimedia Commons. No key, no signup, no card.
//
// Usage policies respected here: Nominatim is throttled to one request per
// second with an identifying User-Agent; Overpass queries are small, bounded
// and cached. Docs: https://nominatim.org/release-docs/develop/api/Overview/
// and https://wiki.openstreetmap.org/wiki/Overpass_API

const UA = 'CrowdTaste/1.0 (restaurant discovery demo; local development use)'
const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org'
const OVERPASS_BASE = 'https://overpass-api.de/api/interpreter'

export class OsmError extends Error {
  constructor(message, { status = 502, hint = '', upstreamStatus = null } = {}) {
    super(message)
    this.name = 'OsmError'
    this.status = status
    this.hint = hint
    this.upstreamStatus = upstreamStatus
  }
}

const VENUE_TYPES = new Set(['restaurant', 'fast_food', 'cafe', 'pub', 'bar', 'ice_cream', 'food_court'])

const CUISINE_WORDS = {
  pizza: 'Pizza',
  burger: 'Burgers',
  indian: 'Indian',
  dosa: 'Dosa',
  idli: 'Idli',
  biryani: 'Biryani',
  chinese: 'Chinese',
  thai: 'Thai',
  italian: 'Italian',
  mexican: 'Mexican',
  japanese: 'Japanese',
  sushi: 'Sushi',
  korean: 'Korean',
  vietnamese: 'Vietnamese',
  cafe: 'Cafe',
  coffee: 'Coffee',
  bakery: 'Bakery',
  ice_cream: 'Ice cream',
  dessert: 'Desserts',
  seafood: 'Seafood',
  barbecue: 'Barbecue',
  kebab: 'Kebabs',
  continental: 'Continental',
  north_indian: 'North Indian',
  south_indian: 'South Indian',
  andhra: 'Andhra',
  chettinad: 'Chettinad',
  mangalorean: 'Mangalorean',
  goan: 'Goan',
  kerala: 'Kerala',
  punjabi: 'Punjabi',
  gujarati: 'Gujarati',
  bengali: 'Bengali',
  chaat: 'Chaat',
  juice: 'Juices',
  tea: 'Tea',
  bubble_tea: 'Bubble tea',
}

const PRICE_WORDS = {
  cheap: 'Budget friendly',
  moderate: 'Moderate',
  expensive: 'Pricey',
  very_expensive: 'Very pricey',
}

const titleCase = (value) =>
  String(value ?? '')
    .replace(/_/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ')

const cuisineLabel = (raw) => {
  const key = raw.trim().toLowerCase()
  return CUISINE_WORDS[key] ?? titleCase(key)
}

// "dosa in jayanagar" -> { text: 'dosa', city: 'jayanagar' }
export const splitLocationQuery = (query) => {
  const parts = String(query ?? '').split(/\s+in\s+/i)
  if (parts.length > 1) {
    const city = parts.pop().trim()
    return { text: parts.join(' in ').trim(), city }
  }
  return { text: String(query ?? '').trim(), city: '' }
}

const areaHintOf = (result) => {
  const address = result.address ?? {}
  return address.city ?? address.town ?? address.village ?? address.suburb ?? address.state ?? ''
}

const websiteOf = (tags) => tags.website ?? tags['contact:website'] ?? null

export const createOsmProvider = ({ timeoutMs = 12000, nominatimEmail = '' } = {}) => {
  const cache = new Map()
  let lastNominatimAt = 0

  const readCache = (key) => {
    const entry = cache.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
      cache.delete(key)
      return null
    }
    return entry.value
  }

  const writeCache = (key, value, ttlMs = 5 * 60 * 1000) => {
    cache.set(key, { value, expiresAt: Date.now() + ttlMs })
    return value
  }

  const nominatimGate = async () => {
    const waitMs = 1100 - (Date.now() - lastNominatimAt)
    if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs))
    lastNominatimAt = Date.now()
  }

  const fetchJson = async (url, { gateNominatim = false, overpass = false, method = 'GET', body = null } = {}) => {
    if (gateNominatim) await nominatimGate()
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), overpass ? Math.max(timeoutMs, 28000) : timeoutMs)
    try {
      const response = await fetch(url, {
        method,
        headers: {
          'User-Agent': UA,
          Accept: 'application/json',
          ...(method === 'POST' ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
        },
        body,
        signal: controller.signal,
      })
      if (!response.ok) {
        throw new OsmError(`The map service answered ${response.status}.`, {
          status: response.status === 429 ? 429 : 502,
          upstreamStatus: response.status,
          hint:
            response.status === 429
              ? 'OpenStreetMap is rate limiting us. Wait a few seconds and try again.'
              : 'Check your internet connection and try again.',
        })
      }
      return await response.json()
    } catch (error) {
      if (error?.name === 'AbortError') {
        throw new OsmError('The map service timed out.', { status: 504, hint: 'Try again in a moment.' })
      }
      throw error
    } finally {
      clearTimeout(timer)
    }
  }

  const nominatimSearch = async (query, { limit = 8 } = {}) => {
    const params = new URLSearchParams({
      q: query,
      format: 'jsonv2',
      addressdetails: '1',
      extratags: '1',
      limit: String(limit),
    })
    if (nominatimEmail) params.set('email', nominatimEmail)
    return fetchJson(`${NOMINATIM_BASE}/search?${params.toString()}`, { gateNominatim: true })
  }

  const isVenue = (result) =>
    result.category === 'amenity' && VENUE_TYPES.has(result.type)

  const normalizeVenue = (result, { addressFallback = '' } = {}) => {
    const tags = result.extratags ?? result.tags ?? {}
    const cuisines = String(tags.cuisine ?? '')
      .split(/[;,]/)
      .map((part) => part.trim())
      .filter(Boolean)
      .map(cuisineLabel)
    const priceWord = String(tags.price_range ?? '').toLowerCase()
    return {
      id: `osm:${result.osm_type}/${result.osm_id}`,
      source: 'osm',
      name: result.name ?? tags.name ?? 'Unnamed place',
      address: result.display_name ?? addressFallback,
      location:
        result.lat !== undefined && result.lon !== undefined
          ? { lat: Number(result.lat), lng: Number(result.lon) }
          : null,
      rating: null,
      reviewCount: null,
      priceLevel: null,
      priceLabel: PRICE_WORDS[priceWord] ?? null,
      cuisines: [...new Set(cuisines)].slice(0, 4),
      primaryType: result.type ? titleCase(result.type) : null,
      openNow: null,
      photos: [],
      image: null,
      googleMapsUri: `https://www.openstreetmap.org/${result.osm_type}/${result.osm_id}`,
      businessStatus: null,
      areaHint: result.areaHint ?? areaHintOf(result),
      menuUrl: tags['website:menu'] ?? tags['contact:menu'] ?? tags['menu:menu'] ?? tags.menu ?? null,
      hours: tags.opening_hours ? [tags.opening_hours] : [],
      contacts: {
        phone: tags.phone ?? tags['contact:phone'] ?? null,
        website: websiteOf(tags),
        email: tags.email ?? tags['contact:email'] ?? null,
      },
      tags: featureTags(tags),
      osmRef: { kind: result.osm_type, id: Number(result.osm_id) },
    }
  }

  const featureTags = (tags) => {
    const out = []
    const push = (condition, label) => {
      if (condition && !out.includes(label)) out.push(label)
    }
    push(tags['diet:vegetarian'] === 'yes', 'Vegetarian options')
    push(tags['diet:vegan'] === 'yes', 'Vegan options')
    push(tags.outdoor_seating === 'yes', 'Outdoor seating')
    push(tags.microbrewery === 'yes', 'Microbrewery')
    push(tags.takeaway === 'yes' || tags.takeaway === 'only', 'Takeaway')
    push(tags.delivery === 'yes', 'Delivery')
    push(tags.wheelchair === 'yes', 'Wheelchair access')
    push(tags['payment:upi'] === 'yes', 'UPI accepted')
    push(tags['smoking'] === 'isolated' || tags['smoking'] === 'separated', 'Smoking area')
    push(tags['pets'] === 'yes' || tags['dog'] === 'yes', 'Pet friendly')
    push(tags['internet_access'] === 'wlan', 'Free Wi-Fi')
    push(tags['air_conditioning'] === 'yes', 'Air conditioned')
    return out.slice(0, 10)
  }

  const overpass = async (ql, { timeoutLabel = 'map query', retries = 1 } = {}) => {
    let attempt = 0
    for (;;) {
      try {
        const payload = await fetchJson(OVERPASS_BASE, {
          method: 'POST',
          overpass: true,
          body: `data=${encodeURIComponent(ql)}`,
        })
        return payload.elements ?? []
      } catch (error) {
        const transient =
          error instanceof OsmError &&
          (error.status === 504 || (error.upstreamStatus ?? 0) >= 500)
        if (attempt < retries && transient) {
          attempt += 1
          await new Promise((resolve) => setTimeout(resolve, 1500 * attempt))
          continue
        }
        if (transient) {
          throw new OsmError(`The ${timeoutLabel} timed out on the public map server.`, {
            status: 504,
            hint: 'Narrow the search with a more specific name, or try again in a moment.',
          })
        }
        throw error
      }
    }
  }

  const withPhotos = async (places, { max = 6 } = {}) => {
    const out = [...places]
    for (let index = 0; index < Math.min(max, out.length); index += 1) {
      const place = out[index]
      if (place.photos?.length) continue
      try {
        const found = await commonsPhoto(`${place.name} ${place.areaHint || ''}`.trim())
        if (found) out[index] = { ...place, photos: [found] }
      } catch {
        // A missing photo must never fail the whole search.
      }
    }
    return out
  }

  const commonsPhoto = async (query, { width = 800 } = {}) => {
    const params = new URLSearchParams({
      action: 'query',
      format: 'json',
      generator: 'search',
      gsrsearch: query,
      gsrnamespace: '6',
      gsrlimit: '1',
      prop: 'imageinfo',
      iiprop: 'url|size|extmetadata',
      iiurlwidth: String(width),
    })
    const payload = await fetchJson(`https://commons.wikimedia.org/w/api.php?${params.toString()}`)
    const pages = Object.values(payload.query?.pages ?? {})
    const page = pages.find((entry) => !entry.missing)
    const info = page?.imageinfo?.[0]
    if (!info) return null
    return {
      name: info.thumburl ?? info.url,
      external: true,
      width: info.thumbwidth ?? info.width ?? null,
      height: info.thumbheight ?? info.height ?? null,
      credit: `Photo: ${page.title.replace(/^File:/, '').replace(/_/g, ' ')} (Wikimedia Commons)`,
      author: info.extmetadata?.Artist?.value?.replace(/<[^>]+>/g, '') ?? null,
      license:
        info.extmetadata?.LicenseShortName?.value ??
        info.extmetadata?.License?.value?.replace(/<[^>]+>/g, '') ??
        null,
      pageUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title)}`,
    }
  }

  const searchPlaces = async ({ query, limit = 20, city = '', photos = true } = {}) => {
    const { text, city: queryCity } = splitLocationQuery(query)
    if (text.length < 2) {
      throw new OsmError('Please enter at least two characters to search.', { status: 400 })
    }
    const hint = city || queryCity
    const attempts = hint ? [`${text} ${hint}`, `${text} restaurant ${hint}`] : [text, `${text} restaurant`]
    const maxResults = Math.min(Math.max(Number(limit) || 20, 1), 20)
    const cacheKey = `osm-search:${maxResults}:${attempts[0].toLowerCase()}`
    const cached = readCache(cacheKey)
    if (cached) return cached

    let raw = []
    for (const attempt of attempts) {
      raw = await nominatimSearch(attempt, { limit: maxResults })
      const venues = raw.filter(isVenue)
      if (venues.length > 0) {
        raw = venues
        break
      }
    }
    const venues = raw.filter(isVenue)
    let results = venues.map((result) => ({
      ...normalizeVenue(result),
      searchHint:
        result.lat !== undefined && result.lon !== undefined
          ? { lat: Number(result.lat), lng: Number(result.lon) }
          : null,
    }))
    if (photos && results.length > 0) {
      results = await withPhotos(results, { max: 6 })
    }
    const notice =
      raw.length > 0 && venues.length === 0
        ? `OpenStreetMap found places matching "${text}", but none are tagged as restaurants there. Try a venue name, a cuisine word, or a bigger city.`
        : null
    return writeCache(cacheKey, { results, notice })
  }

  const getPlace = async (kind, id, { lat: hintLat = null, lng: hintLng = null } = {}) => {
    const numeric = Number(id)
    if (!['node', 'way', 'relation'].includes(kind) || !Number.isFinite(numeric)) {
      throw new OsmError('That restaurant link is not a valid map reference.', { status: 400 })
    }
    const cacheKey = `osm-place:${kind}/${numeric}`
    const cached = readCache(cacheKey)
    if (cached) return cached

    const selector =
      kind === 'node' ? `node(${numeric})` : kind === 'way' ? `way(${numeric})` : `relation(${numeric})`
    const center = kind === 'node' ? '' : 'center'
    const latLon = (element) =>
      element.lat !== undefined && element.lon !== undefined
        ? { lat: Number(element.lat), lng: Number(element.lon) }
        : element.center
          ? { lat: Number(element.center.lat), lng: Number(element.center.lon) }
          : null

    const elements = await overpass(`[out:json][timeout:20];${selector};out tags ${center};`, {
      timeoutLabel: 'venue lookup',
    })
    const element = elements[0]
    if (!element?.tags && !element?.lat && !element?.center) {
      throw new OsmError('That place is no longer in OpenStreetMap.', {
        status: 404,
        hint: 'Open Discover and pick a restaurant from a fresh search.',
      })
    }
    // Full live tests prove this public Overpass mirror occasionally drops
    // coordinates for exact node lookups; Nominatim reverse then fails on
    // missing numbers. Carry the search coordinates through instead.
    const pseudo = {
      osm_type: kind,
      osm_id: numeric,
      name: element.tags?.name,
      type: element.tags?.amenity,
      lat: element.lat ?? element.center?.lat ?? hintLat,
      lon: element.lon ?? element.center?.lon ?? hintLng,
      extratags: element.tags ?? {},
      address: {},
    }
    const place = normalizeVenue(pseudo)

    // The public Overpass mirror sometimes returns the element with minimal
    // coordinates. If the coordinates outcome differs from the lookup target,
    // fetch the exact node once more by identity before resolving the address.
    try {
      const target = latLon(element)
      const have = place.location
      const mismatch =
        target &&
        have &&
        (Math.abs(target.lat - have.lat) > 1e-9 || Math.abs(target.lng - have.lng) > 1e-9)
      if (mismatch && kind === 'node') {
        const direct = await overpass(
          `[out:json][timeout:20];node(${numeric});out tags ${center};`,
          { timeoutLabel: 'venue lookup' },
        )
        const exact = direct[0]
        if (exact) {
          pseudo.lat = exact.lat ?? exact.center?.lat ?? pseudo.lat
          pseudo.lon = exact.lon ?? exact.center?.lon ?? pseudo.lon
          if (exact.tags) {
            pseudo.extratags = { ...pseudo.extratags, ...exact.tags }
            if (exact.tags.name) pseudo.name = exact.tags.name
            if (exact.tags.amenity) pseudo.type = exact.tags.amenity
          }
          const refreshed = normalizeVenue(pseudo)
          Object.assign(place, refreshed)
        }
      }
    } catch {
      // Identity re-check is best effort only.
    }

    try {
      const reverse = await reverseAddress(place.location)
      if (reverse) place.address = reverse
    } catch (error) {
      console.warn('[osm] reverse geocode skipped:', error?.message ?? error)
      place.address = ''
    }
    const enriched = await withPhotos([place], { max: 3 })
    return writeCache(cacheKey, enriched[0], 15 * 60 * 1000)
  }

  const reverseAddress = async (location) => {
    if (!location) return ''
    const params = new URLSearchParams({ lat: String(location.lat), lon: String(location.lng), format: 'jsonv2' })
    if (nominatimEmail) params.set('email', nominatimEmail)
    const payload = await fetchJson(`${NOMINATIM_BASE}/reverse?${params.toString()}`, { gateNominatim: true })
    return payload.display_name ?? ''
  }

  const geocodeArea = async (text) => {
    const raw = await nominatimSearch(text, { limit: 3 })
    const candidate = raw.find((result) => result.boundingbox) ?? raw[0]
    if (!candidate?.boundingbox) {
      throw new OsmError(`We could not locate "${text}" on the map.`, {
        status: 404,
        hint: 'Try a bigger city or a well-known neighbourhood, for example "Indiranagar, Bengaluru".',
      })
    }
    const [south, north, west, east] = candidate.boundingbox.map(Number)
    const area = { south, north, west, east, label: candidate.display_name?.split(',').slice(0, 2).join(',') ?? text }
    if (candidate.osm_type === 'relation') {
      area.areaId = 3600000000 + Number(candidate.osm_id)
    }
    return area
  }

  const escapeOverpass = (value) => String(value ?? '').replace(/[^a-zA-Z ]/g, '').trim()

  const restaurantsInArea = async ({ area, cuisine = '', limit = 60 } = {}) => {
    const scope = area.areaId
      ? `(area:${area.areaId})`
      : `(${area.south},${area.west},${area.north},${area.east})`
    const cuisineWord = escapeOverpass(cuisine)
    const cuisineFilter = cuisineWord ? `[cuisine~"${cuisineWord}",i]` : ''
    const selector = `["amenity"~"^(restaurant|fast_food|cafe|pub|bar|ice_cream)$"]["name"]${cuisineFilter}${scope}`
    const ql = `[out:json][timeout:25];(node${selector};way${selector};);out center tags ${limit};`
    const elements = await overpass(ql, { timeoutLabel: 'area search' })
    return elements.map((element) =>
      normalizeVenue({
        osm_type: element.type,
        osm_id: element.id,
        name: element.tags?.name,
        type: element.tags?.amenity,
        lat: element.lat ?? element.center?.lat,
        lon: element.lon ?? element.center?.lon,
        display_name: '',
        extratags: element.tags ?? {},
        address: {},
      }, { addressFallback: area.label }),
    )
  }

  return { searchPlaces, getPlace, geocodeArea, restaurantsInArea, withPhotos, commonsPhoto, splitLocationQuery }
}