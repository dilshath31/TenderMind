import { useState, useEffect } from 'react'
import { FileText, Download, Trash2, Eye, FolderOpen } from 'lucide-react'
import { api } from '../lib/api'
import { cn } from '../lib/utils'
import { tm, tenderStatus } from '../lib/ui'

export function Documents() {
  const [documents, setDocuments] = useState<any[]>([])
  const [loading,   setLoading]   = useState(true)
  const [actionId,  setActionId]  = useState<number | null>(null)

  useEffect(() => { fetchDocuments() }, [])

  const fetchDocuments = async () => {
    setLoading(true)
    try {
      const res = await api.get('/tenders/')
      const all: any[] = []
      for (const tender of res.data) {
        try {
          const dr = await api.get(`/tenders/${tender.id}/documents`)
          dr.data.forEach((doc: any) => all.push({ ...doc, tenderTitle: tender.title, tenderId: tender.id }))
        } catch { /* skip */ }
      }
      all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      setDocuments(all)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const download = async (doc: any, inline = false) => {
    setActionId(doc.id)
    try {
      const res = await api.get(`/documents/${doc.id}/${inline ? 'file' : 'download'}`, { responseType: 'blob' })
      const url  = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a    = document.createElement('a')
      a.href     = url
      if (inline) { a.target = '_blank'; a.rel = 'noopener noreferrer' } else { a.download = doc.filename }
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e: any) { alert(e.response?.data?.detail || 'Failed to download document.') }
    finally { setActionId(null) }
  }

  const remove = async (tenderId: number, docId: number) => {
    if (!confirm('Delete this document? This cannot be undone.')) return
    try { await api.delete(`/tenders/${tenderId}/documents/${docId}`); setDocuments(d => d.filter(x => x.id !== docId)) }
    catch { alert('Failed to delete document.') }
  }

  const fmt = (b?: number) => b ? (b / 1024 / 1024).toFixed(2) + ' MB' : '—'

  return (
    <div className="space-y-4 max-w-7xl tm-up">
      <div>
        <h1 className={tm.h1}>Document Library</h1>
        <p className={tm.sub}>All uploaded tender documents across your workspace</p>
      </div>

      <div className={cn(tm.card, 'overflow-hidden')}>
        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(4)].map((_,i) => <div key={i} className="skeleton h-12" />)}
          </div>
        ) : documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 bg-subtle rounded-xl flex items-center justify-center mb-3">
              <FolderOpen size={22} className="text-muted" />
            </div>
            <p className="text-[13px] font-semibold text-text">No documents yet</p>
            <p className="text-[12px] text-muted mt-1">Upload a tender PDF to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-subtle">
                  <th className="px-4 py-2.5 text-left text-[10px] font-bold text-muted uppercase tracking-widest">Document</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-bold text-muted uppercase tracking-widest hidden md:table-cell">Tender</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-bold text-muted uppercase tracking-widest hidden sm:table-cell">Size</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-bold text-muted uppercase tracking-widest hidden lg:table-cell">Pages</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-bold text-muted uppercase tracking-widest">Status</th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-bold text-muted uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {documents.map(doc => (
                  <tr key={doc.id} className="hover:bg-subtle transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 bg-bad-subtle rounded-md flex items-center justify-center shrink-0">
                          <FileText size={13} className="text-bad" />
                        </div>
                        <span className="text-[13px] font-medium text-text truncate max-w-[200px]" title={doc.filename}>
                          {doc.filename}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-text2 hidden md:table-cell max-w-[150px] truncate">
                      {doc.tenderTitle}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-text2 hidden sm:table-cell">{fmt(doc.size_bytes)}</td>
                    <td className="px-4 py-3 text-[12px] text-text2 hidden lg:table-cell">{doc.page_count ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={tenderStatus(doc.status)}>{doc.status || 'Uploaded'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => download(doc, true)} disabled={actionId === doc.id} title="View PDF"
                          className={cn(tm.btn, tm.btnGhost, tm.btnIconSm, 'hover:text-brand hover:bg-brand-subtle disabled:opacity-40')}>
                          {actionId === doc.id
                            ? <span className={tm.spinSm} />
                            : <Eye size={13} />
                          }
                        </button>
                        <button onClick={() => download(doc, false)} disabled={actionId === doc.id} title="Download"
                          className={cn(tm.btn, tm.btnGhost, tm.btnIconSm, 'hover:text-brand hover:bg-brand-subtle disabled:opacity-40')}>
                          <Download size={13} />
                        </button>
                        <button onClick={() => remove(doc.tenderId, doc.id)} title="Delete"
                          className={cn(tm.btn, tm.btnGhost, tm.btnIconSm, 'hover:text-bad hover:bg-bad-subtle')}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
