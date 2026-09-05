export function PrimaryButton({ children, className = '', ...props }) {
  return (
    <button
      className={`w-full rounded-2xl bg-orange-500 py-3.5 text-base font-bold text-white shadow-sm shadow-orange-200 transition active:scale-[0.98] active:bg-orange-600 disabled:opacity-40 disabled:active:scale-100 ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function SecondaryButton({ children, className = '', ...props }) {
  return (
    <button
      className={`w-full rounded-2xl border border-orange-200 bg-white py-3.5 text-base font-bold text-orange-600 transition active:scale-[0.98] active:bg-orange-50 disabled:opacity-40 ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function GhostButton({ children, className = '', ...props }) {
  return (
    <button
      className={`rounded-xl px-3 py-2 text-sm font-semibold text-stone-500 transition active:bg-stone-100 ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function Card({ children, className = '', ...props }) {
  return (
    <div className={`rounded-2xl bg-white p-4 shadow-sm shadow-stone-200/60 ${className}`} {...props}>
      {children}
    </div>
  )
}

export function TextInput({ className = '', ...props }) {
  return (
    <input
      className={`w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-base text-stone-800 outline-none placeholder:text-stone-300 focus:border-orange-400 ${className}`}
      {...props}
    />
  )
}

export function Select({ className = '', children, ...props }) {
  return (
    <select
      className={`w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-base text-stone-800 outline-none focus:border-orange-400 ${className}`}
      {...props}
    >
      {children}
    </select>
  )
}

export function Textarea({ className = '', ...props }) {
  return (
    <textarea
      className={`w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-base text-stone-800 outline-none placeholder:text-stone-300 focus:border-orange-400 ${className}`}
      {...props}
    />
  )
}

export function Chip({ active, children, className = '', ...props }) {
  return (
    <button
      className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold transition ${
        active ? 'bg-orange-500 text-white' : 'bg-white text-stone-500 border border-stone-200'
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function ScreenHeader({ title, onBack, right = null }) {
  return (
    <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-stone-100 bg-orange-50/90 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] backdrop-blur">
      {onBack && (
        <button onClick={onBack} className="-ml-1 rounded-full p-1.5 text-xl text-stone-500 active:bg-stone-100" aria-label="戻る">
          ←
        </button>
      )}
      <h1 className="flex-1 truncate text-lg font-bold text-stone-800">{title}</h1>
      {right}
    </div>
  )
}

export function EmptyState({ icon = '🍽️', title, description }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-stone-200 bg-white/60 px-6 py-10 text-center">
      <div className="text-4xl">{icon}</div>
      <div className="font-bold text-stone-600">{title}</div>
      {description && <div className="text-sm text-stone-400">{description}</div>}
    </div>
  )
}

export function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/30 sm:items-center" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-base font-bold text-stone-800">{title}</h2>
          <button onClick={onClose} className="rounded-full p-1.5 text-stone-400 active:bg-stone-100" aria-label="閉じる">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Stepper({ value, onChange, min = 1, max = 10, unit = '人' }) {
  return (
    <div className="flex items-center gap-3 rounded-full bg-white px-2 py-1 shadow-sm">
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        className="flex h-7 w-7 items-center justify-center rounded-full bg-stone-100 text-lg font-bold text-stone-500 active:bg-stone-200"
      >
        −
      </button>
      <span className="w-10 text-center text-sm font-black text-stone-700">{value}{unit}</span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-100 text-lg font-bold text-orange-600 active:bg-orange-200"
      >
        +
      </button>
    </div>
  )
}

export function Spinner() {
  return (
    <div className="flex h-full items-center justify-center py-16">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-200 border-t-orange-500" />
    </div>
  )
}
