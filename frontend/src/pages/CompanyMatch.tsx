import { useState, useEffect } from 'react'
import { CheckCircle, AlertTriangle, XCircle, FileText, ChevronLeft, ChevronDown, Target } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { cn } from '../lib/utils'
import { tm } from '../lib/ui'
import { api } from '../lib/api'

export function CompanyMatch() {
  const navigate = useNavigate()
  const { id: routeId } = useParams()
  const [tenders,  setTenders]  = useState<any[]>([])
  const [selId,    setSelId]    = useState<string>(routeId || '')
  const [match,    setMatch]    = useState<any>(null)
  const [busy,     setBusy]     = useState(false)
  const [err,      setErr]      = useState('')

  useEffect(() => {
    api.get('/tenders/').then(r => {
      setTenders(r.data)
      if (!routeId && r.data.length > 0) setSelId(r.data[0].id.toString())
    }).catch(console.error)
  }, [routeId])

  const run = async () => {
    if (!selId) return
    setBusy(true); setErr(''); setMatch(null)
    try { setMatch((await api.post(`/tenders/${selId}/match`)).data) }
    catch (e: any) { setErr(e.response?.data?.detail || 'Failed to run eligibility match.') }
    finally { setBusy(false) }
  }

  const sat  = match?.matches?.filter((m: any) => m.status?.includes('Satisfied')).length || 0
  const ver  = match?.matches?.filter((m: any) => m.status?.includes('Verification')).length || 0
  const unmt = match?.matches?.filter((m: any) => m.status?.includes('Unmet')).length || 0

  return (
    <div className="space-y-4 max-w-5xl tm-up">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <button onClick={() => navigate(-1)}
            className={cn(tm.btn, tm.btnGhost, tm.btnIcon)}>
            <ChevronLeft size={16} />
          </button>
          <div>
            <h1 className={tm.h1}>Eligibility Match</h1>
            <p className={tm.sub}>AI comparison of tender requirements against your company profile</p>
          </div>
        </div>

        {/* Controls — always visible and styled properly */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <select value={selId} onChange={e => setSelId(e.target.value)}
              className={cn(tm.select, 'pr-8 text-[13px] max-w-[240px]')}>
              <option value="">Select a tender…</option>
              {tenders.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          </div>

          {/* ── RUN ANALYSIS BUTTON — large, bold, unmissable ── */}
          <button
            onClick={run}
            disabled={!selId || busy}
            className={cn(
              tm.btn, tm.btnBrand,
              'font-semibold px-4 py-2',
              (!selId || busy) && 'opacity-50'
            )}
          >
            {busy
              ? <><span className={tm.spinSm} style={{ borderTopColor:'#fff', borderColor:'rgba(255,255,255,.3)' }} />Analyzing…</>
              : <><Target size={14} />Run Analysis</>
            }
          </button>
        </div>
      </div>

      {/* Error */}
      {err && (
        <div className="bg-bad-subtle border border-bad/20 text-bad px-4 py-3 rounded-lg text-sm tm-in">
          {err}
        </div>
      )}

      {/* Empty state */}
      {!match && !busy && !err && (
        <div className={cn(tm.card, 'flex flex-col items-center justify-center py-20 text-center tm-in')}>
          <div className="w-14 h-14 bg-brand-subtle rounded-2xl flex items-center justify-center mb-4">
            <Target size={24} className="text-brand" />
          </div>
          <p className="text-sm font-semibold text-text">Select a tender and click Run Analysis</p>
          <p className="text-xs text-muted mt-1 max-w-xs">Make sure the tender has a completed Executive Summary first.</p>
        </div>
      )}

      {/* Loading */}
      {busy && (
        <div className={cn(tm.card, 'flex flex-col items-center justify-center py-20 tm-in')}>
          <span className={cn(tm.spin, '!w-8 !h-8 mb-3')} />
          <p className="text-sm font-semibold text-text">AI is evaluating eligibility…</p>
          <p className="text-xs text-muted mt-1">Comparing requirements against your company profile</p>
        </div>
      )}

      {/* Results */}
      {match && !busy && (
        <div className="space-y-4 tm-up">
          {/* Score row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Overall score — brand gradient */}
            <div
              className="rounded-xl p-5 flex flex-col items-center justify-center col-span-2 lg:col-span-1 shadow-lg"
              style={{ background: 'linear-gradient(135deg, hsl(var(--brand)), hsl(var(--accent)))' }}
            >
              <div className="text-4xl font-black text-white">{match.score}%</div>
              <div className="text-[11px] font-bold text-white/80 uppercase tracking-widest mt-1">Overall Match</div>
            </div>

            {[
              { label:'Met',          count:sat,  icon:CheckCircle,  bg:'bg-ok-subtle',   ic:'text-ok'   },
              { label:'Needs Review', count:ver,  icon:AlertTriangle,bg:'bg-warn-subtle',  ic:'text-warn' },
              { label:'Unmet',        count:unmt, icon:XCircle,      bg:'bg-bad-subtle',   ic:'text-bad'  },
            ].map(s => (
              <div key={s.label} className={cn(tm.card, 'p-4 flex flex-col items-center justify-center')}>
                <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center mb-2', s.bg)}>
                  <s.icon size={18} className={s.ic} />
                </div>
                <div className="text-2xl font-bold text-text">{s.count}</div>
                <div className="text-[11px] text-muted mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Match cards */}
          <div className="space-y-2.5">
            {match.matches?.map((m: any, i: number) => (
              <div key={i} className={cn(tm.card, 'p-4')}>
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <div className="flex-1 min-w-0">
                    {m.category && (
                      <span className={cn(tm.badge, tm.bBrand, 'mb-1.5')}>{m.category}</span>
                    )}
                    <h3 className="text-[13px] font-semibold text-text leading-snug">{m.description}</h3>
                  </div>
                  <StatusBadge status={m.status} />
                </div>
                <div className="bg-subtle rounded-lg p-3 space-y-1.5">
                  <p className="text-[12px] text-text2 leading-relaxed">
                    <span className="font-semibold text-text">Reasoning: </span>{m.reason}
                  </p>
                  {m.evidence && m.evidence !== 'No supporting company evidence found.' && (
                    <p className="text-[12px] text-muted flex items-start gap-1.5">
                      <FileText size={11} className="mt-0.5 shrink-0 text-brand" />
                      <span><span className="font-semibold text-text2">Evidence: </span>{m.evidence}</span>
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  if (!status) return null
  if (status.includes('Satisfied'))
    return <span className={cn(tm.badge, tm.bOk, 'whitespace-nowrap')}><CheckCircle size={10} />{status}</span>
  if (status.includes('Verification'))
    return <span className={cn(tm.badge, tm.bWarn, 'whitespace-nowrap')}><AlertTriangle size={10} />{status}</span>
  return <span className={cn(tm.badge, tm.bBad, 'whitespace-nowrap')}><XCircle size={10} />{status}</span>
}
