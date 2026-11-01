import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Send, Bot, User, FileText, AlertCircle, ChevronDown, Sparkles, ChevronLeft } from 'lucide-react'
import { cn } from '../lib/utils'
import { tm } from '../lib/ui'
import { api } from '../lib/api'

interface Message { role: 'user' | 'assistant'; content: string; sources?: any[] }

function MsgText({ text, isUser }: { text: string; isUser?: boolean }) {
  const clean = text.replace('📄 SOURCE NOTICE\n\nThis information is based on the uploaded tender documents.\n\n','').trim()
  return (
    <div className="space-y-1.5 text-[13px] leading-relaxed">
      {clean.split('\n').map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1" />
        const parts = line.split(/(\*\*[^*]+\*\*)/g).map((p, j) =>
          p.startsWith('**') && p.endsWith('**')
            ? <strong key={j} className={isUser ? 'text-white font-semibold' : 'text-text font-semibold'}>{p.slice(2,-2)}</strong>
            : p
        )
        const bullet = line.trim().startsWith('- ') || line.trim().startsWith('• ')
        if (bullet) return (
          <div key={i} className="flex gap-2">
            <span className={cn('shrink-0 mt-0.5', isUser ? 'text-white/60' : 'text-brand')}>•</span>
            <span>{parts.map(p => typeof p === 'string' ? p.replace(/^[-•]\s*/,'') : p)}</span>
          </div>
        )
        return <p key={i}>{parts}</p>
      })}
    </div>
  )
}

export function TenderChat() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [tenders,  setTenders]  = useState<any[]>([])
  const [selId,    setSelId]    = useState<string>(id || '')
  const [sessId,   setSessId]   = useState<number | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hello! I\'m TenderMind AI powered by Groq.\n\nSelect a tender above and ask me anything about its uploaded documents.' }
  ])
  const [input,   setInput]   = useState('')
  const [busy,    setBusy]    = useState(false)
  const [err,     setErr]     = useState('')

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, busy])

  useEffect(() => {
    api.get('/tenders/').then(r => {
      setTenders(r.data)
      if (!id && r.data.length > 0) setSelId(r.data[0].id.toString())
    }).catch(console.error)
  }, [id])

  useEffect(() => {
    if (!selId) return
    const reset = [{ role: 'assistant' as const, content: 'Hello! I\'m TenderMind AI.\n\nAsk me anything about this tender.' }]
    api.get(`/chat/sessions?tender_id=${selId}`).then(r => {
      if (r.data?.length > 0) { setSessId(r.data[0].id); setMessages(reset) }
      else api.post('/chat/sessions', { tender_id: parseInt(selId), title: 'Chat Session' })
        .then(r2 => { setSessId(r2.data.id); setMessages(reset) })
        .catch(console.error)
    }).catch(console.error)
  }, [selId])

  const send = async () => {
    if (!input.trim() || !sessId || busy) return
    const msg = input.trim()
    setMessages(p => [...p, { role: 'user', content: msg }])
    setInput(''); setBusy(true); setErr('')
    try {
      const r = await api.post(`/chat/sessions/${sessId}/message`, { message: msg })
      setMessages(p => [...p, { role: 'assistant', content: r.data.content, sources: r.data.sources || [] }])
    } catch (e: any) {
      const d = e.response?.data?.detail || 'Failed to get a response.'
      setErr(d); setMessages(p => [...p, { role: 'assistant', content: '⚠️ ' + d }])
    } finally { setBusy(false) }
  }

  return (
    <div className="flex flex-col max-w-5xl tm-up" style={{ height: 'calc(100vh - 5.5rem)' }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 shrink-0">
        <div className="flex items-center gap-2.5">
          <button onClick={() => navigate(-1)} className={cn(tm.btn, tm.btnGhost, tm.btnIcon)}><ChevronLeft size={16} /></button>
          <div className="w-9 h-9 rounded-xl bg-brand flex items-center justify-center shadow-sm">
            <Sparkles size={16} className="text-white" />
          </div>
          <div>
            <h1 className={tm.h1}>AI Assistant</h1>
            <p className={tm.sub}>Powered by Groq · Ask anything about your tender</p>
          </div>
        </div>
        <div className="relative">
          <select value={selId}
            onChange={e => { setSelId(e.target.value); if (e.target.value) navigate(`/tenders/${e.target.value}/chat`, { replace: true }) }}
            className={cn(tm.select, 'pr-8 text-[13px] max-w-[240px]')}>
            <option value="">Select a tender…</option>
            {tenders.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
          <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
        </div>
      </div>

      {err && (
        <div className="flex items-center gap-2 bg-bad-subtle border border-bad/20 text-bad px-3.5 py-2.5 rounded-lg text-[13px] mb-3 shrink-0 tm-in">
          <AlertCircle size={14} className="shrink-0" /> {err}
        </div>
      )}

      {/* Chat window */}
      <div className={cn(tm.card, 'flex-1 flex flex-col overflow-hidden min-h-0')}>
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
          {messages.map((msg, i) => (
            <div key={i} className={cn('flex gap-2.5 max-w-3xl tm-up', msg.role === 'user' ? 'ml-auto flex-row-reverse' : '')}>
              {/* Avatar */}
              <div className={cn(
                'w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
                msg.role === 'user' ? 'bg-brand text-white' : 'bg-surface2 text-muted border border-border'
              )}>
                {msg.role === 'user' ? <User size={13} /> : <Bot size={13} />}
              </div>

              {/* Bubble */}
              <div className={cn(
                'rounded-xl px-3.5 py-2.5 shadow-sm max-w-[85%]',
                msg.role === 'user'
                  ? 'bg-brand text-white rounded-tr-sm'
                  : 'bg-surface2 text-text border border-border rounded-tl-sm'
              )}>
                {msg.content.includes('📄 SOURCE NOTICE') && (
                  <div className="flex items-center gap-1.5 bg-brand-subtle border border-brand/20 text-brand rounded-lg px-2.5 py-1.5 text-[11px] font-medium mb-2.5">
                    <AlertCircle size={11} /> Based on uploaded tender documents
                  </div>
                )}
                <MsgText text={msg.content} isUser={msg.role === 'user'} />

                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-border/50">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted mb-1.5">Sources</p>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.sources.map((src: any, idx: number) => (
                        <span key={idx} className="inline-flex items-center gap-1 text-[11px] bg-surface border border-border text-muted rounded-md px-2 py-0.5">
                          <FileText size={10} className="text-brand" />
                          Doc {src.document_id ?? '?'} · Pg {src.page_number ?? '?'}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {busy && (
            <div className="flex gap-2.5 max-w-3xl tm-in">
              <div className="w-7 h-7 rounded-lg bg-surface2 border border-border flex items-center justify-center shrink-0">
                <Bot size={13} className="text-muted" />
              </div>
              <div className="bg-surface2 border border-border rounded-xl rounded-tl-sm px-3.5 py-2.5 flex items-center gap-2.5">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-muted rounded-full dot0" />
                  <span className="w-1.5 h-1.5 bg-muted rounded-full dot1" />
                  <span className="w-1.5 h-1.5 bg-muted rounded-full dot2" />
                </div>
                <span className="text-[12px] text-muted">Analyzing documents…</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div className="px-4 py-3 border-t border-border bg-surface shrink-0">
          <div className={cn(
            'flex items-center gap-2 bg-surface2 border border-border rounded-xl px-3.5 py-2',
            'focus-within:border-brand/50 focus-within:ring-2 focus-within:ring-brand/20 transition-all'
          )}>
            <textarea rows={1} value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
              placeholder={sessId ? 'Ask a question… (Enter to send)' : 'Select a tender first…'}
              disabled={!sessId || busy}
              className="flex-1 bg-transparent resize-none text-[13px] text-text placeholder:text-muted focus:outline-none disabled:opacity-50 py-0.5"
            />
            <button onClick={send} disabled={!input.trim() || busy || !sessId}
              className={cn(tm.btn, tm.btnBrand, tm.btnIconSm, 'shrink-0 disabled:opacity-40')}>
              <Send size={13} />
            </button>
          </div>
          <p className="text-center text-[10px] text-muted mt-1.5">
            Responses are based on uploaded documents only. Verify against original sources.
          </p>
        </div>
      </div>
    </div>
  )
}
