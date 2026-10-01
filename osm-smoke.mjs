import { createOsmProvider } from './server/osmProvider.js'
import { createMealsProvider } from './server/mealsProvider.js'
import { keylessPairCompare, keylessAreaCompare, featureScore } from './server/keylessRank.js'

const osm = createOsmProvider({ timeoutMs: 20000 })
const meals = createMealsProvider({ timeoutMs: 20000 })

console.log('--- OSM search: Toit Bengaluru ---')
const search = await osm.searchPlaces({ query: 'Toit Bengaluru', limit: 5 })
search.results.forEach((p) => console.log('*', p.name, '|', p.id, '|', p.cuisines.join('/'), '| photos:', p.photos.length, p.photos[0] ? '| img:' + String(p.photos[0].name).slice(0, 80) : ''))
console.log('notice:', search.notice)

console.log('--- OSM detail: first hit ---')
if (search.results[0]) {
  const [kind, id] = search.results[0].id.replace('osm:', '').split('/')
  const detail = await osm.getPlace(kind, id)
  console.log('name:', detail.name, '| address:', detail.address.slice(0, 90))
  console.log('hours:', detail.hours.join(' | ').slice(0, 120), '| menu:', detail.menuUrl, '| phone:', detail.contacts.phone, '| tags:', detail.tags.join(', ').slice(0, 120))
}

console.log('--- OSM geocode: Indiranagar, Bengaluru ---')
const area = await osm.geocodeArea('Indiranagar, Bengaluru')
console.log('label:', area.label, '| areaId:', area.areaId || 'none', '| bbox:', [area.south, area.west, area.north, area.east].join(','))

console.log('--- TheMealDB: biryani dishes ---')
const dishes = await meals.searchDishes({ query: 'biryani', limit: 5 })
dishes.items.forEach((d) => console.log('*', d.title, '|', d.chain, '| img:', String(d.image).slice(0, 70)))

console.log('--- Keyless scoring ---')
if (search.results[1]) {
  const pair = keylessPairCompare(search.results[0], search.results[1], {})
  console.log('verdict:', pair.verdict)
  pair.reasons.slice(0, 3).forEach((r) => console.log(' -', r.text))
  const ranking = keylessAreaCompare(search.results.slice(0, 4), { location: 'Bengaluru', cuisine: 'pub' })
  console.log('area verdict:', ranking.verdict)
  console.log('scores:', ranking.ranking.map((e) => e.place.name + '=' + e.score.total).join(' | '))
  console.log('features sample:', JSON.stringify(featureScore(search.results[0])))
}
