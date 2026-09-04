import { useEffect, useState } from 'react'
import { useFamily } from '../lib/FamilyContext'
import { useMenus } from '../hooks/useMenus'
import { Card, Chip, GhostButton, PrimaryButton, ScreenHeader, SecondaryButton, TextInput, Textarea } from '../components/ui'

const CATEGORIES = ['肉', '魚', '野菜', 'ご飯', '麺', '圧力鍋', 'その他']

function emptyIngredient() {
  return { key: crypto.randomUUID(), name: '', quantity: '', unit: '', notScalable: false, displayText: '' }
}

export default function MenuEditScreen({ menuId, onBack, onDone }) {
  const { family } = useFamily()
  const { menus, saveMenu } = useMenus(family.id)
  const existing = menuId ? menus.find((m) => m.id === menuId) : null

  const [name, setName] = useState('')
  const [category, setCategory] = useState('その他')
  const [ingredients, setIngredients] = useState([emptyIngredient()])
  const [steps, setSteps] = useState([''])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (existing) {
      setName(existing.name)
      setCategory(existing.category)
      setIngredients(
        existing.ingredients.length
          ? existing.ingredients.map((ing) => ({
              key: crypto.randomUUID(),
              name: ing.name,
              quantity: typeof ing.quantity === 'number' ? String(ing.quantity) : '',
              unit: ing.unit || '',
              notScalable: ing.quantity === null,
              displayText: ing.displayText || '',
            }))
          : [emptyIngredient()]
      )
      setSteps(existing.steps.length ? existing.steps : [''])
    }
  }, [existing?.id])

  function updateIngredient(key, patch) {
    setIngredients((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  }
  function addIngredientRow() {
    setIngredients((rows) => [...rows, emptyIngredient()])
  }
  function removeIngredientRow(key) {
    setIngredients((rows) => (rows.length > 1 ? rows.filter((r) => r.key !== key) : rows))
  }

  function updateStep(index, value) {
    setSteps((rows) => rows.map((r, i) => (i === index ? value : r)))
  }
  function addStepRow() {
    setSteps((rows) => [...rows, ''])
  }
  function removeStepRow(index) {
    setSteps((rows) => (rows.length > 1 ? rows.filter((_, i) => i !== index) : rows))
  }

  async function handleSave() {
    if (!name.trim()) {
      setError('メニュー名を入力してください')
      return
    }
    const cleanIngredients = ingredients
      .filter((r) => r.name.trim())
      .map((r) => ({
        name: r.name.trim(),
        unit: r.notScalable ? '' : r.unit.trim(),
        quantity: r.notScalable ? null : (r.quantity === '' ? null : Number(r.quantity)),
        displayText: r.notScalable ? (r.displayText.trim() || '適量') : null,
      }))
    const cleanSteps = steps.map((s) => s.trim()).filter(Boolean)

    setSaving(true)
    setError('')
    try {
      await saveMenu({
        id: menuId || undefined,
        name: name.trim(),
        category,
        steps: cleanSteps,
        basePeople: existing?.base_people || 2,
        ingredients: cleanIngredients,
      })
      onDone()
    } catch (err) {
      console.error(err)
      setError('保存に失敗しました。もう一度お試しください。')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <ScreenHeader title={menuId ? 'メニューを編集' : '新しいメニュー'} onBack={onBack} />
      <div className="flex flex-col gap-3 px-4 pt-3 pb-10">
        <Card className="space-y-3">
          <label className="block text-sm font-bold text-stone-600">
            料理名
            <TextInput className="mt-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="例）豚の生姜焼き" />
          </label>
          <div>
            <p className="mb-1 text-sm font-bold text-stone-600">カテゴリー</p>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((c) => (
                <Chip key={c} active={category === c} onClick={() => setCategory(c)}>{c}</Chip>
              ))}
            </div>
          </div>
          <p className="text-xs text-stone-400">材料・分量は{existing?.base_people || 2}人分を基準に登録してください（人数変更時は自動計算されます）</p>
        </Card>

        <Card className="space-y-2">
          <h2 className="font-bold text-stone-700">材料</h2>
          {ingredients.map((row) => (
            <div key={row.key} className="space-y-1.5 rounded-xl bg-stone-50 p-2.5">
              <div className="flex gap-1.5">
                <TextInput placeholder="食材名" value={row.name} onChange={(e) => updateIngredient(row.key, { name: e.target.value })} className="flex-1" />
                <button onClick={() => removeIngredientRow(row.key)} className="rounded-lg px-2 text-stone-300 active:bg-stone-200" aria-label="削除">✕</button>
              </div>
              {row.notScalable ? (
                <TextInput placeholder="適量 / 少々 など" value={row.displayText} onChange={(e) => updateIngredient(row.key, { displayText: e.target.value })} />
              ) : (
                <div className="flex gap-1.5">
                  <TextInput type="number" step="any" placeholder="数量" value={row.quantity} onChange={(e) => updateIngredient(row.key, { quantity: e.target.value })} className="w-24" />
                  <TextInput placeholder="単位（g, 個, 大さじ…）" value={row.unit} onChange={(e) => updateIngredient(row.key, { unit: e.target.value })} className="flex-1" />
                </div>
              )}
              <label className="flex items-center gap-1.5 text-xs text-stone-400">
                <input type="checkbox" checked={row.notScalable} onChange={(e) => updateIngredient(row.key, { notScalable: e.target.checked })} />
                数量で計算できない（適量・少々など）
              </label>
            </div>
          ))}
          <GhostButton onClick={addIngredientRow} className="bg-white shadow-sm">＋ 材料を追加</GhostButton>
        </Card>

        <Card className="space-y-2">
          <h2 className="font-bold text-stone-700">作り方</h2>
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <span className="mt-2.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-100 text-[11px] font-bold text-orange-600">{i + 1}</span>
              <Textarea rows={2} value={step} onChange={(e) => updateStep(i, e.target.value)} placeholder="手順を入力" className="flex-1" />
              <button onClick={() => removeStepRow(i)} className="mt-2 rounded-lg px-2 text-stone-300 active:bg-stone-200" aria-label="削除">✕</button>
            </div>
          ))}
          <GhostButton onClick={addStepRow} className="bg-white shadow-sm">＋ 手順を追加</GhostButton>
        </Card>

        {error && <p className="text-sm font-semibold text-red-500">{error}</p>}

        <PrimaryButton onClick={handleSave} disabled={saving}>{saving ? '保存中…' : '保存する'}</PrimaryButton>
        <SecondaryButton onClick={onBack}>キャンセル</SecondaryButton>
      </div>
    </div>
  )
}
