import { useState, useEffect } from 'react'
import { GitCompareArrows, X, Plus, ChevronLeft, ChevronDown, FileQuestion } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn } from '../lib/utils'
import { tm } from '../lib/ui'
import { api } from '../lib/api'

export function TenderCompare() {
  const navigate = useNavigate()
  const [tenders,    setTenders]    = useState<any[]>([])
  const [selIds,     setSelIds]     = useState<string[]>(['', ''])
  const [comparing,  setComparing]  = useState(false)
  const [result,     setResult]     = useState<{ columns: any[]; matrix: any[] } | null>(null)
  const [error,      setError]      = useState('')

  useEffect(() => { api.get('/tenders/').then(r => setTenders(r.data)).catch(console.error) }, [])

  const addSlot    = () => setSelIds(s => [...s, ''])
  const removeSlot = (i: number) => setSelIds(s => s.filter((_, idx) => idx !== i))
  const setSlot    = (i: number, v: string) => setSelIds(s => s.map((id, idx) => idx === i ? v : id))

  const compare = async () => {
    const ids = selIds.filter(Boolean).map(Number)
    if (ids.length < 2) { setError('Select at least 2 tenders.'); return }
    setComparing(true); setError(''); setResult(null)
    try { setResult((await api.post('/tenders/compare', { tender_ids: ids })).data) }
    catch (e: any) { setError(e.response?.data?.detail || 'Comparison failed. Make sure all selected tenders have a completed Executive Summary first.') }
    finally { setComparing(false) }
  }

  const used = selIds.filter(Boolean)

  return (
    <div className="space-y-4 max-w-6xl tm-up">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <button onClick={() => navigate(-1)} className={cn(tm.btn, tm.btnGhost, tm.btnIcon)}>
          <ChevronLeft size={16} />
        </button>
        <div>
          <h1 className={tm.h1}>Compare Tenders</h1>
          <p className={tm.sub}>Side-by-side AI comparison of two or more tenders</p>
        </div>
      </div>

      {/* Selector card */}
      <div className={cn(tm.card, 'p-5')}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={tm.h2}>Select Tenders to Compare</h2>
          {selIds.length < 4 && (
            <button onClick={addSlot} className={cn(tm.btn, tm.btnOutline, tm.btnSm)}>
              <Plus size={12} /> Add Tender
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {selIds.map((id, i) => (
            <div key={i} className="relative">
              <label className={cn(tm.label, 'mb-1')}>Tender {i + 1}</label>
              <div className="relative">
                <select value={id} onChange={e => setSlot(i, e.target.value)}
                  className={cn(tm.select, 'pr-8')}>
                  <option value="">Select a tender…</option>
                  {tenders.map(t => (
                    <option key={t.id} value={t.id}
                      disabled={used.includes(String(t.id)) && String(t.id) !== id}>
                      {t.title}
                    </option>
                  ))}
                </select>
                <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                {selIds.length > 2 && (
                  <button onClick={() => removeSlot(i)}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-muted hover:bg-bad text-bg rounded-full flex items-center justify-center transition-colors">
                    <X size={9} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button onClick={compare} disabled={comparing || used.length < 2}
            className={cn(tm.btn, tm.btnBrand, comparing || used.length < 2 ? 'opacity-50' : '')}>
            {comparing
              ? <><span className={tm.spinSm} style={{ borderTopColor:'#fff', borderColor:'rgba(255,255,255,.3)' }} />Comparing…</>
              : <><GitCompareArrows size={14} /> Compare</>
            }
          </button>
          {result && (
            <button onClick={() => setResult(null)} className={cn(tm.btn, tm.btnGhost, tm.btnSm)}>
              Clear results
            </button>
          )}
        </div>

        {error && (
          <div className="mt-3 text-[13px] bg-bad-subtle border border-bad/20 text-bad rounded-lg px-4 py-3 tm-in">
            {error}
          </div>
        )}

        <p className="text-[12px] text-muted mt-3">
          ⓘ All selected tenders must have a completed <strong className="text-text2">Executive Summary</strong> before comparing.
          Generate summaries from the Tender Summary page first.
        </p>
      </div>

      {/* Loading */}
      {comparing && (
        <div className={cn(tm.card, 'flex flex-col items-center justify-center py-16 tm-in')}>
          <span className={cn(tm.spin, '!w-8 !h-8 mb-3')} />
          <p className="text-[13px] font-semibold text-text">AI is comparing tenders…</p>
          <p className="text-[12px] text-muted mt-1">This takes 10–20 seconds</p>
        </div>
      )}

      {/* Empty state */}
      {!result && !comparing && (
        <div className={cn(tm.card, 'flex flex-col items-center justify-center py-14 border-2 border-dashed border-border bg-surface tm-in')}>
          <FileQuestion size={26} className="text-muted mb-2 opacity-40" />
          <p className="text-[13px] text-muted">Select tenders above and click Compare</p>
        </div>
      )}

      {/* Results */}
      {result && !comparing && (
        <div className={cn(tm.card, 'overflow-hidden tm-up')}>
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <GitCompareArrows size={15} className="text-brand" />
            <h2 className={tm.h2}>Comparison Results</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-subtle border-b border-border">
                  <th className="px-4 py-3 text-[10px] font-bold text-muted uppercase tracking-widest w-36">Criteria</th>
                  {result.columns.slice(1).map((col: any) => (
                    <th key={col.id} className="px-4 py-3 text-[10px] font-bold text-brand uppercase tracking-widest">
                      {col.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {result.matrix.map((row: any, i: number) => (
                  <tr key={i} className="hover:bg-subtle transition-colors">
                    <td className="px-4 py-3 text-[11px] font-bold text-muted uppercase tracking-wide align-top">
                      {row.criteria}
                    </td>
                    {result.columns.slice(1).map((col: any) => {
                      const val = row[col.id] || '—'
                      const empty = val === 'Not Found' || val === '—'
                      const diff  = row.status === 'Different'
                      return (
                        <td key={col.id} className={cn('px-4 py-3 align-top text-[13px]', empty ? 'text-muted italic' : 'text-text')}>
                          <div className="flex items-start gap-2">
                            {diff && !empty && <span className="shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-warn" />}
                            {val}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 bg-subtle border-t border-border text-[11px] text-muted">
            AI-assisted comparison. Verify all findings against original tender documents.
          </div>
        </div>
      )}
    </div>
  )
}
