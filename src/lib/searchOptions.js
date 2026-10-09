// Filters and sort orders for the discovery results.
// Filters only use signals we really have (openNow, rating, review count, price
// level), so they behave the same for live Google data and the sample list.

export const FILTERS = [
  { id: 'open-now', label: 'Open now', icon: 'ri-time-line', test: (place) => place.openNow === true },
  {
    id: 'top-rated',
    label: 'Top rated (4.5+)',
    icon: 'ri-star-line',
    test: (place) => typeof place.rating === 'number' && place.rating >= 4.5,
  },
  {
    id: 'most-reviewed',
    label: '1,000+ reviews',
    icon: 'ri-chat-3-line',
    test: (place) => typeof place.reviewCount === 'number' && place.reviewCount >= 1000,
  },
  {
    id: 'budget',
    label: 'Budget',
    icon: 'ri-hand-coin-line',
    test: (place) => typeof place.priceLevel === 'number' && place.priceLevel > 0 && place.priceLevel <= 2,
  },
  {
    id: 'premium',
    label: 'Premium',
    icon: 'ri-goblet-line',
    test: (place) => typeof place.priceLevel === 'number' && place.priceLevel >= 3,
  },
]

export const SORTS = [
  { id: 'relevance', label: 'Best match' },
  // Only offered once the diner has shared a location; the comparison itself is
  // done in the results view, which is where the coordinates live.
  { id: 'nearest', label: 'Nearest first' },
  { id: 'rating', label: 'Highest rated', compare: (a, b) => (b.rating ?? -1) - (a.rating ?? -1) },
  {
    id: 'reviews',
    label: 'Most reviewed',
    compare: (a, b) => (b.reviewCount ?? -1) - (a.reviewCount ?? -1),
  },
  {
    id: 'price-asc',
    label: 'Price: low to high',
    compare: (a, b) => (a.priceLevel ?? 99) - (b.priceLevel ?? 99),
  },
  { id: 'name', label: 'Name (A-Z)', compare: (a, b) => a.name.localeCompare(b.name) },
]

export const applyFilters = (places = [], activeFilters = []) => {
  if (activeFilters.length === 0) return places
  const active = FILTERS.filter((filter) => activeFilters.includes(filter.id))
  return places.filter((place) => active.every((filter) => filter.test(place)))
}

export const applySort = (places = [], sortId = 'relevance') => {
  const sort = SORTS.find((item) => item.id === sortId)
  if (!sort?.compare) return places
  return [...places].sort(sort.compare)
}