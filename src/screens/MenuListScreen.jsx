import { useState } from 'react'
import { useFamily } from '../lib/FamilyContext'
import { useMenus } from '../hooks/useMenus'
import { Chip, EmptyState, GhostButton, Spinner, TextInput } from '../components/ui'

const CATEGORIES = ['すべて', '肉', '魚', '野菜', 'ご飯', '麺', '圧力鍋', 'その他']
const CATEGORY_ICON = { 肉: '🥩', 魚: '🐟', 野菜: '🥦', ご飯: '🍚', 麺: '🍜', 圧力鍋: '🍲', その他: '🍽️' }

export default function MenuListScreen({ onOpenMenu, onNewMenu, onOpenStaples }) {
  const { family } = useFamily()
  const { menus, loading } = useMenus(family.id)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('すべて')

  const filtered = menus.filter((m) => {
    const matchesCategory = category === 'すべて' || m.category === category
    const matchesQuery = m.name.toLowerCase().includes(query.toLowerCase())
    return matchesCategory && matchesQuery
  })

  return (
    <div className="flex flex-col gap-3 px-4 pt-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-black text-stone-800">メニュー一覧</h1>
        <GhostButton onClick={onOpenStaples} className="bg-white shadow-sm">🧂 常備品</GhostButton>
      </div>

      <TextInput placeholder="メニューを検索" value={query} onChange={(e) => setQuery(e.target.value)} />

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {CATEGORIES.map((c) => (
          <Chip key={c} active={category === c} onClick={() => setCategory(c)}>{c}</Chip>
        ))}
      </div>

      {loading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <EmptyState icon="📖" title="メニューがありません" description="右下の＋から追加できます" />
      ) : (
        <ul className="space-y-2 pb-20">
          {filtered.map((m) => (
            <li key={m.id}>
              <button
                onClick={() => onOpenMenu(m.id)}
                className="flex w-full items-center gap-3 rounded-2xl bg-white px-4 py-3 text-left shadow-sm active:bg-orange-50"
              >
                <span className="text-2xl">{CATEGORY_ICON[m.category] || '🍽️'}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-stone-700">{m.name}</p>
                  <p className="text-xs text-stone-400">{m.category} ・ 材料{m.ingredients.length}点</p>
                </div>
                <span className="text-stone-300">›</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-10 mx-auto flex max-w-md justify-end px-4">
        <button
          onClick={onNewMenu}
          className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-orange-500 text-3xl font-light text-white shadow-lg active:bg-orange-600"
          aria-label="新しいメニューを追加"
        >
          ＋
        </button>
      </div>
    </div>
  )
}
