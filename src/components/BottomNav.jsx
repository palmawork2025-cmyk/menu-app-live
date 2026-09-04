const TABS = [
  { key: 'home', label: 'ホーム', icon: '🏠' },
  { key: 'plan', label: '献立', icon: '📅' },
  { key: 'shopping', label: '買い物', icon: '🛒' },
  { key: 'menus', label: 'メニュー', icon: '📖' },
]

export default function BottomNav({ active, onChange, badgeCounts = {} }) {
  return (
    <nav className="sticky bottom-0 z-20 flex border-t border-stone-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      {TABS.map((tab) => {
        const isActive = active === tab.key
        const badge = badgeCounts[tab.key]
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-bold transition ${
              isActive ? 'text-orange-500' : 'text-stone-400'
            }`}
          >
            <span className="text-xl leading-none">{tab.icon}</span>
            {tab.label}
            {!!badge && (
              <span className="absolute right-[22%] top-1 min-w-[16px] rounded-full bg-red-500 px-1 text-[10px] font-bold leading-4 text-white">
                {badge}
              </span>
            )}
          </button>
        )
      })}
    </nav>
  )
}
