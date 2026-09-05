// Categories aren't a fixed enum in the database (menus.category is a plain
// text column), so "adding a category" just means using a new string. These
// defaults always show up first; any custom category already used by a menu
// is appended automatically so it keeps appearing as a filter/chip everywhere.
export const DEFAULT_CATEGORIES = ['肉', '魚', '野菜', 'ご飯', '麺', '圧力鍋', 'その他']

export function getAllCategories(menus) {
  const custom = []
  const seen = new Set(DEFAULT_CATEGORIES)
  for (const m of menus) {
    if (m.category && !seen.has(m.category)) {
      seen.add(m.category)
      custom.push(m.category)
    }
  }
  // Keep "その他" last, custom categories slot in just before it.
  const withoutOther = DEFAULT_CATEGORIES.filter((c) => c !== 'その他')
  return [...withoutOther, ...custom.sort((a, b) => a.localeCompare(b, 'ja')), 'その他']
}
