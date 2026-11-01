import { useState, useEffect } from 'react'
import { FileText, CheckCircle, Clock, AlertTriangle, Plus, ArrowRight, Zap, Building2, Upload, Target } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '../lib/utils'
import { tm, tenderStatus } from '../lib/ui'
import { api } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'

export function Dashboard() {
  const { user } = useAuth()
  const [tenders, setTenders]     = useState<any[]>([])
  const [hasCompany, setHasCompany] = useState<boolean | null>(null)
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    api.get('/company').then(() => setHasCompany(true))
      .catch(e => setHasCompany(e.response?.status === 404 ? false : true))
    api.get('/tenders/').then(r => setTenders(r.data)).catch(console.error).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="space-y-5 max-w-7xl">
      <div className="space-y-1"><div className="skeleton h-6 w-52" /><div className="skeleton h-4 w-72 mt-1" /></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_,i)=><div key={i} className="skeleton h-20" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="skeleton h-64 lg:col-span-2" />
        <div className="space-y-3"><div className="skeleton h-36" /><div className="skeleton h-28" /></div>
      </div>
    </div>
  )

  if (hasCompany === false) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-sm mx-auto text-center tm-up">
      <div className="w-16 h-16 bg-brand-subtle rounded-2xl flex items-center justify-center mb-5">
        <Building2 size={28} className="text-brand" />
      </div>
      <h1 className="text-2xl font-bold text-text mb-2">Welcome to TenderMind</h1>
      <p className="text-text2 text-sm leading-relaxed mb-7">Complete your company profile so AI can match tender requirements against your capabilities.</p>
      <Link to="/company" className={cn(tm.btn, tm.btnBrand, tm.btnLg)}>
        Complete Company Profile <ArrowRight size={16} />
      </Link>
    </div>
  )

  const ready    = tenders.filter(t => t.status === 'Ready').length
  const proc     = tenders.filter(t => t.status === 'Processing').length
  const upcoming = tenders.filter(t => t.submission_deadline)
    .sort((a,b) => new Date(a.submission_deadline).getTime() - new Date(b.submission_deadline).getTime())

  const h = new Date().getHours()
  const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'

  const stats = [
    { label:'Total Tenders',      val: tenders.length,  icon: FileText,      bg:'bg-brand-subtle',  ico:'text-brand'  },
    { label:'Ready for AI',       val: ready,           icon: CheckCircle,   bg:'bg-ok-subtle',     ico:'text-ok'     },
    { label:'Processing',         val: proc,            icon: Clock,         bg:'bg-warn-subtle',   ico:'text-warn'   },
    { label:'Upcoming Deadlines', val: upcoming.length, icon: AlertTriangle, bg:'bg-bad-subtle',    ico:'text-bad'    },
  ]

  return (
    <div className="space-y-5 max-w-7xl">
      {/* Page heading */}
      <div className="tm-up">
        <h1 className="text-xl font-bold text-text">{greeting}, {user?.full_name?.split(' ')[0] || 'there'} 👋</h1>
        <p className="text-sm text-text2 mt-0.5">Your intelligent tender workspace.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s, i) => (
          <div key={s.label} className={cn(tm.card, 'p-4 flex items-center gap-3', `tm-up-d${i+1}`)}>
            <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', s.bg)}>
              <s.icon size={18} className={s.ico} />
            </div>
            <div>
              <p className="text-xl font-bold text-text leading-none">{s.val}</p>
              <p className="text-[11px] text-muted mt-0.5 leading-tight">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent tenders */}
        <div className={cn(tm.card, 'lg:col-span-2 overflow-hidden tm-up-d1')}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h2 className={tm.h2}>Recent Tenders</h2>
            <Link to="/tenders" className="text-[12px] text-brand hover:underline font-medium flex items-center gap-1">
              View all <ArrowRight size={11} />
            </Link>
          </div>
          {tenders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <div className="w-10 h-10 bg-subtle rounded-xl flex items-center justify-center mb-3">
                <FileText size={18} className="text-muted" />
              </div>
              <p className="text-sm font-medium text-text">No tenders yet</p>
              <p className="text-xs text-muted mt-1 mb-4">Upload your first tender to get started</p>
              <Link to="/upload" className={cn(tm.btn, tm.btnBrand, tm.btnSm)}>
                <Plus size={12} /> Upload Tender
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {tenders.slice(0, 7).map((t, i) => (
                <div key={t.id}
                  className="flex items-center justify-between px-4 py-3 hover:bg-subtle transition-colors group"
                  style={{ animationDelay: `${i*30}ms` }}>
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-7 h-7 bg-brand-subtle rounded-md flex items-center justify-center shrink-0">
                      <FileText size={13} className="text-brand" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-text truncate">{t.title}</p>
                      <p className="text-[11px] text-muted truncate">{t.issuing_organization || '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-3 shrink-0">
                    <span className={tenderStatus(t.status)}>{t.status}</span>
                    <Link to={`/tenders/${t.id}/chat`}
                      className="text-[11px] text-brand font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      Open →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Deadlines */}
          <div className={cn(tm.card, 'overflow-hidden tm-up-d2')}>
            <div className="px-4 py-3 border-b border-border">
              <h2 className={tm.h2}>Upcoming Deadlines</h2>
            </div>
            {upcoming.length === 0 ? (
              <div className="flex items-center justify-center h-20 text-xs text-muted">No upcoming deadlines</div>
            ) : (
              <div className="divide-y divide-border">
                {upcoming.slice(0, 5).map(t => {
                  const days = Math.ceil((new Date(t.submission_deadline).getTime() - Date.now()) / 86400000)
                  const overdue = days < 0, urgent = days >= 0 && days <= 5
                  return (
                    <Link key={t.id} to={`/tenders/${t.id}/summary`}
                      className="block px-4 py-3 hover:bg-subtle transition-colors">
                      <p className="text-[12px] font-medium text-text truncate">{t.title}</p>
                      <p className={cn('text-[11px] mt-0.5 font-semibold',
                        overdue ? 'text-bad' : urgent ? 'text-warn' : 'text-muted')}>
                        {overdue ? 'Overdue' : days === 0 ? 'Due today!' : `${days}d left`}
                        {' · '}{new Date(t.submission_deadline).toLocaleDateString('en-GB', { day:'numeric', month:'short' })}
                      </p>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div className={cn(tm.card, 'p-4 tm-up-d3')}>
            <h2 className={cn(tm.h2, 'mb-3')}>Quick Actions</h2>
            <div className="grid grid-cols-2 gap-2">
              {[
                { to:'/upload',          icon:Upload,   label:'Upload',        cls:tm.btnBrand   },
                { to:'/ai/chat',         icon:Zap,      label:'Ask AI',        cls:tm.btnAccent  },
                { to:'/ai/match',        icon:Target,   label:'Eligibility',   cls:tm.btnSec     },
                { to:'/tenders/compare', icon:Building2,label:'Compare',       cls:tm.btnSec     },
              ].map(a => (
                <Link key={a.label} to={a.to}
                  className={cn(tm.btn, a.cls, 'flex-col gap-1 h-16 text-[11px]')}>
                  <a.icon size={16} />
                  {a.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
