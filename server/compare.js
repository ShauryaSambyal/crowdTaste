// Transparent scoring model behind the Compare feature.
// The weights are surfaced in the UI and in README.md so a verdict can be audited.

import { priceLevelLabel } from './placesClient.js'

export const SCORING = {
  weights: { rating: 0.5, volume: 0.3, value: 0.2 },
  maxRating: 5,
  // A place with at least this many reviews is treated as a fully "proven"
  // signal; fewer reviews reduce how much we trust the rating.
  provenReviewCount: 3000,
  minRatingDifference: 0.15,
}

const round1 = (value) => Math.round(value * 10) / 10
const safeRating = (place) => (typeof place?.rating === 'number' ? place.rating : 0)
const safeCount = (place) => (typeof place?.reviewCount === 'number' ? place.reviewCount : 0)
const safePrice = (place) => (typeof place?.priceLevel === 'number' ? place.priceLevel : null)

export const formatCount = (value) => new Intl.NumberFormat('en-IN').format(Number(value) || 0)

export const priceLabelFor = (place) => {
  const level = safePrice(place)
  if (level === null) return null
  if (level === 0) return 'Free'
  return `${'$'.repeat(level)} ${priceLevelLabel(level)}`
}

export const scorePlace = (place) => {
  const rating = safeRating(place)
  const reviewCount = safeCount(place)
  const priceLevel = safePrice(place)

  const ratingScore = rating / SCORING.maxRating
  const volumeScore = Math.min(1, Math.log10(reviewCount + 1) / Math.log10(SCORING.provenReviewCount + 1))
  // Cheaper places get a small nudge; an unknown price is treated as neutral.
  const valueScore = priceLevel === null ? 0.5 : 1 - priceLevel / 4

  const total =
    100 *
    (ratingScore * SCORING.weights.rating +
      volumeScore * SCORING.weights.volume +
      valueScore * SCORING.weights.value)

  const rounded = Math.round(total)

  return {
    total: rounded,
    totalLabel: `${rounded}/100`,
    components: {
      rating: { score: round1(ratingScore * 100), weight: SCORING.weights.rating, value: rating || null },
      volume: { score: round1(volumeScore * 100), weight: SCORING.weights.volume, value: reviewCount || null },
      value: { score: round1(valueScore * 100), weight: SCORING.weights.value, value: priceLevel },
    },
  }
}

export const buildReasons = (left, right) => {
  const reasons = []
  const leftRating = safeRating(left)
  const rightRating = safeRating(right)
  const leftCount = safeCount(left)
  const rightCount = safeCount(right)
  const leftPrice = safePrice(left)
  const rightPrice = safePrice(right)

  const ratingDiff = leftRating - rightRating
  if (Math.abs(ratingDiff) >= SCORING.minRatingDifference) {
    const better = ratingDiff > 0 ? left : right
    const worse = ratingDiff > 0 ? right : left
    reasons.push({
      winner: better.id,
      text: `Higher rating: ${better.name} sits at ${safeRating(better).toFixed(1)} vs ${safeRating(worse).toFixed(1)}.`,
    })
  } else if (leftRating && rightRating) {
    reasons.push({
      winner: null,
      text: `Ratings are almost level (${leftRating.toFixed(1)} vs ${rightRating.toFixed(1)}), so review volume and price decide it.`,
    })
  }

  if (leftCount !== rightCount) {
    const ratio = Math.max(leftCount, rightCount) / Math.max(1, Math.min(leftCount, rightCount))
    if (ratio >= 1.8 || Math.abs(leftCount - rightCount) >= 250) {
      const better = leftCount > rightCount ? left : right
      const worse = leftCount > rightCount ? right : left
      reasons.push({
        winner: better.id,
        text: `Far more reviews: ${formatCount(safeCount(better))} vs ${formatCount(safeCount(worse))}, so the rating is a more reliable signal.`,
      })
    }
  }

  if (leftPrice !== null && rightPrice !== null && leftPrice !== rightPrice) {
    const cheaper = leftPrice < rightPrice ? left : right
    reasons.push({
      winner: cheaper.id,
      text: `Lower spend: ${cheaper.name} is ${priceLabelFor(cheaper)} against ${priceLabelFor(leftPrice < rightPrice ? right : left)}.`,
    })
  }

  if (left.openNow === true && right.openNow === false) {
    reasons.push({ winner: left.id, text: `${left.name} is open right now.` })
  }
  if (right.openNow === true && left.openNow === false) {
    reasons.push({ winner: right.id, text: `${right.name} is open right now.` })
  }

  const leftCuisines = (left.cuisines ?? []).join(', ')
  const rightCuisines = (right.cuisines ?? []).join(', ')
  if (leftCuisines && rightCuisines && leftCuisines !== rightCuisines) {
    reasons.push({
      winner: null,
      text: `Different kitchens: ${left.name} leans ${leftCuisines}, while ${right.name} leans ${rightCuisines}.`,
    })
  }

  return reasons
}

// Short, factual tags used by the area leaderboard.
export const highlightPlace = (place, leader) => {
  const tags = []
  if (typeof place.rating === 'number') tags.push(`Rating ${place.rating.toFixed(1)}`)
  if (typeof place.reviewCount === 'number') tags.push(`${formatCount(place.reviewCount)} reviews`)
  const price = priceLabelFor(place)
  if (price) tags.push(price)
  if (place.cuisines?.length) tags.push(place.cuisines.slice(0, 2).join(' / '))
  if (place.openNow === true) tags.push('Open now')

  if (leader && leader.id !== place.id && typeof place.rating === 'number' && typeof leader.rating === 'number') {
    const gap = leader.rating - place.rating
    if (gap >= 0.05) tags.push(`${gap.toFixed(1)} below the top rating`)
  }

  return tags
}

export const comparePair = (left, right) => {
  const leftScore = scorePlace(left)
  const rightScore = scorePlace(right)
  const diff = leftScore.total - rightScore.total
  const winner = diff === 0 ? null : diff > 0 ? left : right
  const margin = Math.abs(diff)
  const top = Math.max(leftScore.total, rightScore.total)
  const bottom = Math.min(leftScore.total, rightScore.total)

  return {
    mode: 'pair',
    winner: winner ? { id: winner.id, name: winner.name } : null,
    tie: !winner,
    margin,
    verdict: winner
      ? `${winner.name} wins by ${margin} point${margin === 1 ? '' : 's'} (${top} vs ${bottom}).`
      : `It is a dead heat (${top} each) - pick whichever suits the occasion.`,
    left: { place: left, score: leftScore },
    right: { place: right, score: rightScore },
    reasons: buildReasons(left, right),
    method: SCORING,
  }
}

export const rankPlaces = (places = []) =>
  places
    .map((place) => ({ place, score: scorePlace(place) }))
    .sort(
      (a, b) =>
        b.score.total - a.score.total ||
        (b.place.reviewCount ?? 0) - (a.place.reviewCount ?? 0),
    )

export const compareArea = (places = [], { location, cuisine } = {}) => {
  const ranking = rankPlaces(places)
  const leader = ranking[0]?.place ?? null

  return {
    mode: 'area',
    query: { location, cuisine: cuisine || null },
    winner: ranking[0]
      ? { id: ranking[0].place.id, name: ranking[0].place.name, score: ranking[0].score.total }
      : null,
    verdict: ranking[0]
      ? `${ranking[0].place.name} is the strongest pick in ${location} with ${ranking[0].score.total}/100, based on rating, review volume and price.`
      : `No rated restaurants were found for ${location}. Try a different area or a broader cuisine.`,
    ranking: ranking.map((entry, index) => ({
      rank: index + 1,
      place: entry.place,
      score: entry.score,
      highlights: highlightPlace(entry.place, leader),
    })),
    method: SCORING,
  }
}
