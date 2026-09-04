import { useState } from 'react'
import { useFamily } from '../lib/FamilyContext'
import { useMenus } from '../hooks/useMenus'
import { useShoppingList } from '../hooks/useShoppingList'
import { scaleQuantity, formatQuantityLine } from '../lib/quantity'
import { Card, GhostButton, PrimaryButton, ScreenHeader, SecondaryButton, Spinner } from '../components/ui'

const CATEGORY_ICON = { 肉: '🥩', 魚: '🐟', 野菜: '🥦', ご飯: '🍚', 麺: '🍜', 圧力鍋: '🍲', その他: '🍽️' }

export default function MenuDetailScreen({ menuId, onBack, onEdit }) {
  const { family, displayName } = useFamily()
  const { menus, loading, deleteMenu } = useMenus(family.id)
  const { addFromMenuLines } = useShoppingList(family.id)
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const menu = menus.find((m) => m.id === menuId)

  if (loading && !menu) return <Spinner />
  if (!menu) {
    return (
      <div>
        <ScreenHeader title="メニュー" onBack={onBack} />
        <p className="px-4 py-10 text-center text-sm text-stone-400">このメニューは見つかりませんでした。</p>
      </div>
    )
  }

  const people = family.people_count

  async function handleAddToShoppingList() {
    setAdding(true)
    const lines = menu.ingredients
      .filter((ing) => !ing.isStaple)
      .map((ing) => ({
        name: ing.name,
        unit: ing.unit,
        quantity: typeof ing.quantity === 'number' ? scaleQuantity(ing.quantity, menu.base_people, people) : null,
        displayText: ing.displayText,
        menuName: menu.name,
      }))
    try {
      await addFromMenuLines(lines, displayName)
      setAdded(true)
      setTimeout(() => setAdded(false), 2000)
    } finally {
      setAdding(false)
    }
  }

  async function handleDelete() {
    await deleteMenu(menu.id)
    onBack()
  }

  return (
    <div>
      <ScreenHeader
        title={menu.name}
        onBack={onBack}
        right={<GhostButton onClick={() => onEdit(menu.id)}>編集</GhostButton>}
      />
      <div className="flex flex-col gap-3 px-4 pt-3 pb-8">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{CATEGORY_ICON[menu.category] || '🍽️'}</span>
          <span className="rounded-full bg-orange-100 px-3 py-0.5 text-xs font-bold text-orange-600">{menu.category}</span>
          <span className="text-xs text-stone-400">{people}人分で表示中</span>
        </div>

        <Card>
          <h2 className="mb-2 font-bold text-stone-700">材料</h2>
          <ul className="divide-y divide-stone-100">
            {menu.ingredients.map((ing) => (
              <li key={ing.menuIngredientId} className="flex items-center justify-between py-2 text-sm">
                <span className="text-stone-600">{ing.name}{ing.isStaple && <span className="ml-1 text-[10px] text-stone-300">(常備品)</span>}</span>
                <span className="font-bold text-stone-700">
                  {formatQuantityLine({
                    quantity: typeof ing.quantity === 'number' ? scaleQuantity(ing.quantity, menu.base_people, people) : null,
                    unit: ing.unit,
                    displayText: ing.displayText,
                  })}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h2 className="mb-2 font-bold text-stone-700">作り方</h2>
          <ol className="space-y-2.5">
            {menu.steps.map((step, i) => (
              <li key={i} className="flex gap-2 text-sm text-stone-600">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-100 text-[11px] font-bold text-orange-600">{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </Card>

        <PrimaryButton onClick={handleAddToShoppingList} disabled={adding}>
          {added ? '追加しました ✓' : adding ? '追加中…' : '🛒 買い物リストに追加'}
        </PrimaryButton>

        {confirmingDelete ? (
          <Card className="space-y-2 border border-red-100">
            <p className="text-sm text-stone-600">「{menu.name}」を削除しますか？この操作は元に戻せません。</p>
            <div className="flex gap-2">
              <SecondaryButton onClick={() => setConfirmingDelete(false)}>キャンセル</SecondaryButton>
              <button onClick={handleDelete} className="w-full rounded-2xl bg-red-500 py-3.5 text-base font-bold text-white active:bg-red-600">削除する</button>
            </div>
          </Card>
        ) : (
          <GhostButton onClick={() => setConfirmingDelete(true)} className="mx-auto text-red-400">このメニューを削除</GhostButton>
        )}
      </div>
    </div>
  )
}
