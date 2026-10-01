// Scoring for keyless (OpenStreetMap) mode.
// With no ratings or review counts available, we never invent quality: we rank
// on verifiable listing detail and on cuisine focus, and every verdict says so.

export const KEYLESS_METHOD = {
  keyless: true,
  title: 'Open-data completeness',
  basis: [
    'Cuisine listed - 22%',
    'Opening hours known - 18%',
    'Phone or website listed - 16%',
    'Menu link available - 14%',
    'Extra venue details - 16%',
    'Photos found - 14%',
    'Matches the requested cuisine - small bonus',
  ],
  disclaimer:
    'Without diner ratings this ranks how complete each venue public listing is, not how good the food tastes. Add a Google Places billing key for rating-based verdicts.',
}

const FEATURES = [
  { id: 'cuisines', weight: 0.22, present: 'names its cuisine', hit: (p) => (p.cuisines?.length ?? 0) > 0 },
  { id: 'hours', weight: 0.18, present: 'publishes opening hours', hit: (p) => (p.hours?.length ?? 0) > 0 },
  {
    id: 'contact',
    weight: 0.16,
    present: 'lists a phone number or website',
    hit: (p) => Boolean(p.contacts?.phone || p.contacts?.website),
  },
  { id: 'menu', weight: 0.14, present: 'links its menu', hit: (p) => Boolean(p.menuUrl) },
  { id: 'richness', weight: 0.16, present: 'has a richer public profile', hit: (p) => (p.tags?.length ?? 0) >= 3 },
  { id: 'photos', weight: 0.14, present: 'has photos available', hit: (p) => (p.photos?.length ?? 0) > 0 },
]

export const featureScore = (place, focusCuisines = []) => {
  let total = 0
  const present = []
  for (const feature of FEATURES) {
    if (feature.hit(place)) {
      total += feature.weight * 100
      present.push(FEATURES.find((item) => item.id === feature.id).present)
    }
  }
  const focus = focusCuisines.map((word) => word.toLowerCase())
  const cuisineHit =
    focus.length > 0 &&
    (place.cuisines ?? []).some((cuisine) =>
      focus.some((word) => cuisine.toLowerCase().includes(word) || word.includes(cuisine.toLowerCase())),
    )
  if (cuisineHit) {
    total = Math.min(100, total + 6)
    present.push('Matches the requested cuisine')
  }
  const rounded = Math.round(total)
  return {
    total: rounded,
    totalLabel: `${rounded}/100`,
    present,
    components: Object.fromEntries(
      FEATURES.map((feature) => [
        feature.id,
        { weight: feature.weight, hit: feature.hit(place) },
      ]),
    ),
  }
}

const presentNames = (place) =>
  FEATURES.filter((feature) => feature.hit(place)).map((feature) => feature.present)

const buildKeylessReasons = (left, right, { focusCuisines = [] } = {}) => {
  const reasons = []
  const focus = focusCuisines.map((word) => word.toLowerCase())
  const leftHit =
    focus.length > 0 &&
    (left.cuisines ?? []).some((cuisine) =>
      focus.some((word) => cuisine.toLowerCase().includes(word) || word.includes(cuisine.toLowerCase())),
    )
  const rightHit =
    focus.length > 0 &&
    (right.cuisines ?? []).some((cuisine) =>
      focus.some((word) => cuisine.toLowerCase().includes(word) || word.includes(cuisine.toLowerCase())),
    )
  if (leftHit !== rightHit) {
    const matching = leftHit ? left : right
    reasons.push({ winner: matching.id, text: `${matching.name} matches the requested cuisine (${matching.cuisines.join(', ')}).` })
  }

  for (const feature of FEATURES) {
    const leftHas = feature.hit(left)
    const rightHas = feature.hit(right)
    if (leftHas === rightHas) continue
    const advantaged = leftHas ? left : right
    const other = leftHas ? right : left
    let detail = ''
    if (feature.id === 'cuisines') detail = ` (${advantaged.cuisines.join(', ')})`
    reasons.push({ winner: advantaged.id, text: `${advantaged.name} ${feature.present}${detail}; ${other.name} does not.` })
  }

  if (reasons.length === 0) {
    const leftCount = presentNames(left).length
    const rightCount = presentNames(right).length
    reasons.push({
      winner: null,
      text: `Both share an identical profile (${leftCount} of ${FEATURES.length} signals each) - pick whichever suits the occasion, or revisit with a ratings key for a quality verdict.`,
    })
  }

  return reasons
}

export const keylessPairCompare = (left, right, { focusCuisines = [] } = {}) => {
  const leftScore = featureScore(left, focusCuisines)
  const rightScore = featureScore(right, focusCuisines)
  const diff = leftScore.total - rightScore.total
  const winner = diff === 0 ? null : diff > 0 ? left : right
  const margin = Math.abs(diff)

  return {
    mode: 'pair',
    keyless: true,
    winner: winner ? { id: winner.id, name: winner.name } : null,
    tie: !winner,
    margin,
    verdict: winner
      ? `${winner.name} looks better documented (+${margin}) - but this is listing completeness, not taste.`
      : 'Both listings are equally documented - taste cannot be judged without diner ratings.',
    left: { place: left, score: leftScore },
    right: { place: right, score: rightScore },
    reasons: buildKeylessReasons(left, right, { focusCuisines }),
    method: KEYLESS_METHOD,
  }
}

export const keylessAreaCompare = (places = [], { location, cuisine } = {}) => {
  const focus = cuisine ? [cuisine.toLowerCase()] : []
  const ranking = places
    .map((place) => ({ place, score: featureScore(place, focus) }))
    .sort((a, b) => b.score.total - a.score.total || a.place.name.localeCompare(b.place.name))

  const leader = ranking[0]?.place ?? null

  return {
    mode: 'area',
    keyless: true,
    query: { location, cuisine: cuisine || null },
    winner: ranking[0]
      ? { id: ranking[0].place.id, name: ranking[0].place.name, score: ranking[0].score.total }
      : null,
    verdict: ranking[0]
      ? `${ranking[0].place.name} is the best documented listing in ${location} (${ranking[0].score.total}/100). Without ratings this ranks listing completeness, not taste.`
      : `No restaurants were found in ${location} on OpenStreetMap. Try a different area or a broader cuisine.`,
    ranking: ranking.map((entry, index) => ({
      rank: index + 1,
      place: entry.place,
      score: entry.score,
      highlights: entry.score.present,
    })),
    method: KEYLESS_METHOD,
  }
}