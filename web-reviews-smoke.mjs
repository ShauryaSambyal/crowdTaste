// Smoke check for the keyless web reviews provider. It hits the real public
// search endpoint (no key needed), so it needs network access. Run:
//   node web-reviews-smoke.mjs
import {
  cleanTitle,
  createWebReviewsProvider,
  isBoilerplate,
  isTableNoise,
  parseRating,
  parseReviewCount,
  parseResults,
  trimChrome,
} from './server/webReviewsProvider.js'

let failures = 0
const check = (label, condition, detail = '') => {
  if (condition) {
    console.log(`  ok   ${label}`)
  } else {
    failures += 1
    console.log(`  FAIL ${label}${detail ? ` -> ${detail}` : ''}`)
  }
}

console.log('--- rating parser ---')
check('"rated 4.3 of 5 on Tripadvisor" -> 4.3', parseRating('See 2,168 unbiased reviews, rated 4.3 of 5 on Tripadvisor') === 4.3)
check('"Rated 4.5/5 from 84,800+" -> 4.5', parseRating('Rated 4.5/5 from 84,800+ diners') === 4.5)
check('"rated 5 out of 5 on Restaurant Guru" -> 5', parseRating('rated 5 out of 5 on Restaurant Guru: 103618') === 5)
check('"ranked #88 of 5,400 restaurants" -> null', parseRating('ranked #88 of 5,400 restaurants in Bengaluru') === null)
check('"top 5 places" -> null', parseRating('top 5 places to eat') === null)
check('"4.7 stars" -> 4.7', parseRating('a solid 4.7 stars from locals') === 4.7)
check(
  '"average rating of 4.2" -> 4.2',
  parseRating('Sable Cafe in Indiranagar currently holds an average rating of 4.2 based on user reviews') === 4.2,
  String(parseRating('currently holds an average rating of 4.2 based on user reviews')),
)
check('"a 4.4-star rating" -> 4.4', parseRating('known for its rooftop seating with a 4.4-star rating') === 4.4)
check(
  'the specific form still wins over the loose one',
  parseRating('rated 4.3 of 5 from 84,800 reviews, average rating of 4.9') === 4.3,
)

console.log('--- review count parser ---')
check('"2,168 unbiased reviews" -> 2168', parseReviewCount('See 2,168 unbiased reviews of Toit') === 2168)
check('"from 84,800+" -> 84800', parseReviewCount('Rated 4.5/5 from 84,800+') === 84800)
check('"4,275 restaurants" -> null', parseReviewCount('ranked #88 of 4,275 restaurants') === null)

console.log('--- boilerplate filter ---')
check('directory blurb is boilerplate', isBoilerplate('See 2,168 unbiased reviews of Toit Brewpub, rated 4.3 of 5 on Tripadvisor') === true)
check('opinion is not boilerplate', isBoilerplate('Legendary craft brewery, great beer but the wait on weekends is brutal') === false)
check('reddit chrome is boilerplate', isBoilerplate('Locked post. New comments cannot be posted.') === true)
check(
  'listing filter table is detected',
  isTableNoise(
    'Truffles restaurants in Bengaluru 3 restaurants 3 restaurants Rating Rating Distance Distance/ rating Popularity Michelin',
  ) === true,
)
check(
  'real prose is not mistaken for a table',
  isTableNoise(
    'Bangalore legendary craft brewery in Indiranagar, famous for house-brewed beers and wood-fired sourdough pizzas with a relaxed rooftop',
  ) === false,
)
check(
  'repetitive but genuine review is not mistaken for a table',
  isTableNoise(
    'great food great service great place really great price and great staff great ambience and great beers here',
  ) === false,
)
check(
  'reddit title loses both stacked suffixes',
  cleanTitle('Toit, Indiranagar is overrated? : r/bangalore - Reddit', 'reddit.com') ===
    'Toit, Indiranagar is overrated?',
  cleanTitle('Toit, Indiranagar is overrated? : r/bangalore - Reddit', 'reddit.com'),
)
check(
  'a non-reddit title is left alone',
  cleanTitle('Toit, Indiranagar — Menu, Prices & Reviews', 'explorebangalore.com') ===
    'Toit, Indiranagar — Menu, Prices & Reviews',
)
check(
  'reddit chrome is trimmed off an excerpt',
  trimChrome('Just wondering what the crowd favourite is? Locked post. New comments cannot be posted. Add a Comment TOPICS Gaming') ===
    'Just wondering what the crowd favourite is?',
  trimChrome('Just wondering what the crowd favourite is? Locked post. New comments cannot be posted. Add a Comment TOPICS Gaming'),
)

console.log('--- html parser ---')
const sampleHtml = `
<div class="result results_links results_links_deep web-result">
  <div class="links_main links_deep result__body">
    <h2 class="result__title">
      <a rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fwww.tripadvisor.in%2FRestaurant_Review-d1.html&amp;rut=abc">TOIT BREWPUB, Bengaluru - Reviews</a>
    </h2>
    <a class="result__snippet" href="//duckduckgo.com/l/?uddg=x"><b>Toit</b> Brewpub: See 2,168 unbiased <b>reviews</b>, rated 4.3 of 5 on Tripadvisor.</a>
    <div class="clear"></div>
  </div>
</div>`
// A page title saying "2026 Reviews" must not become a review count: the
// numbers come from the description, not from the title.
const [yearTitle] = parseResults(`
<div class="result results_links web-result">
  <h2 class="result__title"><a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fwww.tripadvisor.in%2FCafe.html">CAFE NOIR, Bengaluru - 2026 Reviews &amp; Information - Tripadvisor</a></h2>
  <a class="result__snippet" href="//duckduckgo.com/l/?uddg=x">Cafe Noir, Bengaluru: See 21 unbiased reviews of Cafe Noir, rated 3.0 of 5 on Tripadvisor and ranked #3,859 of 11,600 restaurants.</a>
</div>`)
check('title year is not read as a review count', yearTitle?.reviewCount === 21, String(yearTitle?.reviewCount))
check('snippet rating still wins', yearTitle?.rating === 3, String(yearTitle?.rating))

const [parsed] = parseResults(sampleHtml)
check('parses one result', Boolean(parsed), JSON.stringify(parsed))
check('unwraps the redirect url', parsed?.url === 'https://www.tripadvisor.in/Restaurant_Review-d1.html', parsed?.url)
check('labels the source', parsed?.source === 'Tripadvisor', parsed?.source)
check('reads the rating off the snippet', parsed?.rating === 4.3, String(parsed?.rating))
check('reads the review count', parsed?.reviewCount === 2168, String(parsed?.reviewCount))

console.log('--- live lookups (real network) ---')
const provider = createWebReviewsProvider({ timeoutMs: 15000, minGapMs: 1500 })
// Ratings are only ever taken from a recognised review platform, so a blog
// repeating someone else's figure cannot become the headline number.
const PLATFORMS = new Set(['Tripadvisor', 'Google', 'Yelp', 'Zomato', 'Restaurant Guru', 'EazyDiner', 'Dineout', 'Swiggy'])
const venues = [
  { name: 'Toit', city: 'Bengaluru' },
  { name: 'MTR', city: 'Bengaluru', address: 'Lalbagh Road, Bengaluru' },
  { name: 'Truffles', city: 'Bengaluru' },
]
for (const venue of venues) {
  try {
    const out = await provider.lookup(venue, { limit: 4 })
    console.log(
      `\n* ${venue.name}: rating=${out.rating} (${out.ratingSource ?? 'none'}) count=${out.reviewCount} excerpts=${out.reviews.length} links=${out.links.length}`,
    )
    out.reviews.slice(0, 4).forEach((review) => console.log(`    [${review.source}] ${review.text.slice(0, 120)}`))

    const chrome = out.reviews.find(
      (review) => /locked post|add a comment|topics|best-of categories/i.test(review.text) || isTableNoise(review.text),
    )
    check(`${venue.name}: no forum or directory chrome in excerpts`, !chrome, chrome?.text)

    const trustpilot = out.reviews.find((review) => /trustpilot/i.test(review.source))
    check(`${venue.name}: no unrelated-company result (Trustpilot TOIT Training)`, !trustpilot, trustpilot?.text)

    // "Toit" is also an ESP32 programming language and these are real
    // restaurants, so the chip must never surface the language.
    const offTopic = out.reviews.find((review) => /esp32|\.js|programming language|github/i.test(review.text))
    check(`${venue.name}: no off-topic homonym in excerpts`, !offTopic, offTopic?.text)

    if (out.rating !== null) {
      check(`${venue.name}: rating comes from a review platform`, PLATFORMS.has(out.ratingSource), out.ratingSource)
    }
    if (out.rating === null && out.reviews.length === 0) {
      failures += 1
      console.log('  FAIL no rating and no excerpt found')
    }
  } catch (error) {
    failures += 1
    console.log(`\n* ${venue.name}: FAILED -> ${error.message} (${error.status ?? '?'})`)
  }
}

console.log(`\n${failures === 0 ? 'ALL CHECKS PASS' : `${failures} CHECK(S) FAILED`}`)
process.exit(failures === 0 ? 0 : 1)
