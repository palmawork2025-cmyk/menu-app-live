import { useState } from 'react'
import { FamilyProvider, useFamily } from './lib/FamilyContext'
import { NavProvider, useNav } from './lib/NavContext'
import { Spinner } from './components/ui'
import BottomNav from './components/BottomNav'
import FamilyGate from './screens/FamilyGate'
import HomeScreen from './screens/HomeScreen'
import PlanScreen from './screens/PlanScreen'
import ShoppingListScreen from './screens/ShoppingListScreen'
import MenuListScreen from './screens/MenuListScreen'
import MenuDetailScreen from './screens/MenuDetailScreen'
import MenuEditScreen from './screens/MenuEditScreen'
import StaplesScreen from './screens/StaplesScreen'
import SettingsScreen from './screens/SettingsScreen'

function NotConfigured() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-orange-50 px-8 text-center">
      <div className="text-4xl">🛠️</div>
      <h1 className="text-lg font-bold text-stone-700">Supabaseの設定が必要です</h1>
      <p className="text-sm text-stone-500">
        .env ファイルに VITE_SUPABASE_URL と VITE_SUPABASE_ANON_KEY を設定してから、開発サーバーを再起動してください。詳しくは README.md を参照してください。
      </p>
    </div>
  )
}

function ErrorScreen({ message }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-orange-50 px-8 text-center">
      <div className="text-4xl">😢</div>
      <h1 className="text-lg font-bold text-stone-700">接続できませんでした</h1>
      <p className="text-sm text-stone-500">{message}</p>
    </div>
  )
}

function MainApp() {
  const [activeTab, setActiveTab] = useState('home')
  const { top, push, pop, popToRoot } = useNav()

  function changeTab(tab) {
    popToRoot()
    setActiveTab(tab)
  }

  let body = null
  if (top) {
    switch (top.type) {
      case 'menuDetail':
        body = <MenuDetailScreen menuId={top.menuId} onBack={pop} onEdit={(id) => push({ type: 'menuEdit', menuId: id })} />
        break
      case 'menuEdit':
        body = <MenuEditScreen menuId={top.menuId} onBack={pop} onDone={pop} />
        break
      case 'staples':
        body = <StaplesScreen onBack={pop} />
        break
      case 'settings':
        body = <SettingsScreen onBack={pop} />
        break
      default:
        body = null
    }
  } else {
    switch (activeTab) {
      case 'home':
        body = (
          <HomeScreen
            onOpenSettings={() => push({ type: 'settings' })}
            onGoShopping={() => changeTab('shopping')}
            onGoPlan={() => changeTab('plan')}
            onOpenMenu={(id) => push({ type: 'menuDetail', menuId: id })}
          />
        )
        break
      case 'plan':
        body = <PlanScreen onOpenMenu={(id) => push({ type: 'menuDetail', menuId: id })} />
        break
      case 'shopping':
        body = <ShoppingListScreen onOpenMenu={(id) => push({ type: 'menuDetail', menuId: id })} />
        break
      case 'menus':
        body = (
          <MenuListScreen
            onOpenMenu={(id) => push({ type: 'menuDetail', menuId: id })}
            onNewMenu={() => push({ type: 'menuEdit', menuId: null })}
            onOpenStaples={() => push({ type: 'staples' })}
          />
        )
        break
      default:
        body = null
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-orange-50">
      <div className="flex-1 pb-4">{body}</div>
      {!top && <BottomNav active={activeTab} onChange={changeTab} />}
    </div>
  )
}

function Gate() {
  const { status, error } = useFamily()

  if (status === 'error') {
    return error === 'SUPABASE_NOT_CONFIGURED' ? <NotConfigured /> : <ErrorScreen message={error} />
  }
  if (status === 'loading') {
    return <Spinner />
  }
  if (status === 'needs-family') {
    return <FamilyGate />
  }
  return (
    <NavProvider>
      <MainApp />
    </NavProvider>
  )
}

export default function App() {
  return (
    <FamilyProvider>
      <Gate />
    </FamilyProvider>
  )
}
