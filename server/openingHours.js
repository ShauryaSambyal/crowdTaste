// Minimal, honest parser for OpenStreetMap `opening_hours` values.
//
// It understands the common restaurant shapes and returns null (unknown) for
// anything it cannot parse with confidence - never a guess:
//
//   "24/7"
//   "Mo-Su 11:00-23:00"
//   "Mo-Sa 11:00-15:00,18:00-23:00"
//   "Mo-Fr 09:00-17:00; Sa 10:00-14:00"
//   "Mo,We,Fr 10:00-18:00"
//   "Fr,Sa 18:00-02:00" (crossing midnight)
//
// Assumption: opening_hours is local time for the venue, and we evaluate it
// against the machine's local clock. For a local-first city guide (the app
// targets Bengaluru) that matches reality; a venue in another timezone would
// need a real timezone argument.

const DAY_INDEX = { Su: 0, Mo: 1, Tu: 2, We: 3, Th: 4, Fr: 5, Sa: 6 }
const DAY_ORDER = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

const toMinutes = (raw) => {
  const match = /^(\d{1,2}):?(\d{2})$/.exec(String(raw).trim())
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 24 || minutes > 59) return null
  return hours * 60 + minutes
}

// "Mo-Su" | "Mo,We" | "Mo" -> Set of day indexes, or null when unparseable.
const parseDays = (spec) => {
  const days = new Set()
  for (const part of spec.split(',')) {
    const chunk = part.trim()
    if (!chunk) continue
    const range = /^([A-Za-z]{2})-([A-Za-z]{2})$/.exec(chunk)
    if (range) {
      const start = DAY_INDEX[range[1]]
      const end = DAY_INDEX[range[2]]
      if (start === undefined || end === undefined) return null
      let cursor = start
      for (let step = 0; step < 7; step += 1) {
        days.add(cursor)
        if (cursor === end) break
        cursor = (cursor + 1) % 7
      }
      continue
    }
    const single = DAY_INDEX[chunk]
    if (single === undefined) return null
    days.add(single)
  }
  return days.size > 0 ? days : null
}

// "11:00-23:00,18:00-23:30" -> [{ start, end }] in minutes
const parseRanges = (spec) => {
  const ranges = []
  for (const part of spec.split(',')) {
    const match = /^(\d{1,2}:?\d{2})\s*-\s*(\d{1,2}:?\d{2})$/.exec(part.trim())
    if (!match) return null
    const start = toMinutes(match[1])
    const end = toMinutes(match[2])
    if (start === null || end === null) return null
    ranges.push({ start, end })
  }
  return ranges.length > 0 ? ranges : null
}

// Splits "Mo-Su 11:00-23:00" into days + ranges. Bare time ranges apply to
// every day; day-only rules are treated as "open all day" on those days.
const parseRule = (raw) => {
  const text = raw.trim()
  if (!text) return null
  const parts = text.split(/\s+/)
  let days = null
  let ranges = null

  for (const part of parts) {
    if (/^(off|closed)$/i.test(part)) return { closed: true }
    // A day spec is letters only ("Mo", "Mo,We,Fr", "Mo-Su"); anything with a
    // digit is a time range.
    if (!/\d/.test(part) && /^[A-Za-z]/.test(part)) {
      const parsed = parseDays(part)
      if (parsed) {
        days = parsed
        continue
      }
    }
    const parsedRanges = parseRanges(part)
    if (parsedRanges) {
      ranges = parsedRanges
      continue
    }
    // Public-holiday or comment qualifiers we do not model: unknown, not wrong.
    if (/^(PH|SH|week|comment)/i.test(part)) return null
  }

  if (!days && !ranges) return null
  return { days: days ?? new Set([0, 1, 2, 3, 4, 5, 6]), ranges }
}

/**
 * @param {string|undefined|null} spec raw opening_hours value
 * @param {Date} [now] clock to evaluate (defaults to the machine's local time)
 * @returns {boolean|null} true = open, false = closed, null = unknown
 */
export const isOpenNow = (spec, now = new Date()) => {
  const value = String(spec ?? '').trim()
  if (!value) return null
  if (/^24\/7$/.test(value)) return true

  const day = now.getDay()
  const previousDay = (day + 6) % 7
  const minutes = now.getHours() * 60 + now.getMinutes()

  let parsedAny = false

  for (const ruleText of value.split(';')) {
    const rule = parseRule(ruleText)
    if (!rule) continue
    parsedAny = true
    if (rule.closed) continue

    // Whole-day rule ("Mo,We,Fr"): open all day on those days.
    if (!rule.ranges) {
      if (rule.days.has(day)) return true
      continue
    }

    for (const range of rule.ranges) {
      if (range.end > range.start) {
        // Same-day window, e.g. 11:00-23:00
        if (rule.days.has(day) && minutes >= range.start && minutes < range.end) return true
      } else {
        // Window that crosses midnight, e.g. Fr 18:00-02:00. The late half
        // belongs to the previous day's rule.
        if (rule.days.has(day) && minutes >= range.start) return true
        if (rule.days.has(previousDay) && minutes < range.end) return true
      }
    }
  }

  if (!parsedAny) return null
  // Every rule parsed cleanly, and none of them covers "now" - so the venue is
  // closed. That is what a sparse spec like "Mo-Fr 09:00-17:00" means on a
  // Sunday, and what an explicit weekday rule means outside its hours.
  return false
}

export const describeHours = (spec) => String(spec ?? '').trim() || null
