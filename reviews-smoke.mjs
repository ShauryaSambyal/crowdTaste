// Smoke test for the reviews adapter. It stubs the Yelp endpoints, so it runs
// with no key and no network - what it proves is that the match -> reviews
// pipeline and the response normalisation are correct.
//
//   node reviews-smoke.mjs

import { createReviewsProvider, normalizeYelpReview, relativeTimeFrom } from './server/reviewsProvider.js'

const calls = []
const originalFetch = globalThis.fetch

globalThis.fetch = async (url, options = {}) => {
  const parsed = new URL(String(url))
  calls.push({ path: parsed.pathname, params: Object.fromEntries(parsed.searchParams), auth: options.headers?.Authorization })

  if (parsed.pathname === '/v3/businesses/matches') {
    return new Response(
      JSON.stringify({
        businesses: [
          {
            id: 'toit-indiranagar-bengaluru',
            name: 'Toit',
            rating: 4.5,
            review_count: 2187,
            price: '$$',
            url: 'https://www.yelp.com/biz/toit-indiranagar-bengaluru',
            categories: [{ title: 'Pubs' }, { title: 'Breweries' }],
          },
        ],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  }

  if (parsed.pathname === '/v3/businesses/toit-indiranagar-bengaluru/reviews') {
    return new Response(
      JSON.stringify({
        total: 2187,
        reviews: [
          {
            id: 'r1',
            url: 'https://www.yelp.com/biz/toit/review/r1',
            text: 'The wheat beer is the reason to come; get here before 7pm on a Friday.',
            rating: 5,
            time_created: '2025-02-14 19:22:10',
            user: { id: 'u1', name: 'Ananya R', image_url: 'https://example.com/a.jpg', profile_url: 'https://example.com/u1' },
          },
          { id: 'r2', text: '', rating: 4, time_created: '2024-11-02 11:05:00', user: { id: 'u2', name: 'Empty' } },
        ],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  }

  return new Response('{}', { status: 404 })
}

let failures = 0
const check = (label, ok, detail = '') => {
  if (!ok) failures += 1
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  ->  ' + detail : ''}`)
}

try {
  const provider = createReviewsProvider({ apiKey: 'test-key' })
  check('provider reports configured', provider.configured === true)

  const result = await provider.lookup({
    name: 'Toit',
    city: 'Bengaluru',
    lat: 12.9784,
    lng: 77.6408,
  })

  check('matched a business', result.matched === true)
  check('carries the Yelp rating', result.rating === 4.5, String(result.rating))
  check('carries the review count', result.reviewCount === 2187, String(result.reviewCount))
  check('drops blank review text', result.reviews.length === 1, `${result.reviews.length} kept`)
  check('normalises author', result.reviews[0]?.author === 'Ananya R')
  check('normalises photo', result.reviews[0]?.authorPhoto === 'https://example.com/a.jpg')
  check('sends the bearer token', calls[0]?.auth === 'Bearer test-key')
  check('passes latitude to the match call', calls[0]?.params?.latitude === '12.9784', calls[0]?.params?.latitude)
  check('requests the review excerpts', calls[1]?.path.endsWith('/reviews'), calls[1]?.path)

  // Cached: a second lookup must not fan out to the network again.
  const before = calls.length
  await provider.lookup({ name: 'Toit', city: 'Bengaluru' })
  check('caches the match + reviews', calls.length === before, `${calls.length - before} extra calls`)

  check('relative time reads naturally', relativeTimeFrom('2025-02-14 19:22:10', Date.parse('2026-10-09T00:00:00Z')) === '1 year ago')
  check('unknown timestamps stay blank', relativeTimeFrom('', Date.now()) === '')
  check('null-ish review text stays empty', normalizeYelpReview({}).text === '')

  // Without a key the provider must refuse instead of silently returning nada.
  const keyless = createReviewsProvider({ apiKey: '' })
  check('keyless provider reports not configured', keyless.configured === false)
  try {
    await keyless.lookup({ name: 'Toit' })
    check('keyless lookup throws 501', false, 'no error thrown')
  } catch (error) {
    check('keyless lookup throws 501', error.status === 501, `status ${error.status}`)
  }
} finally {
  globalThis.fetch = originalFetch
}

console.log(failures === 0 ? '\nALL CHECKS PASS' : `\n${failures} CHECK(S) FAILED`)
process.exitCode = failures === 0 ? 0 : 1
