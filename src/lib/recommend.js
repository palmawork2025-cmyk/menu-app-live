// Rule-based "how's the last couple of weeks looked" advice for the home
// screen: no AI, just simple category/keyword balance checks over recent
// meal_plan_entries, plus a few menu suggestions to act on it.

const FRIED_KEYWORDS = ['揚げ', 'フライ', 'カツ', '天ぷら', 'ザンギ']
const LIGHT_KEYWORDS = ['煮', '蒸し', '鍋', 'スープ', 'サラダ', 'おひたし', '和え', 'ゆで', '茹で']

/**
 * @param {Array<{menus:{name:string, category:string}}>} pastEntries recent meal_plan_entries (with joined menu)
 * @param {Array<{id:string, name:string, category:string}>} allMenus full menu list, for suggesting alternatives
 */
export function buildRecommendation(pastEntries, allMenus) {
  const withMenu = pastEntries.filter((e) => e.menus)
  const total = withMenu.length
  if (total === 0) {
    return { messages: [], suggestedMenus: [], hasHistory: false }
  }

  const categoryCounts = {}
  let friedCount = 0
  let lightCount = 0
  for (const e of withMenu) {
    const cat = e.menus.category || 'その他'
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1
    const name = e.menus.name || ''
    if (FRIED_KEYWORDS.some((k) => name.includes(k))) friedCount++
    if (LIGHT_KEYWORDS.some((k) => name.includes(k))) lightCount++
  }

  const meatCount = categoryCounts['肉'] || 0
  const fishCount = categoryCounts['魚'] || 0
  const vegCount = categoryCounts['野菜'] || 0

  const messages = []
  let focusCategory = null
  let preferLight = false

  if (meatCount > 0 && meatCount >= total * 0.4 && meatCount > fishCount + vegCount) {
    messages.push(`最近${total}食中${meatCount}食がお肉料理でした。魚や野菜のメニューを増やしてバランスを取りましょう。`)
    focusCategory = fishCount <= vegCount ? '魚' : '野菜'
  } else if (friedCount > 0 && friedCount >= total * 0.3 && friedCount > lightCount) {
    messages.push(`揚げ物メニューが最近${friedCount}回続いています。煮物や蒸し料理で油分を控えめにしましょう。`)
    preferLight = true
  } else if (vegCount <= Math.ceil(total * 0.15)) {
    messages.push('野菜を使ったメニューが少なめです。野菜料理を増やしてみましょう。')
    focusCategory = '野菜'
  }

  if (!messages.length) {
    messages.push('最近の献立はバランスが取れています。この調子で続けましょう！')
  }

  const recentNames = new Set(withMenu.map((e) => e.menus.name))
  let candidates = allMenus.filter((m) => !recentNames.has(m.name))

  if (focusCategory) {
    const inCategory = candidates.filter((m) => m.category === focusCategory)
    if (inCategory.length) candidates = inCategory
  } else if (preferLight) {
    const lightOnes = candidates.filter((m) => LIGHT_KEYWORDS.some((k) => m.name.includes(k)))
    if (lightOnes.length) candidates = lightOnes
  }

  // Light shuffle so the same 3 aren't suggested every single day.
  const shuffled = [...candidates].sort(() => Math.random() - 0.5)

  return { messages, suggestedMenus: shuffled.slice(0, 3), hasHistory: true }
}
