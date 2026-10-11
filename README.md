# CrowdTaste

Restaurant discovery for Bengaluru: live venues, realtime opening hours, real photos, diner reviews and a Compare
tool that scores two restaurants head to head - or ranks every restaurant in an area.

It runs with **no API keys at all**: venues, opening hours, contact details and photos come from OpenStreetMap,
Nominatim, Overpass and Wikimedia Commons, dish photos from TheMealDB, and ratings and review excerpts are gathered
from the public review sites and forums that publish them. One optional key upgrades the reviews to licensed Yelp
text.

## Quick start

1. `npm install`
2. `npm run dev` and open the printed local URL - that is the whole setup; nothing is required in `.env`
3. Optionally copy `.env.example` to `.env` and add keys (see [Get the API keys](#get-the-api-keys))

With no keys you get live OpenStreetMap venues, realtime open/closed, distance-ranked Nearby results, photos,
ratings, review excerpts and Compare. The bundled list of 118 Bengaluru restaurants in `src/data.json` remains as an
offline fallback when the public map services cannot be reached.

## Get the API keys

### 1. Google Places API (New) - `GOOGLE_PLACES_API_KEY`

Powers restaurant search and details: names, addresses, ratings, review counts, up to five written diner reviews per
place, opening hours, phone, website and photos of the food and the venue.

1. Open the Google Cloud Console: https://console.cloud.google.com/
2. Create or select a project.
3. Go to **APIs & Services -> Library**, search for **Places API (New)** and click **Enable**.
4. Go to **Billing** and link a billing account (a payment method is required; there is a monthly free allowance).
5. Go to **APIs & Services -> Credentials -> Create credentials -> API key**, copy the key.
6. Paste it into `.env` as `GOOGLE_PLACES_API_KEY=...` and restart `npm run dev`.

Optional hardening: edit the key and restrict it to **Places API (New)** only. The key is only used server-side here,
so an IP restriction to your machine also works and keeps browser users from ever seeing it.

**Cost:** Google bills per request by SKU tier (Essentials, Pro, Enterprise) and grants a monthly free allowance per
SKU - India-specific pricing has higher allowances. Ratings, review counts and written reviews sit in the higher tiers,
so a search that returns ratings costs more than a bare lookup. Check the current pricing before heavy use.

### 2. Yelp Fusion - `YELP_API_KEY` (optional, nothing is locked behind it)

Ratings and reviews already work without any key - see [How reviews work](#how-reviews-work). This key only changes
*whose* review text is shown, from quoted public sources to licensed Yelp excerpts for mapped venues.

1. Open https://docs.developer.yelp.com/docs/places-intro and create an app in the developer portal.
2. Copy the API key and paste it into `.env` as `YELP_API_KEY=...`, then restart `npm run dev`.
3. A venue card then matches its Yelp listing and shows up to three review excerpts, a rating and a review count.
   When Yelp has nothing for that venue, the keyless web provider fills the gap, so no card is ever blank.

**Cost warning, checked 2026:** Yelp ended its free tier in 2024, and Foursquare's tips, ratings and photos sit
behind paid *Premium* endpoints. Nothing in this app is gated behind either.

## How the keys are wired in

Keys are read server-side only. They are **not** prefixed with `VITE_`, so Vite never inlines them into the browser
bundle. A small API layer lives in `server/` and is mounted by `vite.config.js` on both the dev server and the
preview server:

| Endpoint | Purpose | Provider |
| --- | --- | --- |
| `GET /api/live/status` | which sources are configured | - |
| `GET /api/live/search?q=&limit=` | restaurant search by name, dish, cuisine or area | Nominatim (or Google) |
| `GET /api/live/nearby?lat=&lng=&radius=&cuisine=` | **realtime**: what is around a position, closest first | Nominatim bounded viewbox, Overpass `around` as fallback |
| `GET /api/live/place/:id` | full details incl. hours, contacts and photos | Nominatim + Overpass (or Google) |
| `GET /api/live/photo?name=&w=` | streams Google photo media (hides the key) | Places Photo Media |
| `GET /api/live/dishes?q=&number=` | dish photos + ingredients for a cuisine | TheMealDB |
| `GET /api/live/reviews?name=&city=&lat=&lng=` | published rating, review count and review excerpts | Yelp Fusion when keyed, otherwise the keyless web provider |
| `GET /api/live/compare?left=&right=&city=` | head-to-head score, verdict and reasons | local scoring |
| `GET /api/live/compare/area?location=&cuisine=` | area leaderboard with the best pick | local scoring |

Caching keeps the request count sane: search and nearby 5 minutes, place details 15 minutes, reviews 30 minutes,
dish photos 1 hour. Nominatim is throttled to one request per second as its usage policy requires.

Files: `server/osmProvider.js` (OpenStreetMap: search, nearby, details, photos), `server/openingHours.js` (the
`opening_hours` parser behind realtime open/closed), `server/reviewsProvider.js` (Yelp),
`server/webReviewsProvider.js` (keyless ratings and review excerpts), `server/placesClient.js` (optional Google),
`server/mealsProvider.js` (TheMealDB), `server/compare.js` and `server/keylessRank.js` (scoring),
`server/liveDataPlugin.js` (routes). To swap providers, change the client files only.

### Realtime behaviour

- **Location**: the browser's Geolocation API supplies the diner's coordinates on request; the server never sees
  them until the Nearby button is pressed. Distances are straight-line and computed in the browser.
- **Open now**: computed from each venue's own `opening_hours` tag against the clock. The parser handles the common
  shapes (`24/7`, `Mo-Su 11:00-23:00`, day lists, multiple ranges, ranges crossing midnight) and reports *unknown*
  rather than guessing for anything it cannot parse.
- **Map reliability**: public Overpass mirrors regularly return 504 under load, so queries fail over across mirrors
  and remember whichever answered. Mirror lists must stay planet-wide - regional extracts silently return zero rows.
- **Resilience**: the nearby lookup uses a reliable bounded Nominatim viewbox first and only falls back to Overpass
  `around` when it finds nothing. The geolocation promise has a hard watchdog, so the UI never sticks on "Locating".

## How reviews work

OpenStreetMap carries no ratings or reviews of its own, and every mainstream review API charges for them, so the
keyless path in `server/webReviewsProvider.js` reads what the web already publishes:

- **The rating** is one real figure from one named platform - `4.3/5, Tripadvisor` - never an average the app
  invented. Only recognised review platforms are eligible to supply it, so a blog repeating someone else's number
  cannot become the headline rating under the blog's name.
- **The excerpts** are quoted verbatim from Reddit threads, review sites and food blogs, each one linked back to the
  page it came from. The venue's own website is excluded: that is marketing copy, not a review.
- **Nothing is generated.** If a venue has no coverage anywhere, the card says so instead of inventing a rating.

Getting from a restaurant name to that data needs real filtering, because names collide: "Toit" is also an ESP32
programming language, "Truffles" is also a chocolate, and "TOIT Training LLC" is a different company on Trustpilot.
A result has to match the venue's name *and* be anchored to food, either by naming the area or by talking about eating
and drinking. Listing pages, forum chrome and filter tables are dropped, and at most two excerpts per source are shown
so one chatty blog cannot fill the page.

The source is DuckDuckGo's no-JavaScript HTML endpoint - the one search surface that answers a plain GET with no key,
token or card. It deserves the same care as any other rate-limited public service: requests are serialised with a gap
between them, results are cached for 30 minutes, and a throttle returns an empty card plus a notice rather than a wall
of errors.

`node web-reviews-smoke.mjs` proves the parsers (rating, review count, redirect unwrapping, boilerplate and
homonym filtering) and runs three live lookups against real network data. `node reviews-smoke.mjs` covers the Yelp
path against a stubbed API.

## How Compare scores restaurants

`score = 50% rating quality + 30% review volume + 20% value for money`

- **Rating quality** - the Google rating out of 5.
- **Review volume** - log-scaled and capped at 3,000 reviews, so a 4.9 from 60 reviews does not beat a 4.6 from 12,000.
- **Value for money** - cheaper price levels score slightly higher; unknown prices stay neutral.

A pair comparison returns the winner, the point margin, the sub-scores and plain-language reasons (higher rating, far
more reviews, lower spend, open right now, different kitchens). The area mode ranks the places Google returns for
`best rated restaurants in <area>` and repeats the methodology on the page.

**Without a Google key** the app does not pretend to rank taste. `server/keylessRank.js` scores what OpenStreetMap
actually knows - cuisine listed 22%, opening hours 18%, phone or website 16%, menu link 14%, listing richness 16%,
photos 14% - and every verdict says out loud that it is ranking how complete a listing is, not how good the food is.

## Routes

| Route | What it is |
| --- | --- |
| `/` | Hero + how it works (no search bar) |
| `/discover` | Semantic search: name, dish, cuisine or area, with filters and sorting |
| `/compare` | Two restaurants head to head, or the best restaurant in an area |
| `/restaurant/:id` | Live detail card: rating, reviews, hours, menu guide, photos |
| `/about` | How it works, data sources and key setup |

The search query lives in the URL (`/discover?q=biryani+in+jayanagar`) and compare results are shareable too, so links
survive a refresh and the back button.

## Accessibility and semantics

The search is a real `role="search"` form with a visually hidden label, hint text, a polite live region for result
counts, a `fieldset` with a legend for filters (real checkbox inputs), a labelled sort `select`, and results marked up as
`ul`/`li`/`article` with `h3` headings. Ratings expose the value and review count to screen readers, the compare mode
switch is a native radio group, and verdict metrics are a real `table`. Keyboard focus is always visible.

## Attribution

OpenStreetMap asks to credit its contributors (ODbL) wherever its data is shown, Wikimedia Commons images carry
per-file attribution, TheMealDB asks for a mention, Google requires "Powered by Google", and Yelp requires
"Powered by Yelp" for its content. Quoted ratings and review excerpts keep their own source name and link on every
card. `src/components/Attribution.jsx` renders exactly the set in use on each screen.

## Tech stack

Vite 7, React 19, Tailwind CSS v4, framer-motion, react-router-dom 7.

Design tokens live in `src/theme.js` and are the single source of truth for the palette and typography:

| Token | Hex | Role |
| --- | --- | --- |
| `INDIGO` | `#3A0CA3` | headings and body ink |
| `VIOLET` | `#6A00F4` | primary actions, links, focus ring |
| `GREEN` | `#064E3B` | success, "open now" |
| `YELLOW` | `#FFF275` | page surface |
| `CREAM` | `#F8E7C9` | inset surfaces, quiet pills |
| `PEACH` | `#FFD6A5` | highlight chips, rating pills, borders, hover rows |

The page sits on `YELLOW`, so anything that has to stand out from the surface - the eyebrow chips, the rating badges -
is built from `PEACH` or `CREAM` instead. Two yellows would merge.

Everything is set in **Bricolage Grotesque** (variable, 200-800) with weights chosen per role: 800 display, 700
headlines, 600 buttons and subheads, 500 body, 400 fine print. The sort menu is a custom accessible listbox
(`src/components/SortDropdown.jsx`) rather than a native `<select>`, so it matches the rest of the interface.

## Other providers you could swap in

- **Yelp Fusion API** - reviews and categories: https://docs.developer.yelp.com/
- **Foursquare Places API** - tips and photos: https://docs.foursquare.com/
- **OpenStreetMap Overpass API** - free, no key, but no ratings or reviews: https://overpass-api.de/