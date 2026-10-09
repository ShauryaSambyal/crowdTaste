// Distance helpers for the realtime location features. The browser already
// knows the diner's position, so distance is computed here rather than sent to
// the server for every result.

const EARTH_RADIUS_KM = 6371

const toRadians = (degrees) => (degrees * Math.PI) / 180

/** Great-circle distance in km between two coordinates, or null if unknown. */
export const distanceKm = (from, to) => {
  if (!from || !to) return null
  const fromLat = Number(from.lat)
  const fromLng = Number(from.lng)
  const toLat = Number(to.lat)
  const toLng = Number(to.lng)
  if (![fromLat, fromLng, toLat, toLng].every((value) => Number.isFinite(value))) return null

  const dLat = toRadians(toLat - fromLat)
  const dLng = toRadians(toLng - fromLng)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(fromLat)) * Math.cos(toRadians(toLat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)))
}

/** "240 m" under a kilometre, "1.4 km" above it. */
export const formatDistance = (km) => {
  if (typeof km !== 'number' || !Number.isFinite(km)) return ''
  if (km < 1) return `${Math.round(km * 1000)} m`
  if (km < 10) return `${km.toFixed(1)} km`
  return `${Math.round(km)} km`
}

/**
 * Wraps the callback-based Geolocation API in a promise.
 *
 * The options timeout is not enough on its own: some browsers and embedded
 * webviews never invoke either callback at all, which would leave the UI stuck
 * on "Locating" forever. A hard watchdog guarantees the promise always settles.
 */
export const currentPosition = ({ timeoutMs = 10000 } = {}) =>
  new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('This browser does not share a location.'))
      return
    }

    let settled = false
    let watchdog
    const finish = (handler, value) => {
      if (settled) return
      settled = true
      clearTimeout(watchdog)
      handler(value)
    }

    watchdog = setTimeout(
      () => finish(reject, new Error('Locating you took too long.')),
      timeoutMs + 1000,
    )

    navigator.geolocation.getCurrentPosition(
      (position) => finish(resolve, { lat: position.coords.latitude, lng: position.coords.longitude }),
      (error) => {
        const message =
          error?.code === 1
            ? 'Location permission was blocked.'
            : error?.code === 3
              ? 'Locating you took too long.'
              : 'Your location could not be determined.'
        finish(reject, new Error(message))
      },
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 60_000 },
    )
  })
