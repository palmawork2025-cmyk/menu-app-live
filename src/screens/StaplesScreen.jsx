import { useState } from 'react'
import { useFamily } from '../lib/FamilyContext'
import { useIngredients } from '../hooks/useIngredients'
import { Card, EmptyState, PrimaryButton, ScreenHeader, Spinner, TextInput } from '../components/ui'

export default function StaplesScreen({ onBack }) {
  const { family } = useFamily()
  const { ingredients, loading, addIngredient, toggleStaple, deleteIngredient } = useIngredients(family.id)
  const [name, setName] = useState('')
  const [unit, setUnit] = useState('')
  const [adding, setAdding] = useState(false)

  const staples = ingredients.filter((i) => i.is_staple)
  const others = ingredients.filter((i) => !i.is_staple)

  async function handleAdd() {
    if (!name.trim()) return
    setAdding(true)
    try {
      await addIngredient(name, unit, true)
      setName('')
      setUnit('')
    } finally {
      setAdding(false)
    }
  }

  return (
    <div>
      <ScreenHeader title="常備品" onBack={onBack} />
      <div className="flex flex-col gap-3 px-4 pt-3 pb-10">
        <p className="text-xs text-stone-400">常備品は献立を買い物リストに追加しても表示されません。切れたときは買い物リストから手動で追加できます。</p>

        <Card className="space-y-2">
          <h2 className="font-bold text-stone-700">常備品を追加</h2>
          <div className="flex gap-1.5">
            <div className="min-w-0 flex-1">
              <TextInput placeholder="食材名（例：醤油）" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="w-20 shrink-0">
              <TextInput placeholder="単位" value={unit} onChange={(e) => setUnit(e.target.value)} />
            </div>
          </div>
          <PrimaryButton onClick={handleAdd} disabled={adding || !name.trim()}>追加する</PrimaryButton>
        </Card>

        {loading ? (
          <Spinner />
        ) : (
          <>
            <Card className="!p-0 divide-y divide-stone-100">
              <p className="p-3 text-xs font-bold text-stone-400">常備品一覧（{staples.length}）</p>
              {staples.length === 0 ? (
                <p className="p-4 text-center text-xs text-stone-300">まだありません</p>
              ) : (
                staples.map((ing) => (
                  <div key={ing.id} className="flex items-center justify-between px-4 py-2.5">
                    <span className="font-bold text-stone-700">{ing.name}</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => toggleStaple(ing.id, false)} className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-bold text-stone-500 active:bg-stone-200">
                        常備品を解除
                      </button>
                      <button onClick={() => deleteIngredient(ing.id)} className="rounded-full px-1.5 text-stone-300 active:bg-stone-100" aria-label="削除">✕</button>
                    </div>
                  </div>
                ))
              )}
            </Card>

            <Card className="!p-0 divide-y divide-stone-100">
              <p className="p-3 text-xs font-bold text-stone-400">その他の食材（{others.length}）</p>
              {others.length === 0 ? (
                <EmptyState icon="🥕" title="食材がありません" />
              ) : (
                others.map((ing) => (
                  <div key={ing.id} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-stone-600">{ing.name}</span>
                    <button onClick={() => toggleStaple(ing.id, true)} className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-bold text-orange-600 active:bg-orange-200">
                      常備品にする
                    </button>
                  </div>
                ))
              )}
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
