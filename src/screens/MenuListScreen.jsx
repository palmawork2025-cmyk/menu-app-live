import { useState } from 'react'
import { useFamily } from '../lib/FamilyContext'
import { useMenus } from '../hooks/useMenus'
import { useMenuUsageCounts } from '../hooks/useMenuUsageCounts'
import { Chip, EmptyState, GhostButton, Select, Spinner, TextInput } from '../components/ui'
import { CategoryIcon } from '../lib/categoryIcons'
import { getOrderedCategories } from '../lib/categories'

export default function MenuListScreen({ onOpenMenu, onNewMenu, onOpenStaples }) {
  const { family } = useFamily()
  const { menus, loading, deleteMenus } = useMenus(family.id)
  const { counts } = useMenuUsageCounts(family.id)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('すべて')
  const [sortOrder, setSortOrder] = useState('none') // none | desc | asc
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const CATEGORIES = ['すべて', ...getOrderedCategories(menus, family.category_order)]

  let filtered = menus.filter((m) => {
    const matchesCategory = category === 'すべて' || m.category === category
    const matchesQuery = m.name.toLowerCase().includes(query.toLowerCase())
    return matchesCategory && matchesQuery
  })
  if (sortOrder !== 'none') {
    filtered = [...filtered].sort((a, b) => {
      const diff = (counts[a.id] || 0) - (counts[b.id] || 0)
      return sortOrder === 'desc' ? -diff : diff
    })
  }

  function toggleSelectMode() {
    setSelectMode((v) => !v)
    setSelectedIds(new Set())
  }

  function toggleSelected(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function deleteSelected() {
    await deleteMenus(Array.from(selectedIds))
    setSelectedIds(new Set())
    setSelectMode(false)
  }

  return (
    <div className="flex flex-col gap-3 px-4 pt-[calc(env(safe-area-inset-top)+1rem)]">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-black text-stone-800">メニュー一覧</h1>
        <div className="flex gap-1.5">
          {menus.length > 0 && (
            <GhostButton onClick={toggleSelectMode} className={selectMode ? 'bg-stone-200' : 'bg-white shadow-sm'}>
              {selectMode ? 'キャンセル' : '選択して削除'}
            </GhostButton>
          )}
          <GhostButton onClick={onOpenStaples} className="bg-white shadow-sm">🧂 常備品</GhostButton>
        </div>
      </div>

      <TextInput placeholder="メニューを検索" value={query} onChange={(e) => setQuery(e.target.value)} />

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {CATEGORIES.map((c) => (
          <Chip key={c} active={category === c} onClick={() => setCategory(c)}>{c}</Chip>
        ))}
      </div>

      <Select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="text-sm">
        <option value="none">並び替え：通常</option>
        <option value="desc">使用回数が多い順</option>
        <option value="asc">使用回数が少ない順</option>
      </Select>

      {loading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <EmptyState icon="📖" title="メニューがありません" description="右下の＋から追加できます" />
      ) : (
        <ul className="space-y-2 pb-20">
          {filtered.map((m) => {
            const selected = selectedIds.has(m.id)
            return (
              <li key={m.id}>
                <button
                  onClick={() => (selectMode ? toggleSelected(m.id) : onOpenMenu(m.id))}
                  className="flex w-full items-center gap-3 rounded-2xl bg-white px-4 py-3 text-left shadow-sm active:bg-orange-50"
                >
                  {selectMode && (
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 text-sm font-bold ${
                        selected ? 'border-orange-400 bg-orange-400 text-white' : 'border-stone-300 text-transparent'
                      }`}
                    >
                      ✓
                    </span>
                  )}
                  <CategoryIcon category={m.category} className="h-10 w-10" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-stone-700">{m.name}</p>
                    <p className="text-xs text-stone-400">{m.category} ・ 材料{m.ingredients.length}点</p>
                  </div>
                  {!selectMode && (
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-bold text-stone-500">
                        {counts[m.id] || 0}回
                      </span>
                      <span className="text-stone-300">›</span>
                    </div>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {!selectMode && (
        <div className="pointer-events-none fixed inset-x-0 bottom-20 z-10 mx-auto flex max-w-md justify-end px-4">
          <button
            onClick={onNewMenu}
            className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-orange-500 text-3xl font-light text-white shadow-lg active:bg-orange-600"
            aria-label="新しいメニューを追加"
          >
            ＋
          </button>
        </div>
      )}

      {selectMode && (
        <div className="fixed inset-x-0 bottom-16 z-20 mx-auto flex max-w-md justify-center px-4 pb-[env(safe-area-inset-bottom)]">
          <div className="flex w-full items-center justify-between gap-2 rounded-2xl bg-stone-800 px-4 py-3 shadow-lg">
            <span className="text-sm font-bold text-white">{selectedIds.size}件選択中</span>
            <button
              onClick={deleteSelected}
              disabled={selectedIds.size === 0}
              className="rounded-xl bg-red-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
            >
              削除する
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
