import { useState, useEffect } from 'react'
import { FileText, Search, Plus, Trash2, MessageSquareText, BarChart3, Target, BookOpen, AlertTriangle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '../lib/utils'
import { tm, tenderStatus } from '../lib/ui'
import { api } from '../lib/api'

export function Tenders() {
  const [tenders,  setTenders]  = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [search,   setSearch]   = useState('')
  const [loading,  setLoading]  = useState(true)
  const [toDelete, setToDelete] = useState<any>(null)
  const [deleting, setDeleting] = useState(false)
  const [toast,    setToast]    = useState('')

  useEffect(() => {
    api.get('/tenders/').then(r => { setTenders(r.data); setFiltered(r.data) })
      .catch(console.error).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(q ? tenders.filter(t =>
      t.title?.toLowerCase().includes(q) || t.issuing_organization?.toLowerCase().includes(q)
    ) : tenders)
  }, [search, tenders])

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const doDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    try {
      await api.delete(`/tenders/${toDelete.id}`)
      setTenders(t => t.filter(x => x.id !== toDelete.id))
      showToast('Tender deleted.')
    } catch { showToast('Failed to delete.') }
    finally { setDeleting(false); setToDelete(null) }
  }

  return (
    <div className="space-y-4 max-w-7xl tm-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={tm.h1}>My Tenders</h1>
          <p className={tm.sub}>{tenders.length} tender{tenders.length !== 1 ? 's' : ''} in your workspace</p>
        </div>
        <Link to="/upload" className={cn(tm.btn, tm.btnBrand, tm.btnSm)}>
          <Plus size={13} /> Upload Tender
        </Link>
      </div>

      {/* Search bar */}
      <div className={cn(tm.card, 'px-4 py-3 flex items-center gap-3')}>
        <div className="relative flex-1 max-w-sm">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by title or organisation…"
            className={cn(tm.input, 'pl-7 text-[13px]')} />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className={cn(tm.card, 'p-4 space-y-3')}>
          {[...Array(4)].map((_,i)=><div key={i} className="skeleton h-11" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className={cn(tm.card, 'flex flex-col items-center justify-center py-16 text-center')}>
          <div className="w-11 h-11 bg-subtle rounded-xl flex items-center justify-center mb-3">
            <FileText size={18} className="text-muted" />
          </div>
          <p className="text-sm font-semibold text-text">{search ? 'No results found' : 'No tenders yet'}</p>
          <p className="text-xs text-muted mt-1 mb-4">{search ? 'Try a different term' : 'Upload your first tender PDF'}</p>
          {!search && <Link to="/upload" className={cn(tm.btn, tm.btnBrand, tm.btnSm)}><Plus size={12} /> Upload</Link>}
        </div>
      ) : (
        <div className={cn(tm.card, 'overflow-hidden')}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-subtle">
                <th className="px-4 py-2.5 text-left text-[10px] font-bold text-muted uppercase tracking-wide">Tender</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold text-muted uppercase tracking-wide hidden md:table-cell">Organisation</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold text-muted uppercase tracking-wide">Status</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold text-muted uppercase tracking-wide hidden sm:table-cell">Deadline</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-bold text-muted uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(t => (
                <tr key={t.id} className="hover:bg-subtle transition-colors group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 bg-brand-subtle rounded-md flex items-center justify-center shrink-0">
                        <FileText size={13} className="text-brand" />
                      </div>
                      <Link to={`/tenders/${t.id}/chat`}
                        className="text-[13px] font-medium text-text hover:text-brand transition-colors truncate block max-w-[220px]">
                        {t.title}
                      </Link>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-text2 hidden md:table-cell max-w-[160px] truncate">
                    {t.issuing_organization || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={tenderStatus(t.status)}>{t.status}</span>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-text2 hidden sm:table-cell">
                    {t.submission_deadline ? new Date(t.submission_deadline).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {[
                        { to:`/tenders/${t.id}/summary`, Icon:BarChart3,         tip:'Summary'    },
                        { to:`/tenders/${t.id}/chat`,    Icon:MessageSquareText,  tip:'AI Chat'    },
                        { to:`/tenders/${t.id}/match`,   Icon:Target,             tip:'Eligibility'},
                        { to:`/tenders/${t.id}/report`,  Icon:BookOpen,           tip:'Report'     },
                      ].map(({to,Icon,tip}) => (
                        <Link key={tip} to={to} title={tip}
                          className={cn(tm.btn, tm.btnGhost, tm.btnIconSm, 'hover:text-brand hover:bg-brand-subtle')}>
                          <Icon size={12} />
                        </Link>
                      ))}
                      <button onClick={() => setToDelete(t)} title="Delete"
                        className={cn(tm.btn, tm.btnGhost, tm.btnIconSm, 'hover:text-bad hover:bg-bad-subtle')}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 bg-text text-bg text-[13px] font-medium px-4 py-2.5 rounded-xl shadow-xl z-50 tm-pop">
          {toast}
        </div>
      )}

      {/* Delete modal */}
      {toDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 tm-in">
          <div className={cn(tm.card, 'w-full max-w-sm p-5 tm-pop')}>
            <div className="w-10 h-10 bg-bad-subtle rounded-xl flex items-center justify-center mb-4">
              <AlertTriangle size={18} className="text-bad" />
            </div>
            <h3 className="text-[14px] font-bold text-text mb-1">Delete tender?</h3>
            <p className="text-[12px] text-text2 mb-5">
              "<span className="font-semibold text-text">{toDelete.title}</span>" and all associated data will be permanently deleted.
            </p>
            <div className="flex gap-2.5">
              <button onClick={() => setToDelete(null)} disabled={deleting}
                className={cn(tm.btn, tm.btnSec, 'flex-1 text-[13px]')}>Cancel</button>
              <button onClick={doDelete} disabled={deleting}
                className={cn(tm.btn, tm.btnDanger, 'flex-1 text-[13px]', deleting && 'opacity-70')}>
                {deleting ? <><span className={tm.spinSm} />Deleting…</> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
