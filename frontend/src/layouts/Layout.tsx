import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from '../components/Sidebar'
import { Header } from '../components/Header'

export function Layout() {
  const [collapsed, setCollapsed] = useState(false)
  const { pathname } = useLocation()

  return (
    /* CRITICAL: overflow-hidden on root prevents full-page drag-scroll */
    <div className="flex h-screen w-screen overflow-hidden bg-bg" style={{ maxWidth: '100vw' }}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />

      {/* Main panel — min-w-0 ensures flex child doesn't overflow */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />

        {/* Scrollable content area — only THIS scrolls, not the page */}
        <main
          className="flex-1 overflow-y-auto overflow-x-hidden"
          style={{ overscrollBehavior: 'contain' }}
        >
          <div key={pathname} className="p-5 tm-up min-h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
