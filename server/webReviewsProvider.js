// Real ratings and review excerpts for any venue, read out of the public web.
//
// OpenStreetMap carries no ratings or reviews at all, and every mainstream
// review API (Yelp Fusion, Foursquare, Tripadvisor) sits behind a paid plan as
// of 2026 - see reviewsProvider.js for that side of the story. So a keyless
// install had nothing to show here. This provider closes that gap.
//
// Nothing is generated or inferred. Every number and every excerpt is quoted
// from a named source and linked back to it, so the UI can attribute it and the
// diner can go read the original. If a venue has no coverage anywhere, the
// result is empty rather than invented.
//
// Source: DuckDuckGo's no-JavaScript HTML endpoint, the one search surface that
// answers a plain GET with no key, token or card. Review sites publish their
// aggregate rating in the page description ("rated 4.3 of 5 on Tripadvisor and
// ranked #88 of 4,275 restaurants"), and forums and blogs supply the opinion
// text. Requests are serialised, spaced out and cached hard; if the endpoint
// ever throttles, the caller gets an empty result plus a notice, not an error
// wall.

const UA = 'CrowdTaste/1.0 (restaurant discovery demo; local development use)'
const SEARCH_ENDPOINT = 'https://html.duckduckgo.com/html/'

export class WebReviewsError extends Error {
  constructor(message, { status = 502, hint = '', upstreamStatus = null } = {}) {
    super(message)
    this.name = 'WebReviewsError'
    this.status = status
    this.hint = hint
    this.upstreamStatus = upstreamStatus
  }
}

const ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
}

export const decodeEntities = (value) =>
  String(value).replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity) => {
    const key = String(entity).toLowerCase()
    if (key.startsWith('#x')) return String.fromCharCode(parseInt(key.slice(2), 16))
    if (key.startsWith('#')) return String.fromCharCode(Number(key.slice(1)))
    return ENTITIES[key] ?? match
  })

export const stripTags = (value) =>
  decodeEntities(String(value).replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim()

// DuckDuckGo wraps every result link in a redirect: /l/?uddg=<encoded>&rut=...
// Unwrap it so the UI can link straight to the source.
export const unwrapUrl = (href) => {
  const raw = String(href ?? '')
  const match = /[?&]uddg=([^&"']+)/.exec(raw)
  if (match) {
    try {
      return decodeURIComponent(match[1])
    } catch {
      return null
    }
  }
  if (raw.startsWith('http')) return raw
  if (raw.startsWith('//')) return `https:${raw}`
  return null
}

const hostOf = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return ''
  }
}

// Friendly names and a credibility rank for the destinations that show up in
// restaurant search results. A lower rank wins when two sources both publish a
// rating: we show one source's own figure rather than averaging several
// together, which would be a number no source ever published.
const SOURCES = [
  [/tripadvisor\./, 'Tripadvisor', 1],
  [/(^|\.)google\./, 'Google', 2],
  [/(^|\.)yelp\./, 'Yelp', 3],
  [/(^|\.)zomato\./, 'Zomato', 4],
  [/restaurantguru\./, 'Restaurant Guru', 5],
  [/(^|\.)eazydiner\./, 'EazyDiner', 6],
  [/(^|\.)dineout\./, 'Dineout', 7],
  [/(^|\.)swiggy\./, 'Swiggy', 8],
  [/(^|\.)justdial\./, 'Justdial', 9],
  [/(^|\.)lonelyplanet\./, 'Lonely Planet', 9],
  [/(^|\.)timeout\./, 'Time Out', 10],
  [/(^|\.)cntraveller\./, 'Condé Nast Traveller', 11],
  [/(^|\.)tripoto\./, 'Tripoto', 12],
  [/(^|\.)wikipedia\./, 'Wikipedia', 13],
  [/(^|\.)reddit\./, 'Reddit', 20],
  [/(^|\.)quora\./, 'Quora', 21],
  [/(^|\.)facebook\./, 'Facebook', 22],
  [/(^|\.)instagram\./, 'Instagram', 23],
]

const sourceFor = (host) => {
  for (const [pattern, label, rank] of SOURCES) {
    if (pattern.test(host)) return { label, rank }
  }
  return { label: host || 'the web', rank: 40 }
}

// Rating sites write "4.3 of 5", "4.5/5", "Rated 4.5/5 from 84,800+" and
// "rated 5 out of 5 on Restaurant Guru". The lookahead on 5 stops "ranked #88
// of 5,400 restaurants" from being read as a perfect score.
// Ordered from most to least specific, because the loosest form at the bottom
// would otherwise match first and read the wrong number out of a phrase like
// "rated 4.3 of 5 from 84,800 reviews".
const RATING_PATTERNS = [
  /\b(?:rated|rating[:\s]*|scores?[:\s]*)\s*(\d(?:[.,]\d)?)\s*(?:\/\s*5(?![,\d])|out\s+of\s+5(?![,\d])|of\s+5(?![,\d])|stars?)/i,
  /\b(\d(?:[.,]\d)?)\s*(?:\/\s*5(?![,\d])|out\s+of\s+5(?![,\d])|of\s+5(?![,\d]))\b/i,
  /\b(\d(?:[.,]\d)?)\s*[-–]?\s*stars?\b/i,
  /\b(?:rated|rating|scores?)\s+(?:of\s+)?(\d(?:[.,]\d)?)\b/i,
]

export const parseRating = (text) => {
  const haystack = String(text ?? '')
  for (const pattern of RATING_PATTERNS) {
    const match = pattern.exec(haystack)
    if (!match) continue
    const value = Number(match[1].replace(',', '.'))
    if (Number.isFinite(value) && value >= 1 && value <= 5) return value
  }
  return null
}

// The "from N" form needs three digits because it can precede anything ("from
// 12 km"); the second form anchors on the word "reviews", so two digits are
// safe there and a small cafe with 21 reviews still reports its count.
const COUNT_PATTERNS = [
  /\bfrom\s+([\d,]{3,})\+?/i,
  /\b([\d,]{2,})\+?\s*(?:unbiased\s+|verified\s+|user\s+|diner\s+|customer\s+|google\s+)?(?:reviews|ratings)\b/i,
]

export const parseReviewCount = (text) => {
  const haystack = String(text ?? '')
  for (const pattern of COUNT_PATTERNS) {
    const match = pattern.exec(haystack)
    if (!match) continue
    const value = Number(match[1].replace(/,/g, ''))
    if (Number.isFinite(value) && value >= 10) return value
  }
  return null
}

// Directory pages spend their description on navigation, not on opinion. Those
// keep their rating and their link, but they are not worth quoting as a review.
const BOILERPLATE = [
  /\bsee\s+[\d,]+\s+unbiased\b/i,
  /\branked\s+#?\d+\s+of\s+[\d,]+\s+restaurants\b/i,
  /\bview\s+(the\s+)?(full\s+)?(menu|photos?|reviews?|map|gallery)\b/i,
  /\bmenu\s*[-–|:]\s*(prices?|photos?|reviews?|timings?)\b/i,
  /\b(prices?|photos?|reviews?|timings?)\s*[-–|:]\s*(menu|photos?|reviews?)\b/i,
  /\b(book|reserve|order)\s+(a\s+)?(table|online|now)\b/i,
  /\b\d+\s*min(ute)?s?\s+delivery\b/i,
  /\b(open|closing)\s+(now|today)\b/i,
  /\bwrite\s+a\s+review\b/i,
  /\bphoto\s+of\s+.{0,30}\s*-\s*menu\b/i,
  /\blocked\s+post\b/i,
  /\bnew comments cannot be posted\b/i,
  /\badd a comment\b/i,
  /\bcontinue this thread\b/i,
  /\ball\s+(google\s+maps|tripadvisor|zomato)\s+reviews\b/i,
  /\bbest-of\s+categories\b/i,
  /\bsee\s+all\b[\s\S]{0,40}\bbrowse\b/i,
  /\b[\d.,]+[KM]?\s+subscribers\b/i,
]

export const isBoilerplate = (text) => {
  const haystack = String(text ?? '')
  return BOILERPLATE.some((pattern) => pattern.test(haystack))
}

// Listing pages leak their filter tables into the description - "restaurants 3
// restaurants Rating Rating Distance Distance/ rating Popularity" - which no
// pattern list catches cleanly. Real prose repeats itself far less than a table
// does, so a low ratio of unique words marks it for what it is.
export const isTableNoise = (text) => {
  const words = String(text ?? '')
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.replace(/[^a-z0-9]/g, ''))
    .filter((word) => word.length > 2)
  if (words.length < 8) return false

  // "Rating Rating Distance Distance" - a column header repeated back to back is
  // the tell. One repeat can be ordinary speech, two cannot.
  let repeats = 0
  for (let index = 1; index < words.length; index += 1) {
    if (words[index] === words[index - 1]) repeats += 1
  }
  if (repeats >= 2) return true

  return new Set(words).size / words.length < 0.45
}

// Reddit search descriptions carry forum chrome after the actual comment:
// "... Add a Comment TOPICS Gaming". Trim it rather than dropping the quote.
const CHROME_TAIL = [
  /\s*Locked post\.\s*New comments cannot be posted\.?\s*/gi,
  /\s*(Add a Comment|Continue this thread|More replies|View all comments)\s*/gi,
  // Reddit's topic footer is rendered in caps and runs to the end of the
  // description, so it is matched case-sensitively and truncated away.
  /\s*TOPICS\b[\s\S]*$/,
]

export const trimChrome = (text) => {
  let value = String(text ?? '')
  for (const pattern of CHROME_TAIL) value = value.replace(pattern, ' ')
  return value.replace(/\s{2,}/g, ' ').trim()
}

// Words that carry no weight when deciding whether a result is about the venue.
const STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'restaurant',
  'restaurants',
  'hotel',
  'cafe',
  'bar',
  'best',
  'near',
  'reviews',
  'review',
  'rating',
  'ratings',
])

export const nameTokens = (name) =>
  String(name ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token))

// Names collide with everything else on the web - "Toit" is also an ESP32
// programming language and "Truffles" is a chocolate - so a result has to be
// anchored to food as well as to the name. It qualifies when it mentions the
// area the venue is in, or when it is clearly talking about eating and drinking.
// Deliberately narrow: generic words like "rating", "review", "service" and
// "order" are not food signals and let unrelated companies through - Trustpilot
// for "TOIT Training LLC" matched the brewpub on the word "rating" alone.
const FOOD_WORDS =
  /\b(restaurant|restaurants|cafe|cafes|coffee|brewery|brewpub|microbrewery|pub|bistro|diner|dining|dine|eatery|eats|eating|food|foodie|food court|street food|menu|dish|dishes|cuisine|chef|kitchen|pizza|burger|burgers|biryani|dosa|idli|thali|curry|tandoor|kebab|seafood|noodles|sandwich|fries|beer|drinks|cocktail|dessert|breakfast|lunch|dinner|brunch|meal|buffet|vegan|vegetarian|flavour|flavor|delicious|mouth|takeaway|takeout|zomato|swiggy|michelin|ambience|ambiance)\b/i

// A result only counts when it is plausibly about this venue: the longest word
// of its name has to appear, and for multi-word names a second word has to
// agree too, so "Cafe Coffee Day" does not match every cafe in the city.
const isAboutVenue = (result, tokens) => {
  if (tokens.length === 0) return true
  const haystack = `${result.title} ${result.text} ${result.host}`.toLowerCase()
  const longest = tokens.reduce((a, b) => (b.length > a.length ? b : a))
  if (!haystack.includes(longest)) return false
  if (tokens.length === 1) return result.title.toLowerCase().includes(longest)
  const hits = tokens.filter((token) => haystack.includes(token)).length
  return hits >= 2
}

const hasFoodContext = (result, cityTokens) => {
  const haystack = `${result.title} ${result.text} ${result.host}`.toLowerCase()
  if (cityTokens.length > 0 && cityTokens.some((token) => haystack.includes(token))) return true
  return FOOD_WORDS.test(haystack)
}

const mentionsArea = (result, cityTokens) => {
  if (cityTokens.length === 0) return false
  const haystack = `${result.title} ${result.text} ${result.url}`.toLowerCase()
  return cityTokens.some((token) => haystack.includes(token))
}

// Picks the one rating to show. Chains publish a separate rating per branch, so
// a result that names the area being viewed beats a better-known branch
// elsewhere in the city; only then do platform rank and review volume decide.
const pickRating = (candidates, cityTokens) =>
  [...candidates]
    .filter((result) => result.rating !== null && result.rank <= 9)
    .sort(
      (a, b) =>
        Number(mentionsArea(b, cityTokens)) - Number(mentionsArea(a, cityTokens)) ||
        a.rank - b.rank ||
        (b.reviewCount ?? 0) - (a.reviewCount ?? 0),
    )[0] ?? null

export const parseResults = (html) => {
  const blocks = String(html).split('<div class="result results_links').slice(1)
  const parsed = []

  for (const block of blocks) {
    const anchor = /class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/.exec(block)
    if (!anchor) continue
    const url = unwrapUrl(anchor[1])
    const title = stripTags(anchor[2])
    if (!url || !title) continue

    const snippetMatch = /class="result__snippet"[^>]*>([\s\S]*?)<\/a>/.exec(block)
    const text = snippetMatch ? stripTags(snippetMatch[1]) : ''
    const host = hostOf(url)
    const { label, rank } = sourceFor(host)

    // Read the numbers from the description, not the title. Titles carry years
    // and counts of their own - "CAFE NOIR, Bengaluru - 2026 Reviews" is a page
    // title, not two thousand and twenty-six reviews.
    const hasBody = text.length >= 40

    parsed.push({
      url,
      host,
      source: label,
      rank,
      title,
      text,
      rating: parseRating(text) ?? (hasBody ? null : parseRating(title)),
      reviewCount: parseReviewCount(text) ?? (hasBody ? null : parseReviewCount(title)),
    })
  }

  return parsed
}

// Reddit and forum hits arrive as a thread title, sometimes with a thin or
// empty description. The title is the opinion, so it becomes the excerpt.
// Reddit titles arrive with two suffixes stacked up - "... is overrated? :
// r/bangalore - Reddit" - so the strip repeats until nothing more comes off.
export const cleanTitle = (title, host) => {
  let value = String(title ?? '')
  if (/reddit\./.test(host)) {
    const suffixes = [/\s*[:\-–]\s*Reddit\s*$/i, /\s*[:\-–]\s*r\/[a-z0-9_]+\s*$/i]
    let previous
    do {
      previous = value
      for (const pattern of suffixes) value = value.replace(pattern, '')
    } while (value !== previous)
  }
  return value.trim()
}

// A venue's own website is marketing copy, not a review, so it is kept out of
// the excerpts even when the search returns it. Matched on the site's own
// domain label rather than a hardcoded list.
const isVenueSite = (result, tokens) => {
  const label = result.host.split('.')[0]
  return tokens.some((token) => token.length > 3 && label.includes(token))
}

const excerptFor = (result) => {
  const cleaned = cleanTitle(result.title, result.host)
  const snippet = trimChrome(result.text)
  const base = snippet.length >= 60 ? snippet : cleaned
  return { ...result, excerpt: cleanTitle(trimChrome(base), result.host) }
}

const opinionScore = (result) => {
  let score = Math.min(result.excerpt.length, 240)
  if (result.rank >= 20) score += 140 // forums and Reddit read as opinion
  if (result.rank <= 8) score -= 60 // directory descriptions are usually navigation
  if (/₹|rs\.?\s?\d|\$\d|price|expensive|cheap|worth|recommend|avoid|overrated|favourite|favorite|must\s+try|ambience|service/i.test(result.excerpt)) {
    score += 60 // actual opinion words
  }
  return score
}

const areaFromAddress = (address) => {
  const parts = String(address ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
  for (let index = parts.length - 1; index >= 0; index -= 1) {
    const part = parts[index]
    if (/^\d+$/.test(part)) continue
    if (/^(india|karnataka|usa|uk)$/i.test(part)) continue
    return part
  }
  return ''
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export const createWebReviewsProvider = ({
  timeoutMs = 12000,
  cacheTtlMs = 30 * 60 * 1000,
  minGapMs = 1200,
} = {}) => {
  const cache = new Map()
  let lastRequestAt = 0
  let queue = Promise.resolve()

  const readCache = (key) => {
    const entry = cache.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
      cache.delete(key)
      return null
    }
    return entry.value
  }

  const writeCache = (key, value) => {
    cache.set(key, { value, expiresAt: Date.now() + cacheTtlMs })
    return value
  }

  // One request at a time, with a gap between them: the endpoint answers a
  // burst of parallel requests with a block page.
  const enqueue = (task) => {
    const run = queue.then(async () => {
      const wait = Math.max(0, lastRequestAt + minGapMs - Date.now())
      if (wait > 0) await sleep(wait)
      lastRequestAt = Date.now()
      return task()
    })
    queue = run.then(
      () => undefined,
      () => undefined,
    )
    return run
  }

  const search = async (query) => {
    const url = `${SEARCH_ENDPOINT}?q=${encodeURIComponent(query)}`
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': UA, Accept: 'text/html' },
        signal: controller.signal,
      })
      if (!response.ok) {
        throw new WebReviewsError(`The web search answered ${response.status}.`, {
          status: response.status === 429 ? 429 : 502,
          upstreamStatus: response.status,
          hint: 'Public search is rate limiting this install. Try again in a minute.',
        })
      }
      return parseResults(await response.text())
    } catch (error) {
      if (error?.name === 'AbortError') {
        throw new WebReviewsError('The web search timed out.', {
          status: 504,
          hint: 'Try again in a moment.',
        })
      }
      throw error
    } finally {
      clearTimeout(timer)
    }
  }

  // Everything the web says about one venue: its published rating, the links
  // that lead to the full reviews, and the opinion excerpts worth quoting.
  const lookup = async ({ name, city = '', address = '' }, { limit = 6 } = {}) => {
    const cleanName = String(name ?? '').trim()
    if (cleanName.length < 2) {
      throw new WebReviewsError('A venue name is required to look up reviews.', { status: 400 })
    }

    const place = String(city ?? '').trim() || areaFromAddress(address)
    const cacheKey = `web:${cleanName.toLowerCase()}|${place.toLowerCase()}|${limit}`
    const cached = readCache(cacheKey)
    if (cached) return cached

    const queries = [
      `"${cleanName}" ${place} review rating`.trim(),
      `"${cleanName}" ${place} tripadvisor zomato google rating`.trim(),
      `${cleanName} ${place} site:reddit.com`.trim(),
    ]

    const collected = []
    const problems = []
    for (const query of queries) {
      try {
        collected.push(...(await enqueue(() => search(query))))
      } catch (error) {
        problems.push(error)
      }
    }

    if (collected.length === 0 && problems.length === queries.length) {
      throw problems[0]
    }

    const tokens = nameTokens(cleanName)
    const cityTokens = nameTokens(place)
    const seen = new Set()
    const relevant = []
    for (const result of collected) {
      if (seen.has(result.url)) continue
      if (!isAboutVenue(result, tokens)) continue
      if (!hasFoodContext(result, cityTokens)) continue
      seen.add(result.url)
      relevant.push(excerptFor(result))
    }

    // One source's own rating, never an average of several: averaging would
    // publish a number that no review site ever stated. Only recognised review
    // platforms count here, so a blog repeating someone else's figure cannot
    // become the headline rating under the blog's name.
    const ratingPick = pickRating(relevant, cityTokens)

    // Straight lines to the full review pages.
    const links = []
    const linkSeen = new Set()
    for (const result of relevant.slice().sort((a, b) => a.rank - b.rank)) {
      if (result.rank > 12) continue
      if (linkSeen.has(result.source)) continue
      linkSeen.add(result.source)
      links.push({ source: result.source, url: result.url, rating: result.rating, reviewCount: result.reviewCount })
      if (links.length >= 3) break
    }

    const candidates = relevant
      .filter(
        (result) =>
          result.excerpt.length >= 45 &&
          !isBoilerplate(result.excerpt) &&
          !isTableNoise(result.excerpt) &&
          !isVenueSite(result, tokens),
      )
      .sort((a, b) => opinionScore(b) - opinionScore(a))

    // At most two excerpts per source, so one chatty blog cannot fill the page.
    const perSource = new Map()
    const chosen = []
    for (const result of candidates) {
      const used = perSource.get(result.host) ?? 0
      if (used >= 2) continue
      perSource.set(result.host, used + 1)
      chosen.push(result)
      if (chosen.length >= limit) break
    }

    const reviews = chosen.map((result, index) => {
      const cleanedTitle = cleanTitle(result.title, result.host)
      return {
        id: `web-${index}-${result.host}`,
        author: result.source,
        source: result.source,
        sourceUrl: result.url,
        // Avoid printing the same sentence twice when the excerpt is the title.
        title: cleanedTitle.toLowerCase() === result.excerpt.toLowerCase() ? null : cleanedTitle,
        rating: null,
        text: result.excerpt,
        relativeTime: '',
        publishedAt: null,
      }
    })

    return writeCache(cacheKey, {
      source: 'web',
      matched: relevant.length > 0,
      rating: ratingPick?.rating ?? null,
      ratingSource: ratingPick?.source ?? null,
      ratingSourceUrl: ratingPick?.url ?? null,
      reviewCount: ratingPick?.reviewCount ?? null,
      reviews,
      links,
      notice:
        relevant.length === 0
          ? `Nothing was found online for ${cleanName} yet.`
          : null,
    })
  }

  // Rating only, for result cards. One request instead of the full lookup's
  // three, because a search page asks this for several venues at once and the
  // endpoint rate limits. Misses are cached too, so a card with no rating
  // anywhere is not re-queried on every render.
  const ratingFor = async ({ name, city = '', address = '' } = {}) => {
    const cleanName = String(name ?? '').trim()
    if (cleanName.length < 2) return null

    const place = String(city ?? '').trim() || areaFromAddress(address)
    const cacheKey = `rating:${cleanName.toLowerCase()}|${place.toLowerCase()}`
    const cached = readCache(cacheKey)
    if (cached) return cached

    let results = []
    try {
      // Naming the platforms is what surfaces their rating snippets: a bare
      // "<name> rating" query returns blogs and listicles with no figures at all.
      results = await enqueue(() => search(`"${cleanName}" ${place} tripadvisor rating`.trim()))
    } catch {
      return null
    }

    const tokens = nameTokens(cleanName)
    const cityTokens = nameTokens(place)
    const pick = pickRating(
      results.filter((result) => isAboutVenue(result, tokens) && hasFoodContext(result, cityTokens)),
      cityTokens,
    )

    return writeCache(
      cacheKey,
      pick
        ? { rating: pick.rating, source: pick.source, sourceUrl: pick.url, reviewCount: pick.reviewCount }
        : { rating: null },
    )
  }

  return { configured: true, lookup, ratingFor, search, parseResults }
}
