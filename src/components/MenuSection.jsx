import { motion } from 'framer-motion'
import { FONT, INK, INK_55, PEACH, bodyText, card, hexToRgba, sectionHeadline } from '../theme'
import Attribution from './Attribution'

const sectionTitle = { ...sectionHeadline, fontSize: 'clamp(1.3rem, 2.4vw, 1.7rem)' }

// Menu section backed by TheMealDB: authentic dish photos for dishes typical of
// a cuisine, with ingredient lists. No prices are invented - that would be fraud.
const MenuSection = ({ items = [], state = 'idle', query = '', problem = null }) => {
  return (
    <section style={{ marginTop: '52px' }} aria-labelledby="menu-heading">
      <h2 id="menu-heading" style={sectionTitle}>
        Dishes for this cuisine
      </h2>
      <p style={{ ...bodyText, marginTop: '10px', fontSize: '13.5px' }}>
        {query
          ? `Typical dishes for ${query} with photos and ingredients - there is no per-venue menu here, so no prices are shown. Only gastronomy, never invention.`
          : 'Typical dishes for this cuisine, with photos and ingredients.'}
      </p>

      {state === 'loading' ? (
        <p role="status" style={{ ...bodyText, marginTop: '18px', fontSize: '13.5px' }}>
          <i className="ri-refresh-line" aria-hidden="true" style={{ marginRight: '8px' }} />
          Looking up typical dishes...
        </p>
      ) : null}

      {state === 'unavailable' ? (
        <div style={{ ...card, marginTop: '18px', padding: '22px 24px' }}>
          <p style={{ ...bodyText, fontSize: '13.5px' }}>
            Dish lookups need the free TheMealDB service. If it is unreachable, check your connection and reload the page.
          </p>
        </div>
      ) : null}

      {state === 'error' ? (
        <p role="alert" style={{ ...bodyText, marginTop: '18px', fontSize: '13.5px' }}>
          {problem?.message} {problem?.hint}
        </p>
      ) : null}

      {state === 'ready' && items.length === 0 ? (
        <p style={{ ...bodyText, marginTop: '18px', fontSize: '13.5px' }}>
          No typical dishes matched this cuisine in the dish database.
        </p>
      ) : null}

      {state === 'loading' ? (
        <div aria-hidden="true" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" style={{ marginTop: '20px' }}>
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              style={{
                height: '168px',
                borderRadius: '18px',
                background: 'rgba(255,214,165,0.55)',
                animation: 'pulse 1.4s ease-in-out infinite',
              }}
            />
          ))}
        </div>
      ) : null}

      {state === 'ready' && items.length > 0 ? (
        <>
          <ul role="list" className="grid list-none gap-4 sm:grid-cols-2 lg:grid-cols-4" style={{ marginTop: '20px' }}>
            {items.map((item, index) => (
              <li key={item.id || index}>
                <motion.article whileHover={{ y: -5 }} style={{ ...card, height: '100%', padding: '12px' }}>
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.title}
                      loading="lazy"
                      style={{
                        display: 'block',
                        width: '100%',
                        height: '132px',
                        objectFit: 'cover',
                        borderRadius: '12px',
                        background: hexToRgba(PEACH, 0.35),
                      }}
                    />
                  ) : null}
                  <h3
                    style={{
                      fontFamily: FONT,
                      fontSize: '14.5px',
                      fontWeight: 600,
                      color: INK,
                      marginTop: '10px',
                    }}
                  >
                    {item.title}
                  </h3>
                  <p style={{ ...bodyText, marginTop: '6px', fontSize: '12.5px' }}>
                    {item.chain ? <span>{item.chain}</span> : null}
                  </p>
                  {Array.isArray(item.ingredients) && item.ingredients.length > 0 ? (
                    <ul
                      role="list"
                      aria-label={`Ingredients of ${item.title}`}
                      className="flex list-none flex-wrap gap-1"
                      style={{ marginTop: '8px' }}
                    >
                      {item.ingredients.slice(0, 6).map((ingredient) => (
                        <li
                          key={ingredient}
                          style={{
                            padding: '2px 8px',
                            borderRadius: '999px',
                            background: hexToRgba(PEACH, 0.45),
                            fontFamily: FONT,
                            fontSize: '11px',
                            fontWeight: 500,
                            color: INK_55,
                          }}
                        >
                          {ingredient}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </motion.article>
              </li>
            ))}
          </ul>
          <Attribution meals />
        </>
      ) : null}

      {state === 'idle' ? (
        <p style={{ ...bodyText, marginTop: '18px', fontSize: '13.5px', color: INK_55 }}>
          Dish lookups run after the restaurant details have loaded.
        </p>
      ) : null}
    </section>
  )
}

export default MenuSection