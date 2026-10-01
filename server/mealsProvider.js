// Keyless dish-photo provider: TheMealDB (free test key, no signup, no card)
// for authentic dish photos, plus Wikimedia Commons as a second photo source.
// Docs: https://www.themealdb.com/api.php

const MEALDB_BASE = 'https://www.themealdb.com/api/json/v1/1'

const CUISINE_DISH_WORDS = {
  indian: ['biryani', 'dosa', 'curry'],
  'north indian': ['butter chicken', 'naan'],
  'south indian': ['dosa', 'idli'],
  chinese: ['noodles', 'fried rice'],
  italian: ['pizza', 'pasta'],
  mexican: ['taco', 'burrito'],
  japanese: ['sushi', 'ramen'],
  thai: ['pad thai', 'curry'],
  american: ['burger', 'fries'],
  cafe: ['coffee', 'cake'],
  bakery: ['cake', 'bread'],
  'ice cream': ['ice cream'],
  korean: ['kimchi', 'bibimbap'],
  vietnamese: ['pho'],
  continental: ['steak', 'pasta'],
  seafood: ['salmon', 'prawns'],
  barbecue: ['ribs', 'steak'],
  kebab: ['kebab'],
  chaat: ['samosa'],
}

const DISH_STOP_WORDS = new Set([
  'indian', 'north', 'south', 'food', 'restaurant', 'restaurants', 'best', 'in',
  'the', 'and', 'cuisine', 'cuisines', 'dish', 'dishes', 'menu', 'near', 'me',
])

export const createMealsProvider = ({ timeoutMs = 12000, osmCommonsPhoto = null } = {}) => {
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

  const get = async (path) => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await fetch(`${MEALDB_BASE}${path}`, {
        headers: { 'User-Agent': 'CrowdTaste/1.0', Accept: 'application/json' },
        signal: controller.signal,
      })
      if (!response.ok) throw new Error(`TheMealDB answered ${response.status}.`)
      return await response.json()
    } catch (error) {
      if (error?.name === 'AbortError') throw new Error('The dish service timed out.')
      throw error
    } finally {
      clearTimeout(timer)
    }
  }

  const dishWords = (query) => {
    const lowered = String(query ?? '').toLowerCase()
    const words = []
    for (const [cuisine, dishes] of Object.entries(CUISINE_DISH_WORDS)) {
      if (lowered.includes(cuisine)) words.push(...dishes)
    }
    const tokens = lowered
      .split(/[^a-z ]/)
      .join(' ')
      .split(/\s+/)
      .filter((token) => token.length > 2 && !DISH_STOP_WORDS.has(token))
    words.push(...tokens)
    return [...new Set(words)].slice(0, 5)
  }

  const ingredientNames = (meal) => {
  const out = []
  for (let index = 1; index <= 20; index += 1) {
    const name = meal[`strIngredient${index}`]
    const measure = meal[`strMeasure${index}`]
    if (name && name.trim()) {
      out.push(measure && measure.trim() ? `${name.trim()} (${measure.trim()})` : name.trim())
    }
  }
  return out
}

const normalizeMeal = (meal) => ({
    id: `mealdb-${meal.idMeal}`,
    source: 'mealdb',
    title: meal.strMeal,
    chain: [meal.strArea, meal.strCategory].filter(Boolean).join(' | ') || null,
    servingSize: null,
    price: null,
    priceLabel: null,
    image: meal.strMealThumb ? `${meal.strMealThumb}/medium` : null,
    breadcrumbs: [meal.strCategory, meal.strArea].filter(Boolean),
    ingredients: ingredientNames(meal),
  })

  // Dishes typical of a cuisine: authentic photos, no invented prices.
  const searchDishes = async ({ query, limit = 8 } = {}) => {
    const clean = String(query ?? '').trim()
    if (clean.length < 2) return []
    const count = Math.min(Math.max(Number(limit) || 8, 1), 12)
    const cacheKey = `dishes:${count}:${clean.toLowerCase()}`
    const cached = readCache(cacheKey)
    if (cached) return cached

    const seen = new Set()
    const items = []
    for (const word of dishWords(clean)) {
      if (items.length >= count) break
      try {
        const payload = await get(`/search.php?s=${encodeURIComponent(word)}`)
        for (const meal of payload.meals ?? []) {
          if (seen.has(meal.idMeal)) continue
          seen.add(meal.idMeal)
          items.push(normalizeMeal(meal))
          if (items.length >= count) break
        }
      } catch {
        // One failed word must not fail the whole lookup.
      }
    }
    const value = { items, query: clean }
    cache.set(cacheKey, { value, expiresAt: Date.now() + 60 * 60 * 1000 })
    return value
  }

  return { searchDishes, dishWords, commonsPhoto: osmCommonsPhoto }
}