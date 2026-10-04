import { useMemo, useState } from 'react'
import { useFamily } from '../lib/FamilyContext'
import { useMenus } from '../hooks/useMenus'
import { useIngredients } from '../hooks/useIngredients'
import { useShoppingList } from '../hooks/useShoppingList'
import { supabase } from '../lib/supabaseClient'
import { scaleQuantity, mergeIngredientLines, formatQuantityLine } from '../lib/quantity'
import { todayISO, getWeekStart, getWeekDates, addDays } from '../lib/dates'
import { getSections, groupBySection, sectionOf } from '../lib/groceryOrder'
import { buildLastAmounts, ensureIngredientRegistered, rememberAmount, shoppingAmountFor } from '../lib/ingredientMemory'
import { IngredientNameField } from '../components/IngredientNameField'
import { UnitPicker } from '../lib/units'
import { useDragReorder } from '../hooks/useDragReorder'
import { Card, EmptyState, GhostButton, Modal, PrimaryButton, SecondaryButton, Spinner, TextInput } from '../components/ui'

export default function ShoppingListScreen({ onOpenMenu }) {
  const { family, displayName, updateGrocery } = useFamily()
  const { menus } = useMenus(family.id)
  const { ingredients } = useIngredients(family.id)
  const { items, loading, toggleChecked, updateItem, deleteItem, deleteItems, clearChecked, clearAll, reorderItems, addManualItem, addFromMenuLines } = useShoppingList(family.id)

  const [busyScope, setBusyScope] = useState(null)
  const [showManual, setShowManual] = useState(false)
  const [showStaples, setShowStaples] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [notice, setNotice] = useState('')
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [editingItem, setEditingItem] = useState(null)
  const [confirmingClearAll, setConfirmingClearAll] = useState(false)

  async function handleClearAll() {
    await clearAll()
    setConfirmingClearAll(false)
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
    await deleteItems(Array.from(selectedIds))
    setSelectedIds(new Set())
    setSelectMode(false)
  }

  const [showSectionOrder, setShowSectionOrder] = useState(false)
  const grocery = family.grocery
  const sections = getSections(grocery)
  const recipeAmounts = useMemo(() => buildLastAmounts(menus), [menus])
  const amountFor = (name) => shoppingAmountFor(name, grocery, recipeAmounts)

  const uncheckedGroups = groupBySection(items.filter((i) => !i.is_checked), grocery)
  const checked = items.filter((i) => i.is_checked)

  function flash(message) {
    setNotice(message)
    setTimeout(() => setNotice(''), 3000)
  }

  async function saveSectionOrder(ids) {
    try {
      await reorderItems(ids)
    } catch (err) {
      console.error(err)
      flash('並び替えの保存に失敗しました')
    }
  }

  /** 食材の売り場・分量を家族で共有して覚えておく(次回の追加時に使う) */
  async function rememberItem(name, { amount, section } = {}) {
    try {
      await updateGrocery((g) => {
        let next = amount ? rememberAmount(g, name, amount) : g
        if (section) {
          const overrides = { ...(next.overrides || {}) }
          delete overrides[name]
          if (section !== sectionOf(name, { ...next, overrides })) overrides[name] = section
          next = { ...next, overrides }
        }
        return next
      })
    } catch (err) {
      console.error(err) // 覚える処理は補助なので、失敗しても買い物リスト自体は保存済み
    }
  }

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
          <div className="flex gap-1.5">
            <GhostButton onClick={toggleSelectMode} className={selectMode ? 'bg-stone-200' : 'bg-white shadow-sm'}>
              {selectMode ? 'キャンセル' : '選択して削除'}
            </GhostButton>
            <GhostButton onClick={() => setConfirmingClearAll(true)} className="bg-white text-red-500 shadow-sm">
              全て削除
            </GhostButton>
          </div>
        )}
      </div>

      {confirmingClearAll && (
        <div className="rounded-2xl bg-red-50 p-3">
          <p className="text-sm font-bold text-red-600">買い物リストを全て削除します。よろしいですか？</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <SecondaryButton onClick={() => setConfirmingClearAll(false)}>キャンセル</SecondaryButton>
            <button onClick={handleClearAll} className="w-full rounded-2xl bg-red-500 py-3.5 text-base font-bold text-white active:bg-red-600">
              全て削除する
            </button>
          </div>
        </div>
      )}

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
        <GhostButton onClick={() => setShowSectionOrder(true)} className="col-span-2 bg-white shadow-sm">⇅ 売り場の順番を変える</GhostButton>
      </div>

      {loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <EmptyState icon="🛒" title="買い物リストは空です" description="献立から追加するか、食材を直接追加できます" />
      ) : (
        <div className="space-y-3">
          {uncheckedGroups.length === 0 ? (
            <Card>
              <p className="text-center text-xs text-stone-300">未購入の食材はありません</p>
            </Card>
          ) : (
            uncheckedGroups.map((group) => (
              <SectionBlock
                key={group.section}
                section={group.section}
                items={group.items}
                onCommitOrder={saveSectionOrder}
                draggable={!selectMode}
                rowProps={(item) => ({
                  onToggle: () => toggleChecked(item.id, true),
                  onDelete: () => deleteItem(item.id),
                  onEditQuantity: () => setEditingItem(item),
                  expanded: expanded === item.id,
                  onExpand: () => setExpanded(expanded === item.id ? null : item.id),
                  onOpenMenu,
                  menus,
                  selectMode,
                  selected: selectedIds.has(item.id),
                  onToggleSelect: () => toggleSelected(item.id),
                })}
              />
            ))
          )}

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
          amountFor={amountFor}
          sections={sections}
          sectionFor={(name) => sectionOf(name, grocery)}
          onClose={() => setShowManual(false)}
          onAdd={async ({ section, ...payload }) => {
            await addManualItem({ ...payload, addedBy: displayName })
            setShowManual(false)
            // 次回も使えるように食材を登録し、分量と売り場を覚えておく
            try {
              await ensureIngredientRegistered(family.id, ingredients, payload.name, payload.unit)
            } catch (err) {
              console.error(err)
            }
            await rememberItem(payload.name, {
              amount: { quantity: payload.quantity, unit: payload.unit, displayText: payload.displayText },
              section,
            })
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
          sections={sections}
          currentSection={sectionOf(editingItem.name, grocery)}
          onClose={() => setEditingItem(null)}
          onSave={async ({ section, ...patch }) => {
            const target = editingItem
            const movedSection = section !== sectionOf(target.name, grocery)
            // 売り場を移したら、移動先の売り場の最後に並べる
            await updateItem(target.id, movedSection ? { ...patch, sort_order: null } : patch)
            setEditingItem(null)
            await rememberItem(target.name, {
              amount: patch.display_text ? null : { quantity: patch.quantity, unit: patch.unit, displayText: null },
              section,
            })
          }}
        />
      )}

      {showSectionOrder && (
        <SectionOrderModal
          sections={sections}
          onClose={() => setShowSectionOrder(false)}
          onSave={async (nextSections, renamed) => {
            await updateGrocery((g) => {
              const overrides = {}
              for (const [name, sec] of Object.entries(g.overrides || {})) {
                const mapped = renamed[sec] ?? sec
                if (nextSections.includes(mapped)) overrides[name] = mapped
              }
              return { ...g, sections: nextSections, overrides }
            })
            setShowSectionOrder(false)
            flash('売り場の順番を保存しました')
          }}
        />
      )}
    </div>
  )
}

function ShoppingRow({
  item, onToggle, onDelete, onEditQuantity, expanded, onExpand, onOpenMenu, menus,
  selectMode = false, selected = false, onToggleSelect,
  rowRef, draggable = false, dragHandleProps = null, isDragging = false,
}) {
  const hasSource = item.source === 'menu' && (item.source_menu_names || []).length > 0
  return (
    <div ref={rowRef} className={`p-3 ${isDragging ? 'opacity-0' : ''}`}>
      <div className="flex items-center gap-3">
        {draggable && (
          <span
            {...dragHandleProps}
            className="shrink-0 cursor-grab px-0.5 text-lg text-stone-300 active:cursor-grabbing"
            style={{ touchAction: 'none' }}
            aria-label="ドラッグして並び替え"
          >
            ⠿
          </span>
        )}
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

function ManualAddModal({ ingredients, amountFor, sections, sectionFor, onClose, onAdd }) {
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('')
  const [notScalable, setNotScalable] = useState(false)
  const [section, setSection] = useState(null) // null = 自動(名前から判断)
  const [unitKey, setUnitKey] = useState(0) // UnitPicker を前回の単位で作り直すため
  const [adding, setAdding] = useState(false)
  const [recalled, setRecalled] = useState('')

  // 前回の分量・単位を呼び出す(候補を選んだとき、または数量が未入力のとき)
  function recall(pickedName, { fromSuggestion }) {
    if (!fromSuggestion && quantity !== '') return
    const ing = ingredients.find((i) => i.name === pickedName)
    const last = amountFor(pickedName)
    if (last && last.quantity !== null && last.quantity !== undefined) {
      setNotScalable(false)
      setQuantity(String(Math.round(last.quantity * 100) / 100))
      setUnit(last.unit || '')
      setRecalled('前回の分量を入れました')
    } else if (ing?.default_unit) {
      setUnit(ing.default_unit)
    }
    setUnitKey((k) => k + 1)
  }

  const autoSection = sectionFor(name.trim() || ' ')
  const chosenSection = section || autoSection

  async function submit() {
    if (adding) return
    setAdding(true)
    try {
      await onAdd({
        name: name.trim(),
        unit: notScalable ? '' : unit.trim(),
        quantity: notScalable || quantity === '' ? null : Number(quantity),
        displayText: null,
        section: chosenSection,
      })
    } finally {
      setAdding(false)
    }
  }

  return (
    <Modal title="食材を追加" onClose={onClose}>
      <div className="space-y-2">
        <IngredientNameField
          placeholder="食材名（例：牛乳）"
          value={name}
          onChange={(v) => { setName(v); setRecalled('') }}
          onPick={recall}
          ingredients={ingredients}
          amountFor={amountFor}
          autoFocus
        />
        {!notScalable && (
          <div className="flex gap-1.5">
            <div className="w-24 shrink-0">
              <TextInput type="number" step="any" inputMode="decimal" placeholder="数量" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
            <div className="min-w-0 flex-1">
              <UnitPicker key={unitKey} value={unit} onChange={setUnit} />
            </div>
          </div>
        )}
        {recalled && <p className="text-[11px] font-bold text-orange-500">{recalled}</p>}
        <SectionChips sections={sections} value={chosenSection} onChange={setSection} />
        <label className="flex items-center gap-1.5 text-xs text-stone-400">
          <input type="checkbox" checked={notScalable} onChange={(e) => setNotScalable(e.target.checked)} />
          数量を指定しない
        </label>
        <PrimaryButton disabled={!name.trim() || adding} onClick={submit}>
          {adding ? '追加中…' : '追加する'}
        </PrimaryButton>
      </div>
    </Modal>
  )
}

function EditQuantityModal({ item, sections, currentSection, onClose, onSave }) {
  const [section, setSection] = useState(currentSection)
  const initialNotScalable = item.quantity === null || item.quantity === undefined
  const [quantity, setQuantity] = useState(initialNotScalable ? '' : String(item.quantity))
  const [unit, setUnit] = useState(item.unit || '')
  const [notScalable, setNotScalable] = useState(initialNotScalable)
  const [displayText, setDisplayText] = useState(item.display_text || '')

  return (
    <Modal title="数量・売り場を編集" onClose={onClose}>
      <div className="space-y-2">
        <p className="font-bold text-stone-700">{item.name}</p>
        {notScalable ? (
          <TextInput placeholder="例：半分、あまり、適量" value={displayText} onChange={(e) => setDisplayText(e.target.value)} autoFocus />
        ) : (
          <div className="flex gap-1.5">
            <div className="w-24 shrink-0">
              <TextInput type="number" step="any" placeholder="数量" value={quantity} onChange={(e) => setQuantity(e.target.value)} autoFocus />
            </div>
            <div className="min-w-0 flex-1">
              <UnitPicker value={unit} onChange={setUnit} />
            </div>
          </div>
        )}
        <label className="flex items-center gap-1.5 text-xs text-stone-400">
          <input type="checkbox" checked={notScalable} onChange={(e) => setNotScalable(e.target.checked)} />
          数量ではなくメモで残す（半分使った、あまり、など）
        </label>
        <SectionChips sections={sections} value={section} onChange={setSection} />
        <PrimaryButton
          onClick={() => onSave({
            unit: notScalable ? '' : unit.trim(),
            quantity: notScalable || quantity === '' ? null : Number(quantity),
            display_text: notScalable ? (displayText.trim() || null) : null,
            section,
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

/** 売り場ごとのまとまり。売り場の中はドラッグで並び替えできる */
function SectionBlock({ section, items, onCommitOrder, draggable, rowProps }) {
  const byId = new Map(items.map((i) => [i.id, i]))
  const { order, overlay, setRowRef, dragHandleProps } = useDragReorder(items.map((i) => i.id), onCommitOrder)
  const rows = order.map((id) => byId.get(id)).filter(Boolean)
  const dragged = overlay ? byId.get(overlay.id) : null

  return (
    <div>
      <p className="mb-1 px-1 text-xs font-black text-orange-500">{section}</p>
      <Card className="divide-y divide-stone-100 !p-0">
        {rows.map((item) => (
          <ShoppingRow
            key={item.id}
            rowRef={(el) => setRowRef(item.id, el)}
            item={item}
            {...rowProps(item)}
            draggable={draggable}
            dragHandleProps={draggable ? dragHandleProps(item.id) : null}
            isDragging={overlay?.id === item.id}
          />
        ))}
      </Card>
      {overlay && dragged && (
        <div
          style={{ position: 'fixed', left: overlay.x, top: overlay.y, width: overlay.width, height: overlay.height, zIndex: 50 }}
          className="pointer-events-none rounded-2xl bg-white shadow-xl ring-2 ring-orange-300"
        >
          <ShoppingRow
            item={dragged}
            {...rowProps(dragged)}
            expanded={false}
            selectMode={false}
            draggable
            dragHandleProps={null}
          />
        </div>
      )}
    </div>
  )
}

function SectionChips({ sections, value, onChange }) {
  return (
    <div>
      <p className="mb-1 text-xs font-bold text-stone-400">売り場（次回からもこの売り場に入ります）</p>
      <div className="flex flex-wrap gap-1.5">
        {sections.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            className={`rounded-full px-3 py-1.5 text-xs font-bold ${value === s ? 'bg-orange-500 text-white' : 'border border-stone-200 bg-white text-stone-500'}`}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}

/** 売り場の並び替え・追加・名前変更・削除。スーパーを回る順に並べておく */
function SectionOrderModal({ sections, onClose, onSave }) {
  const [rows, setRows] = useState(() => sections.map((s) => ({ key: s, original: s, name: s })))
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function move(index, dir) {
    const target = index + dir
    if (target < 0 || target >= rows.length) return
    setRows((r) => {
      const next = [...r]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  function addSection() {
    const trimmed = newName.trim()
    if (!trimmed) return
    if (rows.some((r) => r.name === trimmed)) {
      setError('同じ名前の売り場があります')
      return
    }
    setRows((r) => {
      const otherIndex = r.findIndex((x) => x.original === 'その他')
      const row = { key: crypto.randomUUID(), original: null, name: trimmed }
      return otherIndex >= 0 ? [...r.slice(0, otherIndex), row, ...r.slice(otherIndex)] : [...r, row]
    })
    setNewName('')
    setError('')
  }

  async function save() {
    const names = rows.map((r) => r.name.trim())
    if (names.some((n) => !n)) return setError('売り場の名前を入力してください')
    if (new Set(names).size !== names.length) return setError('同じ名前の売り場があります')
    const renamed = {}
    for (const r of rows) if (r.original && r.original !== r.name.trim()) renamed[r.original] = r.name.trim()
    setSaving(true)
    try {
      await onSave(names, renamed)
    } catch (err) {
      console.error(err)
      setError('保存できませんでした。もう一度お試しください。')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="売り場の順番" onClose={onClose}>
      <p className="mb-2 text-xs text-stone-400">いつも行くスーパーを回る順に並べると、買い物リストがその順番で表示されます。</p>
      <ul className="mb-3 space-y-1.5">
        {rows.map((r, i) => (
          <li key={r.key} className="flex items-center gap-1.5 rounded-xl bg-stone-50 px-2 py-1.5">
            <span className="w-5 text-center text-xs font-black text-orange-400">{i + 1}</span>
            <input
              value={r.name}
              disabled={r.original === 'その他'}
              onChange={(e) => setRows((rs) => rs.map((x) => (x.key === r.key ? { ...x, name: e.target.value } : x)))}
              className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-1.5 py-1.5 text-sm font-bold text-stone-700 outline-none focus:border-orange-300 focus:bg-white disabled:text-stone-400"
            />
            <button onClick={() => move(i, -1)} disabled={i === 0} className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-stone-500 disabled:opacity-30" aria-label="上に移動">▲</button>
            <button onClick={() => move(i, 1)} disabled={i === rows.length - 1} className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-stone-500 disabled:opacity-30" aria-label="下に移動">▼</button>
            {r.original !== 'その他' ? (
              <button onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))} className="flex h-9 w-9 items-center justify-center rounded-lg text-stone-300 active:bg-stone-200" aria-label="削除">✕</button>
            ) : (
              <span className="w-9" />
            )}
          </li>
        ))}
      </ul>
      <div className="mb-3 flex gap-1.5">
        <TextInput placeholder="売り場を追加（例：冷凍食品）" value={newName} onChange={(e) => setNewName(e.target.value)} className="flex-1" />
        <GhostButton onClick={addSection} className="shrink-0 bg-orange-100 text-orange-600">追加</GhostButton>
      </div>
      <p className="mb-2 text-[11px] text-stone-400">削除した売り場の食材は「その他」に入ります。</p>
      {error && <p className="mb-2 text-xs font-bold text-red-500">{error}</p>}
      <PrimaryButton onClick={save} disabled={saving}>{saving ? '保存中…' : '保存する'}</PrimaryButton>
    </Modal>
  )
}
