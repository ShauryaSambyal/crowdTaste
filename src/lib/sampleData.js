// Sample fallback source: the bundled Bengaluru list (src/data.json).
// Used when GOOGLE_PLACES_API_KEY is not configured yet, and as an extra
// semantic source when the live provider has no matches.

import data from '../data.json'

// Local photos reused for sample cards and detail pages.
const RESTAURANT_IMAGES = [
  '/restaurant_images/rest1.jpg',
  '/restaurant_images/rest2.jpg',
  '/restaurant_images/rest3.jpg',
  '/restaurant_images/rest4.jpg',
  '/restaurant_images/rest5.jpg',
  '/restaurant_images/rest6.jpg',
]

const FOOD_IMAGES = [
  '/food_images/food1.jpg',
  '/food_images/food2.jpg',
  '/food_images/food3.jpg',
  '/food_images/food4.jpg',
  '/food_images/food5.jpg',
  '/food_images/food6.jpg',
  '/food_images/food7.jpg',
  '/food_images/food8.jpg',
  '/food_images/food9.jpg',
  '/food_images/food10.jpg',
]

// Words that carry no search meaning on their own.
const STOP_WORDS = new Set([
  'in',
  'near',
  'at',
  'the',
  'a',
  'an',
  'and',
  'or',
  'of',
  'for',
  'with',
  'me',
  'my',
  'show',
  'find',
  'best',
  'good',
  'top',
  'place',
  'places',
  'restaurant',
  'restaurants',
  'food',
  'eat',
  'eating',
  'some',
  'any',
  'around',
])

export const tokenize = (value) =>
  String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token))

const platesFor = (id) => {
  const start = Math.abs(Number(id) || 0) % FOOD_IMAGES.length
  return [0, 1, 2].map((offset) => FOOD_IMAGES[(start + offset * 3) % FOOD_IMAGES.length])
}

const cuisineList = (entry) =>
  String(entry.type_of_dishes_served ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)

const tagsOf = (entry) =>
  (Array.isArray(entry.famous_for) ? entry.famous_for : [entry.famous_for]).filter(Boolean)

const reviewsOf = (entry) => (Array.isArray(entry.reviews) ? entry.reviews : [])

export const sampleIdFor = (entry) => `sample-${entry.id}`

const mapsUri = (entry) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${entry.name} ${entry.location ?? ''}`)}`

// Card shape shared with the live Google Places results, so every component
// can render live and sample data with the same code.
export const toSampleCard = (entry) => ({
  id: sampleIdFor(entry),
  source: 'sample',
  name: entry.name,
  address: entry.location ?? '',
  location: null,
  rating: null,
  reviewCount: null,
  priceLevel: null,
  priceLabel: null,
  cuisines: cuisineList(entry),
  primaryType: null,
  openNow: null,
  photos: [],
  image: RESTAURANT_IMAGES[Math.abs(Number(entry.id) || 0) % RESTAURANT_IMAGES.length],
  googleMapsUri: mapsUri(entry),
  businessStatus: null,
})

// Detail shape adds the review texts, tag chips and plate photos that live in
// data.json but are not part of the Google response.
export const toSampleDetail = (entry) => ({
  ...toSampleCard(entry),
  tags: tagsOf(entry),
  plates: platesFor(entry.id),
  reviews: reviewsOf(entry).map((text, index) => ({
    id: `${sampleIdFor(entry)}-review-${index}`,
    author: 'Sample diner review',
    rating: null,
    text,
    relativeTime: '',
    publishedAt: null,
  })),
  hours: [],
  phone: null,
  website: null,
})

export const sampleRestaurants = data.map(toSampleCard)

export const sampleCount = sampleRestaurants.length

const entriesById = new Map(data.map((entry) => [String(entry.id), entry]))

// Accepts "sample-12" and the legacy numeric "/restaurant/12" links.
export const findSampleEntry = (id) => entriesById.get(String(id ?? '').replace(/^sample-/, '')) ?? null

const searchIndex = data.map((entry) => ({
  entry,
  name: entry.name.toLowerCase(),
  cuisine: `${entry.type_of_dishes_served ?? ''} ${tagsOf(entry).join(' ')}`.toLowerCase(),
  area: String(entry.location ?? '').toLowerCase(),
  reviews: reviewsOf(entry).join(' ').toLowerCase(),
}))

// Semantic-ish local search: each term is scored where it matched
// (name > cuisine/tags > area > review text) and entries that match every
// term are ranked first, so "biryani in jayanagar" still finds a biryani
// place in Jayanagar even though the JSON has no such tag.
export const searchSampleEntries = (query) => {
  const terms = tokenize(query)
  if (terms.length === 0) return []

  const scored = []
  for (const record of searchIndex) {
    let score = 0
    let matchedTerms = 0
    for (const term of terms) {
      if (record.name.includes(term)) {
        score += 5
        matchedTerms += 1
        continue
      }
      if (record.cuisine.includes(term)) {
        score += 3
        matchedTerms += 1
        continue
      }
      if (record.area.includes(term)) {
        score += 2
        matchedTerms += 1
        continue
      }
      if (record.reviews.includes(term)) {
        score += 1
        matchedTerms += 1
      }
    }
    if (score > 0) scored.push({ entry: record.entry, score, matchedTerms })
  }

  return scored
    .sort(
      (a, b) =>
        b.matchedTerms - a.matchedTerms ||
        b.score - a.score ||
        a.entry.name.localeCompare(b.entry.name),
    )
    .map((item) => item.entry)
}

export const searchSampleRestaurants = (query) => searchSampleEntries(query).map(toSampleCard)

export const sampleDishNames = () => {
  const dishes = new Set()
  for (const entry of data) {
    for (const tag of tagsOf(entry)) {
      if (tag && tag.length > 3) dishes.add(tag)
    }
  }
  return [...dishes]
}
