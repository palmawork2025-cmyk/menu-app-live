import { useMemo } from 'react'
import { useFamily } from '../lib/FamilyContext'
import { useMealPlan } from '../hooks/useMealPlan'
import { useMenus } from '../hooks/useMenus'
import { todayISO, toISODate, addDays } from '../lib/dates'
import { buildRecommendation } from '../lib/recommend'
import { Card, EmptyState, PrimaryButton, SecondaryButton, Spinner } from '../components/ui'
import homeBanner from '../assets/home-banner.png'

const HISTORY_DAYS = 14

export default function HomeScreen({ onOpenSettings, onGoShopping, onGoPlan, onOpenMenu }) {
  const { family, displayName } = useFamily()
  const historyStart = toISODate(addDays(new Date(), -HISTORY_DAYS))
  const historyEnd = toISODate(addDays(new Date(), -1)) // up to yesterday
  const { entries, loading } = useMealPlan(family.id, historyStart, historyEnd)
  const { menus } = useMenus(family.id)

  const recommendation = useMemo(() => buildRecommendation(entries, menus), [entries, menus])

  return (
    <div className="flex flex-col gap-4 px-4 pt-[calc(env(safe-area-inset-top)+1rem)]">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-orange-400">{family.name}</p>
          <h1 className="text-lg font-black text-stone-800">こんにちは、{displayName || '家族'}さん</h1>
        </div>
        <button onClick={onOpenSettings} className="rounded-full bg-white p-2.5 text-lg shadow-sm active:bg-stone-50" aria-label="設定">
          ⚙️
        </button>
      </header>

      <img src={homeBanner} alt="" className="aspect-[3/2] w-full rounded-3xl object-cover shadow-sm" />

      <Card>
        <p className="text-xs font-bold text-stone-400">🩺 献立バランスのアドバイス</p>
        {loading ? (
          <Spinner />
        ) : !recommendation.hasHistory ? (
          <div className="py-4">
            <EmptyState icon="📅" title="まだ献立の記録がありません" description="献立を登録すると、直近2週間の傾向からおすすめを提案します" />
            <div className="mt-3">
              <SecondaryButton onClick={onGoPlan}>献立を決める</SecondaryButton>
            </div>
          </div>
        ) : (
          <div className="mt-2 space-y-3">
            {recommendation.messages.map((msg, i) => (
              <p key={i} className="rounded-xl bg-orange-50 px-3 py-2.5 text-sm font-bold text-stone-700">{msg}</p>
            ))}
            {recommendation.suggestedMenus.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-bold text-stone-400">こんなメニューはいかがですか？</p>
                <ul className="space-y-1.5">
                  {recommendation.suggestedMenus.map((m) => (
                    <li key={m.id}>
                      <button
                        onClick={() => onOpenMenu?.(m.id)}
                        className="flex w-full items-center justify-between rounded-xl bg-stone-50 px-3 py-2.5 text-left active:bg-orange-50"
                      >
                        <span className="font-bold text-stone-700">{m.name}</span>
                        <span className="text-xs text-stone-400">{m.category}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Card>

      <PrimaryButton onClick={onGoShopping}>🛒 買い物リストを見る</PrimaryButton>
    </div>
  )
}
