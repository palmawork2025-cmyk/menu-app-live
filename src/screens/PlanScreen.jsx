import { useEffect, useMemo, useState } from 'react'
import {
  closestCorners, DndContext, DragOverlay, KeyboardSensor, MouseSensor, pointerWithin, TouchSensor,
  useDroppable, useSensor, useSensors,
} from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useFamily } from '../lib/FamilyContext'
import { useMealPlan } from '../hooks/useMealPlan'
import { useMenus } from '../hooks/useMenus'
import { getWeekStart, getWeekDates, addDays, formatDateLabel, isToday } from '../lib/dates'
import { Card, Chip, EmptyState, GhostButton, Modal, Spinner, Stepper, TextInput } from '../components/ui'
import { getOrderedCategories } from '../lib/categories'
import { DAY_PREFIX, dayDropId, diffPositions, findDayOf, moveEntry } from '../lib/planDnd'

export default function PlanScreen({ onOpenMenu }) {
  const { family, updatePeopleCount } = useFamily()
  const [weekStart, setWeekStart] = useState(() => getWeekStart())
  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart])
  const { entries, entriesByDate, loading, addMenuToDate, removeEntry, moveEntries } = useMealPlan(family.id, weekDates[0], weekDates[6])
  const { menus } = useMenus(family.id)
  const [pickerDate, setPickerDate] = useState(null)

  // ---- ドラッグで並び替え・別の日へ移動 ----
  const [dragLists, setDragLists] = useState(null) // ドラッグ中だけの一時的な並び
  const [activeId, setActiveId] = useState(null)
  const [notice, setNotice] = useState('')

  const savedLists = useMemo(() => {
    const lists = {}
    for (const date of weekDates) lists[date] = (entriesByDate[date] || []).map((e) => e.id)
    return lists
    // entriesByDate is rebuilt every render; entries is the real source
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekDates, entries])
  const lists = dragLists || savedLists
  const entryById = useMemo(() => new Map(entries.map((e) => [e.id, e])), [entries])
  const activeEntry = activeId ? entryById.get(activeId) : null

  // 保存後に最新データが届いたら、一時的な並びは不要
  useEffect(() => {
    if (!activeId) setDragLists(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries])

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }), // PC: 少し動かすとドラッグ開始
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }), // スマホ: 長押しで開始(スクロールの邪魔をしない)
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function flash(message) {
    setNotice(message)
    setTimeout(() => setNotice(''), 2500)
  }

  function handleDragStart({ active }) {
    setActiveId(String(active.id))
    setDragLists(savedLists)
    navigator.vibrate?.(15)
  }

  // 別の日の上に来たら、その場で移動先に入れて見た目を追従させる
  function handleDragOver({ active, over }) {
    if (!over) return
    setDragLists((prev) => {
      if (!prev) return prev
      const from = findDayOf(prev, String(active.id))
      const to = findDayOf(prev, String(over.id))
      if (!from || !to || from === to) return prev
      return moveEntry(prev, String(active.id), String(over.id))
    })
  }

  async function handleDragEnd({ active, over }) {
    let finalLists = dragLists || savedLists
    if (over && active.id !== over.id && !String(over.id).startsWith(DAY_PREFIX)) {
      const from = findDayOf(finalLists, String(active.id))
      const to = findDayOf(finalLists, String(over.id))
      if (from && to && from === to) finalLists = moveEntry(finalLists, String(active.id), String(over.id))
    }
    setActiveId(null)
    const updates = diffPositions(finalLists, entries)
    if (!updates.length) {
      setDragLists(null)
      return
    }
    setDragLists(finalLists)
    const moved = updates.find((u) => u.id === active.id)
    const before = entryById.get(String(active.id))
    try {
      await moveEntries(updates)
      if (moved && before && moved.plan_date !== before.plan_date) {
        flash(`「${before.menus?.name ?? '献立'}」を${formatDateLabel(moved.plan_date)}に移動しました`)
      }
    } catch (err) {
      console.error(err)
      flash('移動を保存できませんでした。もう一度お試しください。')
    } finally {
      setDragLists(null)
    }
  }

  const weekLabel = `${formatDateLabel(weekDates[0])} 〜 ${formatDateLabel(weekDates[6])}`

  return (
    <div className="flex flex-col gap-3 px-4 pt-[calc(env(safe-area-inset-top)+1rem)]">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-black text-stone-800">献立（1週間）</h1>
        <Stepper value={family.people_count} onChange={updatePeopleCount} />
      </div>

      <div className="flex items-center justify-between rounded-2xl bg-white px-3 py-2 shadow-sm">
        <GhostButton onClick={() => setWeekStart((d) => addDays(d, -7))}>◀ 前週</GhostButton>
        <span className="text-sm font-bold text-stone-600">{weekLabel}</span>
        <GhostButton onClick={() => setWeekStart((d) => addDays(d, 7))}>翌週 ▶</GhostButton>
      </div>

      {entries.length > 0 && (
        <p className="text-center text-[11px] text-stone-400">料理を長押しして動かすと、順番の入れ替えや別の日への移動ができます</p>
      )}
      {notice && <p className="text-center text-xs font-bold text-orange-500">{notice}</p>}

      {loading ? (
        <Spinner />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetection}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={() => { setActiveId(null); setDragLists(null) }}
        >
          <div className="space-y-3 pb-4">
            {weekDates.map((date) => (
              <DayCard
                key={date}
                date={date}
                entries={(lists[date] || []).map((id) => entryById.get(id)).filter(Boolean)}
                dragging={activeId !== null}
                onAdd={() => setPickerDate(date)}
                onOpenMenu={onOpenMenu}
                onRemove={removeEntry}
              />
            ))}
          </div>
          <DragOverlay>
            {activeEntry ? (
              <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-xl ring-2 ring-orange-300">
                <span className="text-lg text-stone-300">⠿</span>
                <span className="font-bold text-stone-700">{activeEntry.menus?.name}</span>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {pickerDate && (
        <MenuPicker
          menus={menus}
          categoryOrder={family.category_order}
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

/** 指の下の献立を優先し、無ければ日付の枠、それも無ければ一番近いものを当たり判定にする */
function collisionDetection(args) {
  const within = pointerWithin(args)
  const entryHit = within.find((c) => !String(c.id).startsWith(DAY_PREFIX))
  if (entryHit) return [entryHit]
  if (within.length) return within
  return closestCorners(args)
}

function DayCard({ date, entries, dragging, onAdd, onOpenMenu, onRemove }) {
  const { setNodeRef, isOver } = useDroppable({ id: dayDropId(date) })
  const today = isToday(date)
  return (
    <div ref={setNodeRef}>
      <Card className={`transition ${isOver ? 'bg-orange-50/70 ring-2 ring-orange-400' : today ? 'ring-2 ring-orange-300' : ''}`}>
        <div className="mb-2 flex items-center justify-between">
          <span className={`text-sm font-black ${today ? 'text-orange-500' : 'text-stone-600'}`}>
            {formatDateLabel(date)}{today && '・今日'}
          </span>
          <button onClick={onAdd} className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-600 active:bg-orange-200">
            ＋ 献立を追加
          </button>
        </div>
        <SortableContext id={dayDropId(date)} items={entries.map((e) => e.id)} strategy={verticalListSortingStrategy}>
          {entries.length === 0 ? (
            <p className={`rounded-xl py-2 text-center text-xs ${dragging ? 'border-2 border-dashed border-orange-300 text-orange-400' : 'text-stone-300'}`}>
              {dragging ? 'ここに移動' : '献立が未定です'}
            </p>
          ) : (
            <ul className="space-y-1.5">
              {entries.map((e) => (
                <PlanEntryRow key={e.id} entry={e} onOpenMenu={onOpenMenu} onRemove={onRemove} />
              ))}
            </ul>
          )}
        </SortableContext>
      </Card>
    </div>
  )
}

/** 長押し(スマホ)・ドラッグ(PC)で動かせる献立1品 */
function PlanEntryRow({ entry, onOpenMenu, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: entry.id })
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, touchAction: 'manipulation', WebkitTouchCallout: 'none' }}
      className={`flex select-none items-center gap-2 rounded-xl bg-orange-50 px-2 py-2 ${isDragging ? 'opacity-30' : ''}`}
      {...attributes}
      {...listeners}
    >
      <span className="shrink-0 px-0.5 text-lg text-stone-300" aria-hidden>⠿</span>
      <button className="min-w-0 flex-1 truncate text-left font-bold text-stone-700" onClick={() => onOpenMenu(entry.menu_id)}>
        {entry.menus?.name}
      </button>
      <button onClick={() => onRemove(entry.id)} className="shrink-0 rounded-full px-2 py-0.5 text-stone-400 active:bg-stone-200" aria-label="削除">✕</button>
    </li>
  )
}

function MenuPicker({ menus, categoryOrder, onPick, onClose, dateLabel }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('すべて')
  const CATEGORIES = ['すべて', ...getOrderedCategories(menus, categoryOrder)]

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
