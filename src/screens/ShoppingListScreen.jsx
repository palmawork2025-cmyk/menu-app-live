import { useState } from 'react'
import { useFamily } from '../lib/FamilyContext'
import { useMenus } from '../hooks/useMenus'
import { useIngredients } from '../hooks/useIngredients'
import { useShoppingList } from '../hooks/useShoppingList'
import { supabase } from '../lib/supabaseClient'
import { scaleQuantity, mergeIngredientLines, formatQuantityLine } from '../lib/quantity'
import { todayISO, getWeekStart, getWeekDates, addDays } from '../lib/dates'
import { sortByGroceryOrder } from '../lib/groceryOrder'
import { Card, EmptyState, GhostButton, Modal, PrimaryButton, SecondaryButton, Spinner, TextInput } from '../components/ui'

export default function ShoppingListScreen({ onOpenMenu }) {
  const { family, displayName } = useFamily()
  const { menus } = useMenus(family.id)
  const { ingredients } = useIngredients(family.id)
  const { items, loading, toggleChecked, updateItem, deleteItem, deleteItems, clearChecked, addManualItem, addFromMenuLines } = useShoppingList(family.id)

  const [busyScope, setBusyScope] = useState(null)
  const [showManual, setShowManual] = useState(false)
  const [showStaples, setShowStaples] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [notice, setNotice] = useState('')
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [editingItem, setEditingItem] = useState(null)

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
    await deleteItems(Array.from(selectedIds))
    setSelectedIds(new Set())
    setSelectMode(false)
  }

  const unchecked = sortByGroceryOrder(items.filter((i) => !i.is_checked))
  const checked = items.filter((i) => i.is_checked)

  async function addFromScope(scope) {
    setBusyScope(scope)
    setNotice('')
    try {
      let start, end
      if (scope === 'today') {
        start = end = todayISO()
      } else if (scope === 'nextWeek') {
        const nextWeekDates = getWeekDates(addDays(getWeekStart(), 7))
        start = nextWeekDates[0]
        end = nextWeekDates[6]
      } else {
        const weekDates = getWeekDates(getWeekStart())
        start = weekDates[0]
        end = weekDates[6]
      }
      const { data, error } = await supabase
        .from('meal_plan_entries')
        .select('menu_id')
        .eq('family_id', family.id)
        .gte('plan_date', start)
        .lte('plan_date', end)
      if (error) throw error

      if (!data.length) {
        const label = scope === 'today' ? '今日' : scope === 'nextWeek' ? '来週' : '今週'
        setNotice(`${label}の献立がまだ登録されていません`)
        return
      }

      const lines = []
      for (const { menu_id } of data) {
        const menu = menus.find((m) => m.id === menu_id)
        if (!menu) continue
        for (const ing of menu.ingredients) {
          if (ing.isStaple) continue // staples aren't auto-added
          lines.push({
            name: ing.name,
            unit: ing.unit,
            quantity: typeof ing.quantity === 'number' ? scaleQuantity(ing.quantity, menu.base_people, family.people_count) : null,
            displayText: ing.displayText,
            menuName: menu.name,
          })
        }
      }
      const merged = mergeIngredientLines(lines)
      if (!merged.length) {
        setNotice('追加できる食材がありませんでした（常備品のみの献立です）')
        return
      }
      await addFromMenuLines(merged, displayName)
      const doneLabel = scope === 'today' ? '今日' : scope === 'nextWeek' ? '来週' : '今週'
      setNotice(`${doneLabel}の献立から追加しました`)
    } catch (err) {
      console.error(err)
      setNotice('追加に失敗しました')
    } finally {
      setBusyScope(null)
      setTimeout(() => setNotice(''), 3000)
    }
  }

  return (
    <div className="flex flex-col gap-3 px-4 pb-10 pt-[calc(env(safe-area-inset-top)+1rem)]">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-black text-stone-800">買い物リスト</h1>
        {items.length > 0 && (
          <GhostButton onClick={toggleSelectMode} className={selectMode ? 'bg-stone-200' : 'bg-white shadow-sm'}>
            {selectMode ? 'キャンセル' : '選択して削除'}
          </GhostButton>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <SecondaryButton onClick={() => addFromScope('today')} disabled={busyScope !== null}>
          {busyScope === 'today' ? '追加中…' : '今日の献立から'}
        </SecondaryButton>
        <SecondaryButton onClick={() => addFromScope('week')} disabled={busyScope !== null}>
          {busyScope === 'week' ? '追加中…' : '今週の献立から'}
        </SecondaryButton>
        <SecondaryButton className="col-span-2" onClick={() => addFromScope('nextWeek')} disabled={busyScope !== null}>
          {busyScope === 'nextWeek' ? '追加中…' : '来週の献立から'}
        </SecondaryButton>
      </div>
      {notice && <p className="text-center text-xs font-bold text-orange-500">{notice}</p>}

      <div className="grid grid-cols-2 gap-2">
        <GhostButton onClick={() => setShowManual(true)} className="bg-white shadow-sm">＋ 食材を追加</GhostButton>
        <GhostButton onClick={() => setShowStaples(true)} className="bg-white shadow-sm">＋ 常備品を追加</GhostButton>
      </div>

      {loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <EmptyState icon="🛒" title="買い物リストは空です" description="献立から追加するか、食材を直接追加できます" />
      ) : (
        <div className="space-y-3">
          <Card className="divide-y divide-stone-100 !p-0">
            {unchecked.length === 0 ? (
              <p className="p-4 text-center text-xs text-stone-300">未購入の食材はありません</p>
            ) : (
              unchecked.map((item) => (
                <ShoppingRow
                  key={item.id}
                  item={item}
                  onToggle={() => toggleChecked(item.id, true)}
                  onDelete={() => deleteItem(item.id)}
                  onEditQuantity={() => setEditingItem(item)}
                  expanded={expanded === item.id}
                  onExpand={() => setExpanded(expanded === item.id ? null : item.id)}
                  onOpenMenu={onOpenMenu}
                  menus={menus}
                  selectMode={selectMode}
                  selected={selectedIds.has(item.id)}
                  onToggleSelect={() => toggleSelected(item.id)}
                />
              ))
            )}
          </Card>

          {checked.length > 0 && (
            <Card className="divide-y divide-stone-100 !p-0">
              <div className="flex items-center justify-between p-3">
                <p className="text-xs font-bold text-stone-400">購入済み（{checked.length}）</p>
                <GhostButton onClick={clearChecked}>すべて削除</GhostButton>
              </div>
              {checked.map((item) => (
                <ShoppingRow
                  key={item.id}
                  item={item}
                  onToggle={() => toggleChecked(item.id, false)}
                  onDelete={() => deleteItem(item.id)}
                  onEditQuantity={() => setEditingItem(item)}
                  expanded={expanded === item.id}
                  onExpand={() => setExpanded(expanded === item.id ? null : item.id)}
                  onOpenMenu={onOpenMenu}
                  menus={menus}
                  selectMode={selectMode}
                  selected={selectedIds.has(item.id)}
                  onToggleSelect={() => toggleSelected(item.id)}
                />
              ))}
            </Card>
          )}
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

      {showManual && (
        <ManualAddModal
          ingredients={ingredients}
          onClose={() => setShowManual(false)}
          onAdd={async (payload) => {
            await addManualItem({ ...payload, addedBy: displayName })
            setShowManual(false)
          }}
        />
      )}

      {showStaples && (
        <StaplesPickerModal
          ingredients={ingredients.filter((i) => i.is_staple)}
          onClose={() => setShowStaples(false)}
          onAdd={async (ing) => {
            await addManualItem({ name: ing.name, unit: ing.default_unit, source: 'staple', addedBy: displayName })
            setShowStaples(false)
          }}
        />
      )}

      {editingItem && (
        <EditQuantityModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={async (patch) => {
            await updateItem(editingItem.id, patch)
            setEditingItem(null)
          }}
        />
      )}
    </div>
  )
}

function ShoppingRow({ item, onToggle, onDelete, onEditQuantity, expanded, onExpand, onOpenMenu, menus, selectMode = false, selected = false, onToggleSelect }) {
  const hasSource = item.source === 'menu' && (item.source_menu_names || []).length > 0
  return (
    <div className="p-3">
      <div className="flex items-center gap-3">
        {selectMode ? (
          <button
            onClick={onToggleSelect}
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 text-sm font-bold ${
              selected ? 'border-orange-400 bg-orange-400 text-white' : 'border-stone-300 text-transparent'
            }`}
            aria-label="選択する"
          >
            ✓
          </button>
        ) : (
          <button
            onClick={onToggle}
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold ${
              item.is_checked ? 'border-orange-400 bg-orange-400 text-white' : 'border-stone-300 text-transparent'
            }`}
            aria-label="購入済みにする"
          >
            ✓
          </button>
        )}
        <button className="min-w-0 flex-1 text-left" onClick={selectMode ? onToggleSelect : (hasSource ? onExpand : undefined)}>
          <p className={`truncate font-bold text-stone-700 ${item.is_checked ? 'item-checked' : ''}`}>
            {item.name}
            {item.source === 'staple' && <span className="ml-1 text-[10px] font-normal text-stone-300">常備品</span>}
          </p>
        </button>
        <button
          onClick={selectMode ? onToggleSelect : onEditQuantity}
          className={`shrink-0 rounded-lg px-1.5 py-0.5 text-sm font-bold text-stone-500 active:bg-stone-100 ${item.is_checked ? 'item-checked' : ''}`}
        >
          {formatQuantityLine({ quantity: item.quantity, unit: item.unit, displayText: item.display_text }) || '数量を設定'}
        </button>
        {!selectMode && (
          <button onClick={onDelete} className="shrink-0 rounded-full px-1.5 text-stone-300 active:bg-stone-100" aria-label="削除">✕</button>
        )}
      </div>
      {expanded && hasSource && (
        <div className="ml-9 mt-2 flex flex-wrap gap-1.5">
          <span className="text-[11px] text-stone-400">使用メニュー：</span>
          {item.source_menu_names.map((name) => {
            const menu = menus.find((m) => m.name === name)
            return (
              <button
                key={name}
                onClick={() => menu && onOpenMenu(menu.id)}
                className="rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-bold text-orange-500"
              >
                {name}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ManualAddModal({ ingredients, onClose, onAdd }) {
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('')
  const [notScalable, setNotScalable] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)

  const suggestions = name.trim().length
    ? ingredients
        .filter((i) => i.name.toLowerCase().includes(name.trim().toLowerCase()))
        .slice(0, 6)
    : []

  function pickSuggestion(ing) {
    setName(ing.name)
    if (ing.default_unit) setUnit(ing.default_unit)
    setShowSuggestions(false)
  }

  return (
    <Modal title="食材を追加" onClose={onClose}>
      <div className="space-y-2">
        <div className="relative">
          <TextInput
            placeholder="食材名（例：牛乳）"
            value={name}
            onChange={(e) => { setName(e.target.value); setShowSuggestions(true) }}
            onFocus={() => setShowSuggestions(true)}
            autoFocus
          />
          {showSuggestions && suggestions.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-stone-100 bg-white shadow-lg">
              {suggestions.map((ing) => (
                <li key={ing.id}>
                  <button
                    type="button"
                    onClick={() => pickSuggestion(ing)}
                    className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm font-bold text-stone-700 active:bg-orange-50"
                  >
                    <span>{ing.name}</span>
                    {ing.is_staple && <span className="text-[10px] font-normal text-stone-300">常備品</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {!notScalable && (
          <div className="flex gap-1.5">
            <TextInput type="number" step="any" placeholder="数量" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-24" />
            <TextInput placeholder="単位" value={unit} onChange={(e) => setUnit(e.target.value)} className="flex-1" />
          </div>
        )}
        <label className="flex items-center gap-1.5 text-xs text-stone-400">
          <input type="checkbox" checked={notScalable} onChange={(e) => setNotScalable(e.target.checked)} />
          数量を指定しない
        </label>
        <PrimaryButton
          disabled={!name.trim()}
          onClick={() => onAdd({
            name: name.trim(),
            unit: notScalable ? '' : unit.trim(),
            quantity: notScalable || quantity === '' ? null : Number(quantity),
            displayText: null,
          })}
        >
          追加する
        </PrimaryButton>
      </div>
    </Modal>
  )
}

function EditQuantityModal({ item, onClose, onSave }) {
  const initialNotScalable = item.quantity === null || item.quantity === undefined
  const [quantity, setQuantity] = useState(initialNotScalable ? '' : String(item.quantity))
  const [unit, setUnit] = useState(item.unit || '')
  const [notScalable, setNotScalable] = useState(initialNotScalable)
  const [displayText, setDisplayText] = useState(item.display_text || '')

  return (
    <Modal title="数量を編集" onClose={onClose}>
      <div className="space-y-2">
        <p className="font-bold text-stone-700">{item.name}</p>
        {notScalable ? (
          <TextInput placeholder="例：半分、あまり、適量" value={displayText} onChange={(e) => setDisplayText(e.target.value)} autoFocus />
        ) : (
          <div className="flex gap-1.5">
            <TextInput type="number" step="any" placeholder="数量" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-24" autoFocus />
            <TextInput placeholder="単位" value={unit} onChange={(e) => setUnit(e.target.value)} className="flex-1" />
          </div>
        )}
        <label className="flex items-center gap-1.5 text-xs text-stone-400">
          <input type="checkbox" checked={notScalable} onChange={(e) => setNotScalable(e.target.checked)} />
          数量ではなくメモで残す（半分使った、あまり、など）
        </label>
        <PrimaryButton
          onClick={() => onSave({
            unit: notScalable ? '' : unit.trim(),
            quantity: notScalable || quantity === '' ? null : Number(quantity),
            display_text: notScalable ? (displayText.trim() || null) : null,
          })}
        >
          保存する
        </PrimaryButton>
      </div>
    </Modal>
  )
}

function StaplesPickerModal({ ingredients, onClose, onAdd }) {
  return (
    <Modal title="常備品を追加" onClose={onClose}>
      {ingredients.length === 0 ? (
        <EmptyState icon="🧂" title="常備品が登録されていません" description="メニュー一覧の「常備品」から登録できます" />
      ) : (
        <ul className="max-h-[50vh] space-y-1.5 overflow-y-auto">
          {ingredients.map((ing) => (
            <li key={ing.id}>
              <button onClick={() => onAdd(ing)} className="flex w-full items-center justify-between rounded-xl bg-stone-50 px-3 py-3 text-left active:bg-orange-50">
                <span className="font-bold text-stone-700">{ing.name}</span>
                <span className="text-xs text-stone-400">＋追加</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}
