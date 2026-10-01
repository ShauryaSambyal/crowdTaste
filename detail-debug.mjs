import { createOsmProvider } from './server/osmProvider.js'
const osm = createOsmProvider({ timeoutMs: 20000 })
const search = await osm.searchPlaces({ query: 'Toit Bengaluru', limit: 5 })
const [kind, id] = search.results[0].id.replace('osm:', '').split('/')
const hint = search.results[0].searchHint
const detail = await osm.getPlace(kind, id, hint || {})
console.log('name:', detail.name)
console.log('address:', JSON.stringify(detail.address).slice(0, 170))
console.log('hours:', detail.hours.join(' | ').slice(0, 160))
console.log('menu:', detail.menuUrl, '| phone:', detail.contacts.phone, '| site:', detail.contacts.website)
console.log('tags:', detail.tags.join(', ').slice(0, 160))
console.log('photos:', detail.photos.length, String(detail.photos[0] && detail.photos[0].name).slice(0, 90))
