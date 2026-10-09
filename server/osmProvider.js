// Keyless OpenStreetMap provider: venue search and details via Nominatim and
// the Overpass API, photos via Wikimedia Commons. No key, no signup, no card.
//
// Usage policies respected here: Nominatim is throttled to one request per
// second with an identifying User-Agent; Overpass queries are small, bounded
// and cached. Docs: https://nominatim.org/release-docs/develop/api/Overview/
// and https://wiki.openstreetmap.org/wiki/Overpass_API

import { isOpenNow } from './openingHours.js'

const UA = 'CrowdTaste/1.0 (restaurant discovery demo; local development use)'
const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org'

// Public Overpass mirrors. The main instance regularly returns 504 under load,
// so queries fail over across these in order and remember whichever answered.
// See https://wiki.openstreetmap.org/wiki/Overpass_API#Public_Overpass_API_instances
// Only mirrors that serve the whole planet belong here: overpass.osm.ch is a
// Switzerland-only extract and quietly returns zero rows elsewhere.
const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
]

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

// Great-circle distance in kilometres, or null when either side is missing.
export const distanceKm = (fromLat, fromLng, to) => {
  if (!to || !Number.isFinite(Number(to.lat)) || !Number.isFinite(Number(to.lng))) return null
  const R = 6371
  const toRad = (deg) => (deg * Math.PI) / 180
  const dLat = toRad(Number(to.lat) - fromLat)
  const dLng = toRad(Number(to.lng) - fromLng)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(fromLat)) * Math.cos(toRad(Number(to.lat))) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)))
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
  // Index into OVERPASS_MIRRORS; advances as mirrors answer or fail.
  let preferredMirror = 0

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

  const nominatimSearch = async (query, { limit = 8, viewbox = '', bounded = false } = {}) => {
    const params = new URLSearchParams({
      q: query,
      format: 'jsonv2',
      addressdetails: '1',
      extratags: '1',
      limit: String(limit),
    })
    if (viewbox) {
      params.set('viewbox', viewbox)
      if (bounded) params.set('bounded', '1')
    }
    if (nominatimEmail) params.set('email', nominatimEmail)
    return fetchJson(`${NOMINATIM_BASE}/search?${params.toString()}`, { gateNominatim: true })
  }

  // A Nominatim viewbox is <left>,<top>,<right>,<bottom> - west, north, east,
  // south - so the box is built from the radius around the caller's position.
  const viewboxAround = (lat, lng, radiusM) => {
    const dLat = radiusM / 111320
    const dLng = radiusM / (111320 * Math.max(0.01, Math.cos((lat * Math.PI) / 180)))
    return {
      west: lng - dLng,
      north: lat + dLat,
      east: lng + dLng,
      south: lat - dLat,
      text: [lng - dLng, lat + dLat, lng + dLng, lat - dLat].map((value) => value.toFixed(5)).join(','),
    }
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
      // Real, computed from the venue's own opening_hours tag - never guessed.
      openNow: isOpenNow(tags.opening_hours),
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

  const isTransient = (error) =>
    error instanceof OsmError && (error.status === 504 || (error.upstreamStatus ?? 0) >= 500)

  const overpass = async (ql, { timeoutLabel = 'map query', retries = 1 } = {}) => {
    // Start from whichever mirror last answered, then walk the rest.
    const order = OVERPASS_MIRRORS.map(
      (_, offset) => OVERPASS_MIRRORS[(preferredMirror + offset) % OVERPASS_MIRRORS.length],
    )
    let lastError = null

    for (const mirror of order) {
      let attempt = 0
      for (;;) {
        try {
          const payload = await fetchJson(mirror, {
            method: 'POST',
            overpass: true,
            body: `data=${encodeURIComponent(ql)}`,
          })
          preferredMirror = OVERPASS_MIRRORS.indexOf(mirror)
          return payload.elements ?? []
        } catch (error) {
          lastError = error
          if (attempt < retries && isTransient(error)) {
            attempt += 1
            await new Promise((resolve) => setTimeout(resolve, 1200 * attempt))
            continue
          }
          // Out of retries here: move on to the next mirror.
          break
        }
      }
    }

    if (isTransient(lastError)) {
      throw new OsmError(`The ${timeoutLabel} timed out on every public map mirror.`, {
        status: 504,
        hint: 'The public OpenStreetMap servers are busy. Narrow the search or try again in a moment.',
      })
    }
    throw lastError ?? new OsmError(`The ${timeoutLabel} failed.`, { status: 502 })
  }

  const withPhotos = async (places, { max = 6, geotagged = true } = {}) => {
    const out = [...places]
    for (let index = 0; index < Math.min(max, out.length); index += 1) {
      const place = out[index]
      if (place.photos?.length) continue
      try {
        // First: an image that actually names the place.
        let found = await commonsPhoto(`${place.name} ${place.areaHint || ''}`.trim())
        // Fallback: a photo geotagged at the venue's own coordinates. Labeled
        // plainly so nobody mistakes a neighbourhood shot for the restaurant.
        if (!found && geotagged && place.location) {
          found = await commonsNearbyPhoto(place.location)
        }
        if (found) out[index] = { ...place, photos: [found] }
      } catch {
        // A missing photo must never fail the whole search.
      }
    }
    return out
  }

  // Images geotagged within a short walk of a coordinate, via the Commons
  // GeoData extension. Honest and cheap: no key, and clearly credited.
  const commonsNearbyPhoto = async ({ lat, lng }, { radius = 250, width = 900 } = {}) => {
    if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) return null
    const params = new URLSearchParams({
      action: 'query',
      format: 'json',
      generator: 'geosearch',
      ggscoord: `${lat}|${lng}`,
      ggsradius: String(Math.min(Math.max(Number(radius) || 250, 10), 10000)),
      ggslimit: '5',
      ggsnamespace: '6',
      prop: 'imageinfo',
      iiprop: 'url|size|extmetadata',
      iiurlwidth: String(width),
    })
    const payload = await fetchJson(`https://commons.wikimedia.org/w/api.php?${params.toString()}`)
    const pages = Object.values(payload.query?.pages ?? {})
    const page = pages.find((entry) => !entry.missing && entry.imageinfo?.[0])
    const info = page?.imageinfo?.[0]
    if (!info) return null
    return {
      name: info.thumburl ?? info.url,
      external: true,
      width: info.thumbwidth ?? info.width ?? null,
      height: info.thumbheight ?? info.height ?? null,
      credit: 'Geotagged photo from this spot (Wikimedia Commons)',
      author: info.extmetadata?.Artist?.value?.replace(/<[^>]+>/g, '') ?? null,
      license:
        info.extmetadata?.LicenseShortName?.value ??
        info.extmetadata?.License?.value?.replace(/<[^>]+>/g, '') ??
        null,
      pageUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title)}`,
    }
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

  // "What is near me?" - the realtime location path.
  //
  // Primary source is Nominatim bounded to a viewbox around the caller: one
  // small, reliable request per search term that returns real venue tags. When
  // it finds nothing we fall back to Overpass `around`, which is richer but
  // runs on a public instance that frequently sheds load.
  const restaurantsNear = async ({ lat, lng, radius = 1200, cuisine = '', limit = 30, photos = true } = {}) => {
    const latNum = Number(lat)
    const lngNum = Number(lng)
    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
      throw new OsmError('A valid latitude and longitude are required for a nearby search.', { status: 400 })
    }
    const radiusM = Math.min(Math.max(Number(radius) || 1200, 150), 5000)
    const maxResults = Math.min(Math.max(Number(limit) || 30, 1), 60)
    const cuisineWord = escapeOverpass(cuisine)
    const cacheKey = `osm-near:${latNum.toFixed(3)}:${lngNum.toFixed(3)}:${radiusM}:${cuisineWord.toLowerCase()}:${maxResults}`
    const cached = readCache(cacheKey)
    if (cached) return cached

    const box = viewboxAround(latNum, lngNum, radiusM)
    const terms = cuisineWord ? [cuisineWord, 'restaurant'] : ['restaurant', 'cafe']
    const collected = new Map()

    for (const term of terms) {
      try {
        const rows = await nominatimSearch(term, { limit: 40, viewbox: box.text, bounded: true })
        for (const row of rows) {
          if (!isVenue(row) || !row.name) continue
          const place = normalizeVenue(row)
          if (!collected.has(place.id)) collected.set(place.id, place)
        }
      } catch (error) {
        // One bad term must not sink the whole nearby lookup.
        console.warn('[osm] nearby term failed:', term, error?.message ?? error)
      }
      if (collected.size >= maxResults * 2) break
    }

    let results = [...collected.values()]

    if (results.length === 0) {
      results = await overpassAround({ lat: latNum, lng: lngNum, radiusM, cuisineWord, maxResults })
    }

    // Closest first, and drop anything that fell outside the radius.
    results = results
      .map((place) => ({ ...place, distanceKm: distanceKm(latNum, lngNum, place.location) }))
      .filter((place) => place.distanceKm === null || place.distanceKm <= radiusM / 1000 + 0.2)
      .sort(
        (a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity) || a.name.localeCompare(b.name),
      )
      .slice(0, maxResults)

    if (photos && results.length > 0) {
      results = await withPhotos(results.slice(0, 12), { max: 8 })
    }
    return writeCache(cacheKey, results, 5 * 60 * 1000)
  }

  const overpassAround = async ({ lat, lng, radiusM, cuisineWord = '', maxResults = 30 }) => {
    const cuisineFilter = cuisineWord ? `[cuisine~"${cuisineWord}",i]` : ''
    const selector = `["amenity"~"^(restaurant|fast_food|cafe|pub|bar|ice_cream)$"]["name"]${cuisineFilter}(around:${radiusM},${lat},${lng})`
    const ql = `[out:json][timeout:25];(node${selector};way${selector};);out center tags ${maxResults};`
    const elements = await overpass(ql, { timeoutLabel: 'nearby search' })
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
      }),
    )
  }

  return {
    searchPlaces,
    getPlace,
    geocodeArea,
    restaurantsInArea,
    restaurantsNear,
    withPhotos,
    commonsPhoto,
    commonsNearbyPhoto,
    splitLocationQuery,
  }
}