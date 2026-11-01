import { useState, useRef, useEffect } from 'react'
import { Search, Sun, Moon, LogOut, Settings, ChevronDown } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useNavigate, Link } from 'react-router-dom'
import { cn } from '../lib/utils'
import { tm } from '../lib/ui'

export function Header() {
  const { user, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const handleLogout = () => { setOpen(false); logout(); navigate('/login') }

  const initials = user?.full_name
    ? user.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? 'U'

  return (
    <header className="h-[52px] bg-surface border-b border-border flex items-center px-4 gap-3 shrink-0">
      {/* Search */}
      <div className="flex-1 max-w-xs">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <input type="text" placeholder="Search tenders…"
            className="w-full bg-subtle border border-transparent rounded-lg py-1.5 pl-8 pr-3 text-[13px] text-text placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-brand/40 focus:bg-surface transition-all" />
        </div>
      </div>

      <div className="flex items-center gap-1.5 ml-auto">
        {/* AI badge */}
        <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-ok-subtle text-ok border border-ok/20">
          <span className="w-1.5 h-1.5 rounded-full bg-ok" />
          Groq AI
        </span>

        {/* Theme toggle */}
        <button onClick={toggle} aria-label="Toggle theme"
          className={cn(tm.btn, tm.btnGhost, tm.btnIcon)}>
          {theme === 'dark'
            ? <Sun size={15} className="text-warn" />
            : <Moon size={15} className="text-text2" />}
        </button>

        {/* Profile */}
        <div className="relative ml-1" ref={ref}>
          <button onClick={() => setOpen(!open)}
            className="flex items-center gap-2 pl-2 ml-1 border-l border-border hover:opacity-80 transition-opacity">
            <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center text-white text-[11px] font-bold">
              {initials}
            </div>
            <span className="hidden sm:block text-[12px] font-semibold text-text max-w-[90px] truncate">
              {user?.full_name?.split(' ')[0] || 'User'}
            </span>
            <ChevronDown size={12} className="text-muted" />
          </button>

          {open && (
            <div className="absolute right-0 top-full mt-1.5 w-48 bg-surface border border-border rounded-xl shadow-xl py-1 z-50 tm-pop">
              <div className="px-3 py-2.5 border-b border-border">
                <p className="text-[12px] font-semibold text-text truncate">{user?.full_name}</p>
                <p className="text-[11px] text-muted truncate mt-0.5">{user?.email}</p>
              </div>
              <Link to="/settings" onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-text2 hover:bg-subtle hover:text-text transition-colors">
                <Settings size={13} /> Settings
              </Link>
              <div className="border-t border-border mt-1 pt-1">
                <button onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-bad hover:bg-bad-subtle transition-colors">
                  <LogOut size={13} /> Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
