// Ingredient quantity helpers: simple people-count-proportional scaling and
// friendly Japanese-style formatting (e.g. 0.5 → "1/2").

const FRACTIONS = [
  [1 / 4, '1/4'],
  [1 / 3, '1/3'],
  [1 / 2, '1/2'],
  [2 / 3, '2/3'],
  [3 / 4, '3/4'],
]
const EPSILON = 0.02

/** Scale a base quantity (recorded for `basePeople`) to `targetPeople`. */
export function scaleQuantity(quantity, basePeople, targetPeople) {
  if (quantity === null || quantity === undefined) return null
  if (!basePeople || basePeople <= 0) return quantity
  return (quantity / basePeople) * targetPeople
}

/** Turn a number into a friendly Japanese quantity string, e.g. 1.5 -> "1.5", 0.5 -> "1/2". */
export function formatNumber(n) {
  if (n === null || n === undefined) return ''
  const whole = Math.floor(n)
  const frac = n - whole

  if (frac < EPSILON) {
    return String(whole === 0 && n > 0 ? roundClean(n) : whole)
  }
  if (frac > 1 - EPSILON) {
    return String(whole + 1)
  }

  for (const [value, label] of FRACTIONS) {
    if (Math.abs(frac - value) < EPSILON) {
      return whole > 0 ? `${whole} ${label}` : label
    }
  }
  return String(roundClean(n))
}

function roundClean(n) {
  return Math.round(n * 100) / 100
}

/** Full display string for an ingredient line, respecting non-scalable text like "適量". */
export function formatQuantityLine({ quantity, unit, displayText }) {
  if (displayText && (quantity === null || quantity === undefined)) return displayText
  if (quantity === null || quantity === undefined) return displayText || ''
  return `${formatNumber(quantity)}${unit || ''}`
}

/**
 * Merge a flat list of { name, unit, quantity, displayText, menuName } lines
 * into aggregated shopping-list lines, summing quantities that share the
 * same name + unit. Lines without a numeric quantity (e.g. "適量") are kept
 * distinct per name, appearing once with their text preserved.
 */
export function mergeIngredientLines(lines) {
  const byKey = new Map()

  for (const line of lines) {
    const numeric = typeof line.quantity === 'number' && !Number.isNaN(line.quantity)
    const key = numeric ? `${line.name}::${line.unit || ''}` : `${line.name}::text`

    if (!byKey.has(key)) {
      byKey.set(key, {
        name: line.name,
        unit: numeric ? (line.unit || '') : '',
        quantity: numeric ? line.quantity : null,
        displayText: numeric ? null : (line.displayText || null),
        menuNames: line.menuName ? [line.menuName] : [],
      })
    } else {
      const existing = byKey.get(key)
      if (numeric) existing.quantity += line.quantity
      if (line.menuName && !existing.menuNames.includes(line.menuName)) {
        existing.menuNames.push(line.menuName)
      }
    }
  }

  return Array.from(byKey.values())
}
