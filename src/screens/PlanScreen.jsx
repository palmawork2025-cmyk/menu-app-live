import { useMemo, useState } from 'react'
import { useFamily } from '../lib/FamilyContext'
import { useMealPlan } from '../hooks/useMealPlan'
import { useMenus } from '../hooks/useMenus'
import { getWeekStart, getWeekDates, addDays, formatDateLabel, isToday } from '../lib/dates'
import { Card, Chip, EmptyState, GhostButton, Modal, Spinner, Stepper, TextInput } from '../components/ui'

const CATEGORIES = ['すべて', '肉', '魚', '野菜', 'ご飯', '麺', '圧力鍋', 'その他']

export default function PlanScreen({ onOpenMenu }) {
  const { family, updatePeopleCount } = useFamily()
  const [weekStart, setWeekStart] = useState(() => getWeekStart())
  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart])
  const { entriesByDate, loading, addMenuToDate, removeEntry } = useMealPlan(family.id, weekDates[0], weekDates[6])
  const { menus } = useMenus(family.id)
  const [pickerDate, setPickerDate] = useState(null)

  const weekLabel = `${formatDateLabel(weekDates[0])} 〜 ${formatDateLabel(weekDates[6])}`

  return (
    <div className="flex flex-col gap-3 px-4 pt-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-black text-stone-800">献立（1週間）</h1>
        <Stepper value={family.people_count} onChange={updatePeopleCount} />
      </div>

      <div className="flex items-center justify-between rounded-2xl bg-white px-3 py-2 shadow-sm">
        <GhostButton onClick={() => setWeekStart((d) => addDays(d, -7))}>◀ 前週</GhostButton>
        <span className="text-sm font-bold text-stone-600">{weekLabel}</span>
        <GhostButton onClick={() => setWeekStart((d) => addDays(d, 7))}>翌週 ▶</GhostButton>
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <div className="space-y-3 pb-4">
          {weekDates.map((date) => (
            <Card key={date} className={isToday(date) ? 'ring-2 ring-orange-300' : ''}>
              <div className="mb-2 flex items-center justify-between">
                <span className={`text-sm font-black ${isToday(date) ? 'text-orange-500' : 'text-stone-600'}`}>
                  {formatDateLabel(date)}{isToday(date) && '・今日'}
                </span>
                <button onClick={() => setPickerDate(date)} className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-600 active:bg-orange-200">
                  ＋ 献立を追加
                </button>
              </div>
              {(entriesByDate[date] || []).length === 0 ? (
                <p className="py-2 text-center text-xs text-stone-300">献立が未定です</p>
              ) : (
                <ul className="space-y-1.5">
                  {entriesByDate[date].map((e) => (
                    <li key={e.id} className="flex items-center justify-between rounded-xl bg-orange-50 px-3 py-2">
                      <button className="text-left font-bold text-stone-700" onClick={() => onOpenMenu(e.menu_id)}>
                        {e.menus?.name}
                      </button>
                      <button onClick={() => removeEntry(e.id)} className="rounded-full px-2 py-0.5 text-stone-400 active:bg-stone-200" aria-label="削除">✕</button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ))}
        </div>
      )}

      {pickerDate && (
        <MenuPicker
          menus={menus}
          onPick={async (menuId) => {
            await addMenuToDate(pickerDate, menuId)
            setPickerDate(null)
          }}
          onClose={() => setPickerDate(null)}
          dateLabel={formatDateLabel(pickerDate)}
        />
      )}
    </div>
  )
}

function MenuPicker({ menus, onPick, onClose, dateLabel }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('すべて')

  const filtered = menus.filter((m) => {
    const matchesCategory = category === 'すべて' || m.category === category
    const matchesQuery = m.name.toLowerCase().includes(query.toLowerCase())
    return matchesCategory && matchesQuery
  })

  return (
    <Modal title={`${dateLabel}の献立を選ぶ`} onClose={onClose}>
      <TextInput placeholder="メニューを検索" value={query} onChange={(e) => setQuery(e.target.value)} className="mb-2" />
      <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
        {CATEGORIES.map((c) => (
          <Chip key={c} active={category === c} onClick={() => setCategory(c)}>{c}</Chip>
        ))}
      </div>
      {filtered.length === 0 ? (
        <EmptyState icon="🔍" title="見つかりませんでした" />
      ) : (
        <ul className="max-h-[50vh] space-y-1.5 overflow-y-auto">
          {filtered.map((m) => (
            <li key={m.id}>
              <button
                onClick={() => onPick(m.id)}
                className="flex w-full items-center justify-between rounded-xl bg-stone-50 px-3 py-3 text-left active:bg-orange-50"
              >
                <span className="font-bold text-stone-700">{m.name}</span>
                <span className="text-xs text-stone-400">{m.category}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}
