import { Calendar, AlertTriangle, CheckCircle, FileText, Target, ShieldAlert, ChevronLeft, ChevronDown, RefreshCw } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { cn } from '../lib/utils'
import { tm } from '../lib/ui'
import { api } from '../lib/api'

function field(fields: any[], name: string) {
  return fields?.find((f: any) => f.field_name === name)?.extracted_value || '—'
}

export function TenderSummary() {
  const navigate  = useNavigate()
  const { id: routeId } = useParams()
  const [tenders,  setTenders]  = useState<any[]>([])
  const [selId,    setSelId]    = useState<string>(routeId || '')
  const [summary,  setSummary]  = useState<any>(null)
  const [busy,     setBusy]     = useState(false)
  const [err,      setErr]      = useState('')

  useEffect(() => {
    api.get('/tenders/').then(r => {
      setTenders(r.data)
      if (!routeId && r.data.length > 0) setSelId(r.data[0].id.toString())
    }).catch(console.error)
  }, [routeId])

  useEffect(() => {
    if (selId) { setSummary(null); fetchSummary(selId) }
  }, [selId])

  const fetchSummary = async (id: string) => {
    try {
      const r = await api.get(`/tenders/${id}/summary`)
      setSummary(r.data)
      if (r.data.status === 'Queued' || r.data.status === 'Generating') {
        setTimeout(() => fetchSummary(id), 5000)
      } else { setBusy(false) }
    } catch (e: any) {
      if (e.response?.status === 404) setSummary(null)
      else setErr('Failed to load summary.')
    }
  }

  const generate = async () => {
    if (!selId) return
    setBusy(true); setErr('')
    try {
      await api.post(`/tenders/${selId}/summary`)
      setTimeout(() => fetchSummary(selId), 5000)
    } catch (e: any) { setErr(e.response?.data?.detail || 'Failed to start generation.'); setBusy(false) }
  }

  const loading = busy || summary?.status === 'Generating' || summary?.status === 'Queued'

  return (
    <div className="space-y-4 max-w-6xl tm-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <button onClick={() => navigate(-1)} className={cn(tm.btn, tm.btnGhost, tm.btnIcon)}><ChevronLeft size={16} /></button>
          <div>
            <h1 className={tm.h1}>Executive Summary</h1>
            <p className={tm.sub}>AI-generated analysis from uploaded documents</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <select value={selId} onChange={e => setSelId(e.target.value)}
              className={cn(tm.select, 'pr-8 text-[13px] max-w-[240px]')}>
              <option value="">Select a tender…</option>
              {tenders.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          </div>
          <button onClick={generate} disabled={!selId || loading}
            className={cn(tm.btn, tm.btnBrand, (!selId || loading) && 'opacity-60')}>
            {loading
              ? <><span className={tm.spinSm} style={{ borderTopColor:'#fff', borderColor:'rgba(255,255,255,.3)' }} />Generating…</>
              : <><RefreshCw size={13} /> {summary?.status === 'Completed' ? 'Regenerate' : 'Generate Summary'}</>
            }
          </button>
        </div>
      </div>

      {err && <div className="bg-bad-subtle border border-bad/20 text-bad px-4 py-3 rounded-lg text-[13px] tm-in">{err}</div>}

      {/* Empty */}
      {!summary && !loading && (
        <div className={cn(tm.card, 'flex flex-col items-center justify-center py-20 text-center tm-in')}>
          <div className="w-14 h-14 bg-subtle rounded-2xl flex items-center justify-center mb-4">
            <Target size={26} className="text-muted" />
          </div>
          <p className="text-[13px] font-semibold text-text">No summary generated yet</p>
          <p className="text-[12px] text-muted mt-1 max-w-xs">Click "Generate Summary" to extract key fields from the uploaded documents.</p>
        </div>
      )}

      {/* Loading */}
      {loading && !summary?.status?.includes('Completed') && !summary?.status?.includes('Failed') && (
        <div className={cn(tm.card, 'flex flex-col items-center justify-center py-20 tm-in')}>
          <span className={cn(tm.spin, '!w-8 !h-8 mb-3')} />
          <p className="text-[13px] font-semibold text-text">AI is analysing documents…</p>
          <p className="text-[12px] text-muted mt-1">This may take a minute. Extracting 14 key fields.</p>
        </div>
      )}

      {/* Failed */}
      {summary?.status === 'Failed' && (
        <div className={cn(tm.card, 'flex flex-col items-center justify-center py-16 bg-bad-subtle border-bad/20 tm-in')}>
          <AlertTriangle size={28} className="text-bad mb-3" />
          <p className="text-[13px] font-semibold text-bad">Summary generation failed.</p>
          <p className="text-[12px] text-muted mt-1">Try regenerating. Make sure documents are fully processed.</p>
        </div>
      )}

      {/* Results */}
      {summary?.status === 'Completed' && (
        <div className="space-y-4 tm-up">
          {/* Executive Overview */}
          <div className={cn(tm.card, 'p-5 relative overflow-hidden')}>
            <div className="absolute top-0 left-0 w-1 h-full bg-brand rounded-l-xl" />
            <h2 className="text-[15px] font-bold text-text mb-3 flex items-center gap-2">
              <Target size={17} className="text-brand" /> Executive Overview
            </h2>
            <p className="text-[13px] text-text2 leading-relaxed">
              This tender (<strong className="text-text">{field(summary.fields, 'Tender Reference Number')}</strong>) titled "
              <strong className="text-text">{field(summary.fields, 'Tender Title')}</strong>" was issued by{' '}
              <strong className="text-text">{field(summary.fields, 'Issuing Organization')}</strong>. The project is located in{' '}
              <strong className="text-text">{field(summary.fields, 'Location')}</strong> with a deadline of{' '}
              <strong className="text-text">{field(summary.fields, 'Bid Submission Deadline')}</strong>.
            </p>
          </div>

          {/* 3 cards row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Key Facts */}
            <div className={cn(tm.card, 'p-4')}>
              <h3 className="text-[13px] font-bold text-text mb-3 pb-2 border-b border-border flex items-center gap-2">
                <FileText size={14} className="text-brand" /> Key Facts
              </h3>
              <div className="space-y-2.5">
                {[
                  { l:'Estimated Value', k:'Estimated Tender Value' },
                  { l:'EMD / Security',  k:'EMD / Bid Security'     },
                  { l:'Tender Fee',      k:'Tender Fee'             },
                  { l:'Category',        k:'Tender Category'        },
                ].map(r => (
                  <div key={r.k} className="flex justify-between items-start gap-2 border-b border-border/40 pb-2 last:border-0 last:pb-0">
                    <span className="text-[11px] text-muted shrink-0">{r.l}</span>
                    <span className="text-[12px] font-medium text-text text-right">{field(summary.fields, r.k)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Important Dates */}
            <div className={cn(tm.card, 'p-4')}>
              <h3 className="text-[13px] font-bold text-text mb-3 pb-2 border-b border-border flex items-center gap-2">
                <Calendar size={14} className="text-brand" /> Important Dates
              </h3>
              <div className="space-y-3">
                {[
                  { label:'Publication Date',   key:'Publication Date',       dot:'bg-ok'   },
                  { label:'Submission Deadline', key:'Bid Submission Deadline',dot:'bg-bad'  },
                  { label:'Contract Duration',  key:'Contract Duration',      dot:'bg-muted' },
                ].map(d => (
                  <div key={d.key} className="flex gap-3">
                    <div className={cn('w-2 h-2 rounded-full shrink-0 mt-1', d.dot)} />
                    <div>
                      <p className="text-[12px] font-semibold text-text">{d.label}</p>
                      <p className="text-[12px] text-muted mt-0.5">{field(summary.fields, d.key)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Attention */}
            <div className={cn(tm.card, 'p-4 bg-warn-subtle border-warn/20')}>
              <h3 className="text-[13px] font-bold text-warn mb-3 pb-2 border-b border-warn/20 flex items-center gap-2">
                <AlertTriangle size={14} /> Attention Items
              </h3>
              <p className="text-[12px] text-text2 italic flex items-start gap-2">
                <ShieldAlert size={14} className="shrink-0 mt-0.5 text-warn" />
                Ensure strict compliance with the stated EMD and Submission Deadline. Verify all required documents carefully.
              </p>
            </div>
          </div>

          {/* Technical + Eligibility + Documents */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label:'Key Technical Requirements', key:'Key Technical Requirements' },
              { label:'Eligibility Summary',        key:'Eligibility Summary'        },
            ].map(s => (
              <div key={s.key} className={cn(tm.card, 'p-4')}>
                <h3 className="text-[13px] font-bold text-text mb-3 pb-2 border-b border-border">{s.label}</h3>
                <p className="text-[12px] text-text2 whitespace-pre-wrap leading-relaxed">{field(summary.fields, s.key)}</p>
              </div>
            ))}
            <div className={cn(tm.card, 'p-4 md:col-span-2')}>
              <h3 className="text-[13px] font-bold text-text mb-3 pb-2 border-b border-border">Important Submission Documents</h3>
              <p className="text-[12px] text-text2 whitespace-pre-wrap leading-relaxed">{field(summary.fields, 'Important Submission Documents')}</p>
            </div>
          </div>

          {/* Evidence table */}
          <div className={cn(tm.card, 'overflow-hidden')}>
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <CheckCircle size={14} className="text-ok" />
              <h2 className={tm.h2}>Detailed Evidence View</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-subtle border-b border-border">
                    <th className="px-4 py-2.5 text-[10px] font-bold text-muted uppercase tracking-widest w-1/4">Field</th>
                    <th className="px-4 py-2.5 text-[10px] font-bold text-muted uppercase tracking-widest w-1/2">Value</th>
                    <th className="px-4 py-2.5 text-[10px] font-bold text-muted uppercase tracking-widest w-1/4">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {summary.fields?.map((f: any) => (
                    <tr key={f.id} className="hover:bg-subtle transition-colors">
                      <td className="px-4 py-3 text-[12px] font-semibold text-text align-top">{f.field_name}</td>
                      <td className="px-4 py-3 text-[12px] text-text2 align-top whitespace-pre-wrap">{f.extracted_value}</td>
                      <td className="px-4 py-3 align-top">
                        {f.extracted_value !== 'Not specified in uploaded documents.' ? (
                          <div className="text-[11px] border border-border bg-surface2 rounded-lg p-2">
                            <span className="block font-semibold text-brand mb-1 truncate">
                              {f.source_document} (Pg {f.page_number})
                            </span>
                            <details>
                              <summary className="cursor-pointer text-muted hover:text-text transition-colors text-[11px]">
                                View Evidence
                              </summary>
                              <p className="mt-2 text-[11px] text-muted italic break-words bg-subtle p-2 rounded border border-border">
                                {f.evidence}
                              </p>
                            </details>
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted">No evidence found</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
