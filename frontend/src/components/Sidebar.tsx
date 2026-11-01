import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, FileText, Upload, Building2,
  MessageSquareText, BarChart3, GitCompareArrows,
  BookOpen, FlaskConical, Settings, ChevronRight,
  FolderOpen, PanelLeftClose, PanelLeftOpen,
  Zap, Target, Sparkles,
} from 'lucide-react'
import { cn } from '../lib/utils'
import { tm } from '../lib/ui'

type NavItem = { to: string; icon: any; label: string; exact?: boolean; matchPath?: string }
type NavGroup = { label: string; items: NavItem[] }

const groups: NavGroup[] = [
  { label: 'Overview', items: [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  ]},
  { label: 'Tenders', items: [
    { to: '/tenders',         icon: FileText,         label: 'My Tenders'       },
    { to: '/upload',          icon: Upload,           label: 'Upload Tender'    },
    { to: '/tenders/compare', icon: GitCompareArrows, label: 'Compare Tenders'  },
    { to: '/documents',       icon: FolderOpen,       label: 'Document Library' },
  ]},
  { label: 'AI Tools', items: [
    { to: '/ai/chat',    icon: MessageSquareText, label: 'AI Chat',           matchPath: '/chat'    },
    { to: '/ai/summary', icon: BarChart3,         label: 'Tender Summary',    matchPath: '/summary' },
    { to: '/ai/match',   icon: Target,            label: 'Eligibility Match', matchPath: '/match'   },
    { to: '/ai/report',  icon: BookOpen,          label: 'Analysis Report',   matchPath: '/report'  },
    { to: '/research',   icon: FlaskConical,      label: 'Research'                                 },
  ]},
  { label: 'Company', items: [
    { to: '/company', icon: Building2, label: 'Company Profile' },
  ]},
]

interface Props { collapsed: boolean; onToggle: () => void }

export function Sidebar({ collapsed, onToggle }: Props) {
  const { pathname } = useLocation()

  const active = (to: string, matchPath?: string, exact?: boolean) => {
    if (exact)     return pathname === to
    if (matchPath) return pathname.includes(matchPath)
    if (to === '/tenders' && pathname.startsWith('/tenders')) return true
    return pathname === to || pathname.startsWith(to + '/')
  }

  return (
    <aside className={cn(
      'h-full bg-surface border-r border-border flex flex-col shrink-0 overflow-hidden',
      'transition-[width] duration-250 ease-in-out',
      collapsed ? 'w-[52px]' : 'w-[220px]'
    )}>
      {/* ── Logo bar ── */}
      <div className={cn(
        'h-[52px] flex items-center border-b border-border shrink-0 px-3 gap-2.5',
        collapsed && 'justify-center'
      )}>
        {/* Logo mark */}
        <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center shrink-0 tm-glow">
          <Sparkles size={14} className="text-white" />
        </div>
        {/* Name — hidden when collapsed */}
        {!collapsed && (
          <>
            <span className="text-[13px] font-bold text-text tracking-tight truncate flex-1">TenderMind</span>
            <button onClick={onToggle} title="Collapse"
              className={cn(tm.btn, tm.btnGhost, tm.btnIconSm)}>
              <PanelLeftClose size={14} />
            </button>
          </>
        )}
      </div>

      {/* Expand button when collapsed */}
      {collapsed && (
        <button onClick={onToggle} title="Expand"
          className="w-8 h-8 flex items-center justify-center rounded-lg mx-auto mt-2 text-text2 hover:text-text hover:bg-subtle transition-all">
          <PanelLeftOpen size={14} />
        </button>
      )}

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-2 space-y-3">
        {groups.map(g => (
          <div key={g.label}>
            {!collapsed && (
              <p className={cn(tm.tiny, 'px-2 mb-1')}>{g.label}</p>
            )}
            <div className="space-y-px">
              {g.items.map(item => {
                const on = active(item.to, item.matchPath, item.exact)
                return (
                  <Link key={item.label} to={item.to}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      tm.nav, on ? tm.navOn : tm.navOff,
                      collapsed && '!justify-center !px-0 w-9 mx-auto'
                    )}>
                    <span className={cn(
                      'w-5 h-5 flex items-center justify-center shrink-0 transition-colors',
                      on ? 'text-brand' : 'text-muted group-hover:text-text'
                    )}>
                      <item.icon size={15} />
                    </span>
                    {!collapsed && (
                      <>
                        <span className="flex-1 truncate">{item.label}</span>
                        {on && <ChevronRight size={11} className="opacity-50 shrink-0" />}
                      </>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── AI badge ── */}
      {!collapsed && (
        <div className="mx-2 mb-2 px-2.5 py-2 bg-brand-subtle rounded-lg border border-brand/15 flex items-center gap-2">
          <Zap size={12} className="text-brand shrink-0" />
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-brand truncate">Groq AI Active</p>
            <p className="text-[10px] text-brand/60 truncate">qwen/qwen3.8-27b</p>
          </div>
        </div>
      )}

      {/* ── Settings only (Notifications removed — not functional) ── */}
      <div className="px-2 pb-2 pt-2 border-t border-border">
        {(() => {
          const on = pathname === '/settings'
          return (
            <Link to="/settings" title={collapsed ? 'Settings' : undefined}
              className={cn(tm.nav, on ? tm.navOn : tm.navOff, collapsed && '!justify-center !px-0 w-9 mx-auto')}>
              <span className={cn('w-5 h-5 flex items-center justify-center shrink-0', on ? 'text-brand' : 'text-muted group-hover:text-text')}>
                <Settings size={15} />
              </span>
              {!collapsed && <span className="flex-1">Settings</span>}
            </Link>
          )
        })()}
      </div>
    </aside>
  )
}
