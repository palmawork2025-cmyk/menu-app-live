import { useState } from 'react'
import { useFamily } from '../lib/FamilyContext'
import { useMenus } from '../hooks/useMenus'
import { getOrderedCategories } from '../lib/categories'
import { CategoryIcon } from '../lib/categoryIcons'
import { Card, GhostButton, PrimaryButton, ScreenHeader, SecondaryButton, Stepper, TextInput } from '../components/ui'

export default function SettingsScreen({ onBack }) {
  const { family, displayName, updatePeopleCount, updateFamilyName, updateCategoryOrder, leaveFamily } = useFamily()
  const { menus } = useMenus(family.id)
  const [copied, setCopied] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState(family.name)
  const [savingName, setSavingName] = useState(false)

  const orderedCategories = getOrderedCategories(menus, family.category_order)

  async function moveCategory(index, direction) {
    const next = [...orderedCategories]
    const target = index + direction
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    await updateCategoryOrder(next)
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(family.join_code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard API unavailable — silently ignore, the code is shown on screen anyway
    }
  }

  async function handleSaveName() {
    setSavingName(true)
    try {
      await updateFamilyName(nameDraft)
      setEditingName(false)
    } finally {
      setSavingName(false)
    }
  }

  return (
    <div>
      <ScreenHeader title="設定" onBack={onBack} />
      <div className="flex flex-col gap-3 px-4 pt-3 pb-10">
        <Card className="space-y-2">
          <p className="text-xs font-bold text-stone-400">家族ルーム</p>
          {editingName ? (
            <div className="space-y-2">
              <TextInput value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} maxLength={30} autoFocus />
              <div className="grid grid-cols-2 gap-2">
                <SecondaryButton onClick={() => { setEditingName(false); setNameDraft(family.name) }}>キャンセル</SecondaryButton>
                <PrimaryButton onClick={handleSaveName} disabled={savingName || !nameDraft.trim()}>{savingName ? '保存中…' : '保存する'}</PrimaryButton>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-lg font-black text-stone-800">{family.name}</p>
              <GhostButton onClick={() => setEditingName(true)}>編集</GhostButton>
            </div>
          )}
        </Card>

        <Card className="space-y-2">
          <p className="text-xs font-bold text-stone-400">共有コード</p>
          <p className="text-3xl font-black tracking-[0.3em] text-orange-500">{family.join_code}</p>
          <p className="text-xs text-stone-400">家族にこのコードを伝えると、同じ献立・買い物リストを共有できます。</p>
          <SecondaryButton onClick={handleCopy}>{copied ? 'コピーしました ✓' : 'コードをコピー'}</SecondaryButton>
        </Card>

        <Card className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-stone-400">基本人数</p>
            <p className="text-sm text-stone-500">レシピの分量計算に使われます</p>
          </div>
          <Stepper value={family.people_count} onChange={updatePeopleCount} />
        </Card>

        <Card className="space-y-2">
          <p className="text-xs font-bold text-stone-400">カテゴリーの並び順</p>
          <p className="text-xs text-stone-400">メニュー一覧・献立の絞り込みチップの並び順を変更できます</p>
          <ul className="divide-y divide-stone-100">
            {orderedCategories.map((c, i) => (
              <li key={c} className="flex items-center gap-2 py-2">
                <CategoryIcon category={c} className="h-7 w-7" />
                <span className="flex-1 font-bold text-stone-700">{c}</span>
                <button
                  onClick={() => moveCategory(i, -1)}
                  disabled={i === 0}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-100 text-stone-500 disabled:opacity-30"
                  aria-label="上に移動"
                >
                  ▲
                </button>
                <button
                  onClick={() => moveCategory(i, 1)}
                  disabled={i === orderedCategories.length - 1}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-100 text-stone-500 disabled:opacity-30"
                  aria-label="下に移動"
                >
                  ▼
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <p className="text-xs font-bold text-stone-400">あなたの呼び名</p>
          <p className="font-bold text-stone-700">{displayName || '家族'}</p>
        </Card>

        <GhostButton onClick={leaveFamily} className="mx-auto mt-4 text-stone-400">この端末を家族ルームから切り離す</GhostButton>
      </div>
    </div>
  )
}
