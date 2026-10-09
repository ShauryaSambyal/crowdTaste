import { useEffect } from 'react'
import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import HowItWorks from './components/HowItWorks'
import Footer from './components/Footer'
import About from './components/About'
import { FONT, GREEN, INDIGO, INK, INK_70, hexToRgba } from './theme'
import Discover from './pages/Discover'
import Compare from './pages/Compare'
import RestaurantDetail from './pages/RestaurantDetail'

// Scrolls to in-page anchors (for example /#how) and back to the top on navigation.
const ScrollToHash = () => {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    try {
      const target = document.querySelector(hash)
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    } catch {
      window.scrollTo({ top: 0 })
    }
  }, [pathname, hash])

  return null
}

const NotFound = () => (
  <div
    className="flex items-center justify-center"
    style={{ position: 'relative', zIndex: 10, minHeight: '70svh', padding: '150px 24px 96px', textAlign: 'center' }}
  >
    <div>
      <h1
        style={{
          margin: 0,
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: 'clamp(1.6rem, 3vw, 2.2rem)',
          letterSpacing: '-0.03em',
          color: INK,
        }}
      >
        Page not found
      </h1>
      <p style={{ marginTop: '12px', fontFamily: FONT, fontSize: '14px', fontWeight: 500, color: INK_70 }}>
        That page does not exist. Try Discover to search restaurants, or Compare to settle an argument.
      </p>
      <p style={{ marginTop: '20px' }}>
        <Link
          to="/discover"
          style={{
            fontFamily: FONT,
            fontSize: '14px',
            fontWeight: 600,
            color: INK,
          }}
        >
          Go to Discover
        </Link>
      </p>
    </div>
  </div>
)

const App = () => {
  return (
    <BrowserRouter>
      <ScrollToHash />

      {/* Warm misty wash over the dot grid, keeping the indigo ink legible */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          background: [
            'radial-gradient(ellipse 80% 55% at 50% -10%, rgba(248,231,201,0.95) 0%, rgba(248,231,201,0.45) 45%, rgba(248,231,201,0) 74%)',
            `radial-gradient(ellipse 60% 45% at 92% 104%, ${hexToRgba(INDIGO, 0.07)} 0%, ${hexToRgba(INDIGO, 0)} 70%)`,
            `radial-gradient(ellipse 50% 40% at 4% 72%, ${hexToRgba(GREEN, 0.06)} 0%, ${hexToRgba(GREEN, 0)} 70%)`,
          ].join(', '),
        }}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          minHeight: '100svh',
        }}
      >
        <Navbar />

        <main style={{ flex: 1 }}>
          <Routes>
            <Route
              path="/"
              element={
                <>
                  <Hero />
                  <HowItWorks />
                </>
              }
            />
            <Route path="/discover" element={<Discover />} />
            <Route path="/compare" element={<Compare />} />
            <Route path="/about" element={<About />} />
            <Route path="/restaurant/:id" element={<RestaurantDetail />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>

        <Footer />
      </div>
    </BrowserRouter>
  )
}

export default App