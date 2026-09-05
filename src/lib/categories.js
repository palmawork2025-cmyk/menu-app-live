// Categories aren't a fixed enum in the database (menus.category is a plain
// text column), so "adding a category" just means using a new string. These
// defaults always show up first; any custom category already used by a menu
// is appended automatically so it keeps appearing as a filter/chip everywhere.
export const DEFAULT_CATEGORIES = ['肉', '魚', '野菜', 'ご飯', '麺', '圧力鍋', 'その他']

/**
 * All categories currently in use, in a sensible default order:
 * built-in defaults, then any custom categories (alphabetical), with
 * "その他" always last.
 */
export function getAllCategories(menus) {
  const custom = []
  const seen = new Set(DEFAULT_CATEGORIES)
  for (const m of menus) {
    if (m.category && !seen.has(m.category)) {
      seen.add(m.category)
      custom.push(m.category)
    }
  }
  const withoutOther = DEFAULT_CATEGORIES.filter((c) => c !== 'その他')
  return [...withoutOther, ...custom.sort((a, b) => a.localeCompare(b, 'ja')), 'その他']
}

/**
 * Same as getAllCategories, but reordered according to a family's saved
 * `categoryOrder` (an array of category names, most-preferred first).
 * Categories not mentioned in categoryOrder keep their default relative
 * order and are appended after the ones that are.
 */
export function getOrderedCategories(menus, categoryOrder) {
  const all = getAllCategories(menus)
  if (!categoryOrder || !categoryOrder.length) return all
  const allSet = new Set(all)
  const ordered = categoryOrder.filter((c) => allSet.has(c))
  const remaining = all.filter((c) => !ordered.includes(c))
  return [...ordered, ...remaining]
}
