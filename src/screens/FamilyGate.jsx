import { useState } from 'react'
import { useFamily } from '../lib/FamilyContext'
import { PrimaryButton, SecondaryButton, TextInput, Card } from '../components/ui'

export default function FamilyGate() {
  const { createFamily, joinFamily } = useFamily()
  const [mode, setMode] = useState('choose') // choose | create | join
  const [familyName, setFamilyName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate(e) {
    e.preventDefault()
    if (!familyName.trim()) return
    setBusy(true)
    setError('')
    try {
      await createFamily(familyName, displayName)
    } catch (err) {
      setError('作成に失敗しました。もう一度お試しください。')
      console.error(err)
    } finally {
      setBusy(false)
    }
  }

  async function handleJoin(e) {
    e.preventDefault()
    if (!joinCode.trim()) return
    setBusy(true)
    setError('')
    try {
      await joinFamily(joinCode, displayName)
    } catch (err) {
      if (err?.message?.includes('INVALID_CODE')) {
        setError('共有コードが見つかりませんでした。もう一度ご確認ください。')
      } else {
        setError('参加に失敗しました。もう一度お試しください。')
      }
      console.error(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col justify-center bg-gradient-to-b from-orange-50 to-white px-6 py-10">
      <div className="mb-8 text-center">
        <div className="text-5xl">🍚</div>
        <h1 className="mt-3 text-2xl font-black text-stone-800">我が家の献立</h1>
        <p className="mt-1 text-sm text-stone-400">家族みんなで献立と買い物リストを共有しよう</p>
      </div>

      {mode === 'choose' && (
        <div className="space-y-3">
          <PrimaryButton onClick={() => setMode('create')}>はじめて使う（家族ルームを作る）</PrimaryButton>
          <SecondaryButton onClick={() => setMode('join')}>共有コードで参加する</SecondaryButton>
        </div>
      )}

      {mode === 'create' && (
        <form onSubmit={handleCreate} className="space-y-3">
          <Card className="space-y-3">
            <label className="block text-sm font-bold text-stone-600">
              家族ルーム名
              <TextInput
                className="mt-1"
                placeholder="例）田中家"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                maxLength={30}
                autoFocus
              />
            </label>
            <label className="block text-sm font-bold text-stone-600">
              あなたの呼び名
              <TextInput
                className="mt-1"
                placeholder="例）お母さん"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={20}
              />
            </label>
          </Card>
          {error && <p className="text-sm font-semibold text-red-500">{error}</p>}
          <PrimaryButton type="submit" disabled={busy || !familyName.trim()}>
            {busy ? '作成中…' : 'ルームを作る'}
          </PrimaryButton>
          <SecondaryButton type="button" onClick={() => setMode('choose')}>戻る</SecondaryButton>
        </form>
      )}

      {mode === 'join' && (
        <form onSubmit={handleJoin} className="space-y-3">
          <Card className="space-y-3">
            <label className="block text-sm font-bold text-stone-600">
              共有コード（6文字）
              <TextInput
                className="mt-1 text-center text-xl tracking-[0.3em] uppercase"
                placeholder="XXXXXX"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={6}
                autoFocus
              />
            </label>
            <label className="block text-sm font-bold text-stone-600">
              あなたの呼び名
              <TextInput
                className="mt-1"
                placeholder="例）お父さん"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={20}
              />
            </label>
          </Card>
          {error && <p className="text-sm font-semibold text-red-500">{error}</p>}
          <PrimaryButton type="submit" disabled={busy || joinCode.trim().length < 6}>
            {busy ? '参加中…' : '参加する'}
          </PrimaryButton>
          <SecondaryButton type="button" onClick={() => setMode('choose')}>戻る</SecondaryButton>
        </form>
      )}
    </div>
  )
}
