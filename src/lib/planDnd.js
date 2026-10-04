// 献立のドラッグ移動(同じ日の並び替え・別の日への移動)の計算。
// 画面から切り離して、単体で確かめられるようにしてある。

export const DAY_PREFIX = 'day:'
export const dayDropId = (date) => `${DAY_PREFIX}${date}`

/** id(献立のID か 日付の枠ID)がどの日に属するか */
export function findDayOf(lists, id) {
  if (id.startsWith(DAY_PREFIX)) {
    const date = id.slice(DAY_PREFIX.length)
    return date in lists ? date : null
  }
  return Object.keys(lists).find((date) => lists[date].includes(id)) ?? null
}

/** activeId を overId の位置へ動かした新しい並び(元の lists は変えない)。日付の枠に落としたらその日の最後へ */
export function moveEntry(lists, activeId, overId) {
  const from = findDayOf(lists, activeId)
  const to = findDayOf(lists, overId)
  if (!from || !to) return lists
  const next = { ...lists, [from]: lists[from].filter((id) => id !== activeId) }
  const target = from === to ? next[from] : [...lists[to]]
  const overIndex = overId.startsWith(DAY_PREFIX) ? -1 : lists[to].indexOf(overId)
  target.splice(overIndex < 0 ? target.length : overIndex, 0, activeId)
  next[to] = target
  return next
}

/** 日付か順番が変わった献立だけを返す */
export function diffPositions(lists, entries) {
  const byId = new Map(entries.map((e) => [e.id, e]))
  const updates = []
  for (const [date, ids] of Object.entries(lists)) {
    ids.forEach((id, order) => {
      const e = byId.get(id)
      if (e && (e.plan_date !== date || e.sort_order !== order)) updates.push({ id, plan_date: date, sort_order: order })
    })
  }
  return updates
}
