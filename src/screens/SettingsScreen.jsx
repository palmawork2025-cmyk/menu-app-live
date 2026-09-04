import { useState } from 'react'
import { useFamily } from '../lib/FamilyContext'
import { Card, GhostButton, ScreenHeader, SecondaryButton, Stepper } from '../components/ui'

export default function SettingsScreen({ onBack }) {
  const { family, displayName, updatePeopleCount, leaveFamily } = useFamily()
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(family.join_code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard API unavailable — silently ignore, the code is shown on screen anyway
    }
  }

  return (
    <div>
      <ScreenHeader title="設定" onBack={onBack} />
      <div className="flex flex-col gap-3 px-4 pt-3 pb-10">
        <Card className="space-y-1">
          <p className="text-xs font-bold text-stone-400">家族ルーム</p>
          <p className="text-lg font-black text-stone-800">{family.name}</p>
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

        <Card>
          <p className="text-xs font-bold text-stone-400">あなたの呼び名</p>
          <p className="font-bold text-stone-700">{displayName || '家族'}</p>
        </Card>

        <GhostButton onClick={leaveFamily} className="mx-auto mt-4 text-stone-400">この端末を家族ルームから切り離す</GhostButton>
      </div>
    </div>
  )
}
