import { useState } from 'react'
import { TextInput } from './ui'
import { describeAmount } from '../lib/ingredientMemory'

/**
 * 食材名の入力欄。登録済みの食材を候補に出し、選ぶと前回の分量を呼び出せる。
 * onPick(name, { fromSuggestion }) — 候補をタップしたとき / 登録済みの名前を打ち終えたとき
 */
export function IngredientNameField({ value, onChange, onPick, ingredients, amountFor, placeholder, autoFocus, className = '' }) {
  const [focused, setFocused] = useState(false)
  const q = value.trim()
  const suggestions = q
    ? ingredients
        .filter((i) => i.name.includes(q) && i.name !== q)
        .sort((a, b) => Number(b.name.startsWith(q)) - Number(a.name.startsWith(q)) || a.name.localeCompare(b.name, 'ja'))
        .slice(0, 6)
    : []

  return (
    <div className={`relative ${className}`}>
      <TextInput
        placeholder={placeholder}
        value={value}
        autoFocus={autoFocus}
        autoComplete="off"
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false)
          if (q && ingredients.some((i) => i.name === q)) onPick(q, { fromSuggestion: false })
        }}
      />
      {focused && suggestions.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-stone-100 bg-white shadow-lg">
          {suggestions.map((ing) => {
            const last = describeAmount(amountFor?.(ing.name))
            return (
              <li key={ing.id}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange(ing.name)
                    onPick(ing.name, { fromSuggestion: true })
                    setFocused(false)
                  }}
                  className="flex w-full items-center justify-between gap-2 px-3 py-3 text-left text-sm font-bold text-stone-700 active:bg-orange-50"
                >
                  <span className="truncate">{ing.name}</span>
                  <span className="shrink-0 text-[11px] font-normal text-stone-400">
                    {last ? `前回 ${last}` : ''}
                    {ing.is_staple && <span className="ml-1">常備品</span>}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
