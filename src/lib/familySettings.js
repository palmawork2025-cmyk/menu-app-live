// families.category_order (jsonb) holds the menu-category order as an array
// of strings. To add family-shared shopping settings WITHOUT a database
// migration, we append one extra object element to that same array:
//
//   ["肉", "魚", ..., { "__grocery": { sections, overrides, amounts } }]
//
// - sections:  store-walk order of 売り場 names (user editable)
// - overrides: { 食材名: 売り場名 } chosen by the user
// - amounts:   { 食材名: { quantity, unit, displayText } } last amount used
//
// Older app versions only look at string elements, so this stays compatible.

const GROCERY_KEY = '__grocery'

export function splitCategoryOrder(raw) {
  const list = Array.isArray(raw) ? raw : []
  const categoryOrder = list.filter((c) => typeof c === 'string')
  const holder = list.find((c) => c && typeof c === 'object' && c[GROCERY_KEY])
  return { categoryOrder, grocery: normalizeGrocery(holder?.[GROCERY_KEY]) }
}

export function joinCategoryOrder(categoryOrder, grocery) {
  return [...categoryOrder.filter((c) => typeof c === 'string'), { [GROCERY_KEY]: grocery }]
}

export function normalizeGrocery(g) {
  return {
    sections: Array.isArray(g?.sections) ? g.sections.filter((s) => typeof s === 'string' && s.trim()) : [],
    overrides: g?.overrides && typeof g.overrides === 'object' ? g.overrides : {},
    amounts: g?.amounts && typeof g.amounts === 'object' ? g.amounts : {},
  }
}
