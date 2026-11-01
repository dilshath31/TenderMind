import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, ChevronRight, AlertCircle } from 'lucide-react'
import { api } from '../../lib/api'
import { cn } from '../../lib/utils'
import { tm, tenderStatus } from '../../lib/ui'

interface Props {
  toolPath: 'chat' | 'summary' | 'match' | 'report'
  icon: React.ReactNode
  title: string
  description: string
  hint?: string
}

export function TenderHubWrapper({ toolPath, icon, title, description, hint }: Props) {
  const navigate = useNavigate()
  const [tenders, setTenders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/tenders/').then(r => setTenders(r.data)).catch(console.error).finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-5 max-w-4xl tm-up">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-11 h-11 bg-brand rounded-xl flex items-center justify-center shadow-sm text-white shrink-0">
          {icon}
        </div>
        <div>
          <h1 className={tm.h1}>{title}</h1>
          <p className={tm.sub}>{description}</p>
        </div>
      </div>

      {/* Hint */}
      {hint && (
        <div className={cn('flex items-start gap-2.5 px-4 py-3 rounded-lg border text-[13px]',
          'bg-brand-subtle border-brand/20 text-brand tm-in')}>
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <span>{hint}</span>
        </div>
      )}

      {/* Tender picker */}
      <div>
        <p className="text-[13px] font-semibold text-text mb-3">Select a tender to continue</p>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[...Array(4)].map((_,i) => <div key={i} className="skeleton h-20 rounded-xl" style={{ animationDelay:`${i*80}ms` }} />)}
          </div>
        ) : tenders.length === 0 ? (
          <div className={cn(tm.card, 'flex flex-col items-center justify-center py-14 text-center')}>
            <FileText size={26} className="text-muted mb-2 opacity-30" />
            <p className="text-[13px] font-semibold text-text">No tenders found</p>
            <p className="text-[12px] text-muted mt-1">Upload a tender PDF first</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {tenders.map((t, i) => (
              <button key={t.id} onClick={() => navigate(`/tenders/${t.id}/${toolPath}`)}
                className={cn(tm.cardHover, 'flex items-center gap-3.5 p-4 text-left group active:scale-[0.98]')}
                style={{ animationDelay:`${i*50}ms` }}>
                <div className="w-9 h-9 bg-brand-subtle rounded-lg flex items-center justify-center shrink-0 group-hover:bg-brand transition-colors">
                  <FileText size={16} className="text-brand group-hover:text-white transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-text truncate">{t.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={tenderStatus(t.status)}>{t.status}</span>
                    {t.issuing_organization && (
                      <span className="text-[10px] text-muted truncate">{t.issuing_organization}</span>
                    )}
                  </div>
                </div>
                <ChevronRight size={14} className="text-border group-hover:text-brand shrink-0 transition-colors" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
