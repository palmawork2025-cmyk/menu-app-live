import { useFamily } from '../lib/FamilyContext'
import { useMealPlan } from '../hooks/useMealPlan'
import { todayISO, formatDateLabel } from '../lib/dates'
import { Card, EmptyState, PrimaryButton, SecondaryButton, Spinner } from '../components/ui'

export default function HomeScreen({ onOpenSettings, onGoShopping, onGoPlan }) {
  const { family, displayName } = useFamily()
  const today = todayISO()
  const { entriesByDate, loading } = useMealPlan(family.id, today, today)
  const todayMenus = entriesByDate[today] || []

  return (
    <div className="flex flex-col gap-4 px-4 pt-4">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-orange-400">{family.name}</p>
          <h1 className="text-lg font-black text-stone-800">こんにちは、{displayName || '家族'}さん</h1>
        </div>
        <button onClick={onOpenSettings} className="rounded-full bg-white p-2.5 text-lg shadow-sm active:bg-stone-50" aria-label="設定">
          ⚙️
        </button>
      </header>

      <Card>
        <p className="text-xs font-bold text-stone-400">{formatDateLabel(today)}の献立</p>
        {loading ? (
          <Spinner />
        ) : todayMenus.length === 0 ? (
          <div className="py-4">
            <EmptyState icon="🍽️" title="今日の献立はまだです" description="献立タブから追加できます" />
            <div className="mt-3">
              <SecondaryButton onClick={onGoPlan}>献立を決める</SecondaryButton>
            </div>
          </div>
        ) : (
          <ul className="mt-2 space-y-2">
            {todayMenus.map((e) => (
              <li key={e.id} className="flex items-center gap-2 rounded-xl bg-orange-50 px-3 py-2.5">
                <span className="text-xl">🍳</span>
                <span className="font-bold text-stone-700">{e.menus?.name}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <PrimaryButton onClick={onGoShopping}>🛒 買い物リストを見る</PrimaryButton>
    </div>
  )
}
