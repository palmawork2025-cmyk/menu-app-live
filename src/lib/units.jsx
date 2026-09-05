import { useState } from 'react'
import { Select, TextInput } from '../components/ui'

// Ordered by how often they actually show up across this app's recipes,
// plus a few common extras.
export const UNIT_OPTIONS = [
  'g', 'ml', '個', '本', '枚', '大さじ', '小さじ', '袋', '切れ', '尾',
  '玉', '片', '丁', '杯', '株', '房', '束', 'パック', '缶', 'カップ',
]

const CUSTOM = '__custom__'
const NONE = ''

/**
 * Unit picker: a dropdown of common units, with a "その他（自由入力）"
 * option that reveals a free-text field for anything not in the list --
 * existing data uses ~26 different units, so a fixed list alone isn't enough.
 */
export function UnitPicker({ value, onChange, className = '' }) {
  const isKnown = value === NONE || UNIT_OPTIONS.includes(value)
  const [customMode, setCustomMode] = useState(!isKnown)

  function handleSelect(e) {
    const v = e.target.value
    if (v === CUSTOM) {
      setCustomMode(true)
      onChange('')
    } else {
      setCustomMode(false)
      onChange(v)
    }
  }

  if (customMode) {
    return (
      <div className={`flex gap-1.5 ${className}`}>
        <TextInput placeholder="単位を入力" value={value} onChange={(e) => onChange(e.target.value)} autoFocus className="flex-1" />
        <button
          type="button"
          onClick={() => { setCustomMode(false); onChange('') }}
          className="shrink-0 rounded-xl border border-stone-200 bg-white px-3 text-xs font-bold text-stone-500 active:bg-stone-100"
        >
          一覧から選ぶ
        </button>
      </div>
    )
  }

  return (
    <Select value={value} onChange={handleSelect} className={className}>
      <option value={NONE}>（単位なし）</option>
      {UNIT_OPTIONS.map((u) => (
        <option key={u} value={u}>{u}</option>
      ))}
      <option value={CUSTOM}>その他（自由入力）</option>
    </Select>
  )
}
