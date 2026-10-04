import { supabase } from './supabaseClient'

/**
 * "前回の分量" for each ingredient name.
 * 1. What was last entered when adding to the shopping list (family.grocery.amounts)
 * 2. Otherwise, the amount used in the most recently edited menu
 *    (per that menu's base people count, like the menu editor expects)
 * Returns Map<name, { quantity, unit, displayText }>.
 */
export function buildLastAmounts(menus) {
  const map = new Map()
  const byRecent = [...menus].sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')))
  for (const menu of byRecent) {
    for (const ing of menu.ingredients || []) {
      if (!ing.name || map.has(ing.name)) continue
      map.set(ing.name, { quantity: ing.quantity ?? null, unit: ing.unit || '', displayText: ing.displayText || null })
    }
  }
  return map
}

/** Shopping-list amounts take priority over recipe amounts when adding to the shopping list. */
export function shoppingAmountFor(name, grocery, recipeAmounts) {
  return grocery?.amounts?.[name] || recipeAmounts.get(name) || null
}

/** Recipe amounts take priority over shopping amounts in the menu editor. */
export function recipeAmountFor(name, grocery, recipeAmounts) {
  return recipeAmounts.get(name) || grocery?.amounts?.[name] || null
}

/** Human-readable "前回 2個" label. */
export function describeAmount(amount) {
  if (!amount) return ''
  if (amount.quantity === null || amount.quantity === undefined) return amount.displayText || ''
  return `${Math.round(amount.quantity * 100) / 100}${amount.unit || ''}`
}

/**
 * Register an ingredient name in the family's ingredient list if it isn't
 * there yet (so it shows up as a suggestion next time). Never touches the
 * 常備品 flag of an existing row.
 */
export async function ensureIngredientRegistered(familyId, knownIngredients, name, unit) {
  const trimmed = name.trim()
  if (!trimmed) return
  const existing = knownIngredients.find((i) => i.name === trimmed)
  if (existing) {
    if (unit && existing.default_unit !== unit) {
      await supabase.from('ingredients').update({ default_unit: unit, updated_at: new Date().toISOString() }).eq('id', existing.id)
    }
    return
  }
  const { error } = await supabase.from('ingredients').insert({ family_id: familyId, name: trimmed, default_unit: unit || '' })
  // 23505 = already registered by another phone at the same moment: fine.
  if (error && error.code !== '23505') throw error
}

/** Keep the shared amounts map from growing forever. */
export function rememberAmount(grocery, name, amount, limit = 400) {
  const amounts = { ...(grocery.amounts || {}) }
  delete amounts[name]
  amounts[name] = amount
  const keys = Object.keys(amounts)
  for (const key of keys.slice(0, Math.max(0, keys.length - limit))) delete amounts[key]
  return { ...grocery, amounts }
}
