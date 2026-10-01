# CrowdTaste

Restaurant discovery for Bengaluru: live ratings, real diner reviews, photos, an indicative menu with prices,
and a Compare tool that scores two restaurants head to head - or ranks every restaurant in an area.

## Quick start

1. `npm install`
2. `Copy-Item .env.example .env`, then paste your API keys into `.env` (see [Get the API keys](#get-the-api-keys))
3. `npm run dev` and open the printed local URL

Without any keys the app still runs in **sample mode**: search and browsing fall back to the bundled list of 118
Bengaluru restaurants in `src/data.json`, and Compare asks for a key before it scores anything.

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

### 2. Spoonacular Food API - `SPOONACULAR_API_KEY`

Powers the menu section: menu items with estimated prices and dish photos, used as a price guide for the cuisine a
restaurant serves.

1. Open https://spoonacular.com/food-api and click **Get Started** / **Start Now** (free plan: 50 points per day, no
   credit card; the free plan requires a backlink to spoonacular.com, which this app renders automatically).
2. Open the console: https://spoonacular.com/food-api/console
3. Copy the API key and paste it into `.env` as `SPOONACULAR_API_KEY=...`, then restart `npm run dev`.

**Note:** their menu database is mostly US chains and the prices are estimates, so the UI labels the section as an
indicative price guide rather than the venue own menu card. (RapidAPI is an alternative route to a Spoonacular key.)

## How the keys are wired in

Keys are read server-side only. They are **not** prefixed with `VITE_`, so Vite never inlines them into the browser
bundle. A small API layer lives in `server/` and is mounted by `vite.config.js` on both the dev server and the
preview server:

| Endpoint | Purpose | Provider |
| --- | --- | --- |
| `GET /api/live/status` | which keys are configured (UI notices) | - |
| `GET /api/live/search?q=&limit=` | restaurant search, max 20 results | Places Text Search (New) |
| `GET /api/live/place/:id` | full details incl. reviews and hours | Places Place Details (New) |
| `GET /api/live/photo?name=&w=` | streams Google photo media (hides the key) | Places Photo Media |
| `GET /api/live/menu?q=&number=` | menu items with prices + images | Spoonacular `/food/menuItems/search` |
| `GET /api/live/compare?left=&right=&city=` | head-to-head score, verdict and reasons | Places + local scoring |
| `GET /api/live/compare/area?location=&cuisine=` | area leaderboard with the best pick | Places + local scoring |

Caching keeps the request count (and the bill) sane: search 5 minutes, place details 15 minutes, photos 1 day, and menu
items 1 hour - the maximum Spoonacular allows.

Files: `server/placesClient.js` (Google), `server/spoonacular.js` (menus), `server/compare.js` (scoring),
`server/liveDataPlugin.js` (routes). To swap providers, change the client files only.

## How Compare scores restaurants

`score = 50% rating quality + 30% review volume + 20% value for money`

- **Rating quality** - the Google rating out of 5.
- **Review volume** - log-scaled and capped at 3,000 reviews, so a 4.9 from 60 reviews does not beat a 4.6 from 12,000.
- **Value for money** - cheaper price levels score slightly higher; unknown prices stay neutral.

A pair comparison returns the winner, the point margin, the sub-scores and plain-language reasons (higher rating, far
more reviews, lower spend, open right now, different kitchens). The area mode ranks the places Google returns for
`best rated restaurants in <area>` and repeats the methodology on the page.

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

Google Maps Platform requires a "Powered by Google" credit wherever Places data is displayed, and the Spoonacular free
plan requires a link back to spoonacular.com - both are rendered in the UI via `src/components/Attribution.jsx`.

## Tech stack

Vite 7, React 19, Tailwind CSS v4, framer-motion, react-router-dom 7. Design tokens live in `src/theme.js`.

## Other providers you could swap in

- **Yelp Fusion API** - reviews and categories: https://docs.developer.yelp.com/
- **Foursquare Places API** - tips and photos: https://docs.foursquare.com/
- **OpenStreetMap Overpass API** - free, no key, but no ratings or reviews: https://overpass-api.de/