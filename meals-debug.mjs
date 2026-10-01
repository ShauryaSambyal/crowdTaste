import { createMealsProvider } from './server/mealsProvider.js'
const meals = createMealsProvider({ timeoutMs: 20000 })
const out = await meals.searchDishes({ query: 'South Indian', limit: 4 })
console.log('count:', out.items.length)
console.log('first title:', out.items[0] && out.items[0].title)
console.log('first image:', out.items[0] && String(out.items[0].image).slice(0, 80))
console.log('first ingredients:', (out.items[0] && out.items[0].ingredients.slice(0, 5).join(', ')) || 'none')
