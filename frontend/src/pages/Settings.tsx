import { useState, useEffect } from 'react'
import {
  Server, Database, Zap, Activity, Shield, User,
  Palette, RefreshCw, Sun, Moon, Settings as SettingsIcon,
  CheckCircle, XCircle,
} from 'lucide-react'
import { api } from '../lib/api'
import { useTheme } from '../contexts/ThemeContext'
import { cn } from '../lib/utils'
import { tm } from '../lib/ui'

const TABS = [
  { id: 'general',    label: 'General',       icon: SettingsIcon },
  { id: 'appearance', label: 'Appearance',    icon: Palette      },
  { id: 'account',    label: 'Account',       icon: User         },
  { id: 'security',   label: 'Security',      icon: Shield       },
  { id: 'ai',         label: 'AI Provider',   icon: Zap          },
  { id: 'system',     label: 'System Status', icon: Activity     },
]

export function Settings() {
  const [tab,   setTab]   = useState('general')
  const [health, setHealth] = useState<any>(null)
  const [hLoad,  setHLoad]  = useState(false)
  const [hTime,  setHTime]  = useState('')
  const [curPwd, setCurPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [conPwd, setConPwd] = useState('')
  const [pwdMsg, setPwdMsg] = useState({ text: '', ok: false })
  const [saving, setSaving] = useState(false)
  const { theme, toggle }   = useTheme()

  useEffect(() => { if (tab === 'system') check() }, [tab])

  const check = async () => {
    setHLoad(true)
    const t0 = Date.now()
    try {
      const r = await api.get('/health', { baseURL: 'http://localhost:4000/api/v1' })
      setHealth(r.data); setHTime(`${Date.now()-t0}ms`)
    } catch {
      try { const r = await api.get('/../health'); setHealth(r.data); setHTime(`${Date.now()-t0}ms`) }
      catch { setHealth({ status:'error', backend:'fail', database:'fail', redis:'fail', celery:'fail', groq_ai:'fail' }) }
    } finally { setHLoad(false) }
  }

  const changePwd = async (e: React.FormEvent) => {
    e.preventDefault(); setPwdMsg({ text:'', ok:false })
    if (newPwd !== conPwd) return setPwdMsg({ text:'Passwords do not match.', ok:false })
    if (newPwd.length < 8) return setPwdMsg({ text:'Minimum 8 characters.', ok:false })
    setSaving(true)
    try {
      await api.post('/auth/change-password', { current_password:curPwd, new_password:newPwd })
      setPwdMsg({ text:'Password changed successfully.', ok:true })
      setCurPwd(''); setNewPwd(''); setConPwd('')
    } catch (e: any) { setPwdMsg({ text:e.response?.data?.detail||'Incorrect current password.', ok:false }) }
    finally { setSaving(false) }
  }

  const services = [
    { name:'FastAPI Backend',  key:'backend',  icon:Server,   desc:'REST API server'       },
    { name:'PostgreSQL',       key:'database', icon:Database, desc:'Primary database'      },
    { name:'Redis / Queue',    key:'redis',    icon:Activity, desc:'Cache & task queue'    },
    { name:'Celery Workers',   key:'celery',   icon:Activity, desc:'Background processing' },
    { name:'Groq AI API',      key:'groq_ai',  icon:Zap,      desc:'LLM provider'          },
  ]

  return (
    <div className="space-y-4 max-w-5xl tm-up">
      <div>
        <h1 className={tm.h1}>Settings</h1>
        <p className={tm.sub}>Manage your account preferences and system configuration</p>
      </div>

      <div className="flex gap-4">
        {/* Tabs */}
        <nav className="w-44 shrink-0 space-y-0.5">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cn(tm.nav, 'w-full', tab === t.id ? tm.navOn : tm.navOff)}>
              <t.icon size={14} className={tab === t.id ? 'text-brand' : 'text-muted'} />
              <span className="text-[13px]">{t.label}</span>
            </button>
          ))}
        </nav>

        {/* Panel */}
        <div className={cn(tm.card, 'flex-1 p-5 min-h-[400px] tm-pop')}>

          {tab === 'general' && (
            <Sec title="General Settings">
              <p className="text-sm text-text2">General preferences for your TenderMind workspace.</p>
              <div className="mt-4 space-y-3 max-w-sm">
                <Fld label="Workspace Name"><input className={tm.inputRo} defaultValue="My TenderMind Workspace" readOnly /></Fld>
                <Fld label="Language"><input className={tm.inputRo} defaultValue="English" readOnly /></Fld>
              </div>
            </Sec>
          )}

          {tab === 'appearance' && (
            <Sec title="Appearance">
              <p className="text-sm text-text2 mb-5">Choose how TenderMind looks.</p>
              <div className="flex gap-3 max-w-xs">
                {(['light','dark'] as const).map(t => (
                  <button key={t} onClick={() => t !== theme && toggle()}
                    className={cn(
                      'flex-1 flex flex-col items-center gap-2 py-4 rounded-xl border-2 transition-all',
                      theme === t ? 'border-brand bg-brand-subtle' : 'border-border hover:border-brand/40'
                    )}>
                    {t === 'light' ? <Sun size={20} className={theme===t?'text-brand':'text-text2'} />
                                   : <Moon size={20} className={theme===t?'text-brand':'text-text2'} />}
                    <span className={cn('text-sm font-semibold capitalize', theme===t?'text-brand':'text-text2')}>{t}</span>
                    {theme===t && <span className={cn(tm.badge, tm.bBrand,'text-[10px]')}>Active</span>}
                  </button>
                ))}
              </div>
            </Sec>
          )}

          {tab === 'account' && (
            <Sec title="Account Details">
              <div className="space-y-3 max-w-sm">
                <Fld label="Full Name"><input className={tm.inputRo} defaultValue="User" readOnly /></Fld>
                <Fld label="Email"><input className={tm.inputRo} defaultValue="user@example.com" readOnly /></Fld>
                <p className="text-xs text-muted">Contact your administrator to update account details.</p>
              </div>
            </Sec>
          )}

          {tab === 'security' && (
            <Sec title="Change Password">
              {pwdMsg.text && (
                <div className={cn('text-sm px-3.5 py-2.5 rounded-lg border mb-4 tm-in',
                  pwdMsg.ok ? 'bg-ok-subtle text-ok border-ok/20' : 'bg-bad-subtle text-bad border-bad/20')}>
                  {pwdMsg.text}
                </div>
              )}
              <form onSubmit={changePwd} className="space-y-4 max-w-sm">
                <Fld label="Current Password"><input type="password" value={curPwd} onChange={e=>setCurPwd(e.target.value)} className={tm.input} required /></Fld>
                <Fld label="New Password"><input type="password" value={newPwd} onChange={e=>setNewPwd(e.target.value)} className={tm.input} required minLength={8} /></Fld>
                <Fld label="Confirm Password"><input type="password" value={conPwd} onChange={e=>setConPwd(e.target.value)} className={tm.input} required /></Fld>
                <button type="submit" disabled={saving} className={cn(tm.btn, tm.btnBrand, tm.btnSm, saving&&'opacity-70')}>
                  {saving ? <><span className={tm.spinSm} style={{ borderTopColor:'#fff', borderColor:'rgba(255,255,255,.3)' }} />Updating…</> : 'Change Password'}
                </button>
              </form>
            </Sec>
          )}

          {tab === 'ai' && (
            <Sec title="AI Provider Configuration">
              <div className="space-y-4 max-w-sm">
                <Fld label="Active Provider"><input className={tm.inputRo} value="Groq Cloud API" readOnly /></Fld>
                <Fld label="Model"><input className={tm.inputRo} value="qwen/qwen3.8-27b" readOnly /></Fld>
                <Fld label="Endpoint"><input className={tm.inputRo} value="https://api.groq.com/openai/v1" readOnly /></Fld>
                <div>
                  <label className={tm.label}>Status</label>
                  <div className="flex items-center gap-2">
                    {health?.groq_ai === 'ok'
                      ? <><CheckCircle size={14} className="text-ok" /><span className="text-sm text-ok font-medium">Connected</span></>
                      : <><XCircle size={14} className="text-bad" /><span className="text-sm text-bad font-medium">Add GROQ_API_KEY to .env</span></>
                    }
                  </div>
                </div>
                <p className="text-xs text-muted">
                  Get a free key at{' '}
                  <a href="https://console.groq.com" target="_blank" rel="noreferrer" className="text-brand hover:underline">console.groq.com</a>
                </p>
              </div>
            </Sec>
          )}

          {tab === 'system' && (
            <div>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className={tm.h2}>System Status</h2>
                  <p className="text-xs text-muted mt-0.5">
                    Live health of all TenderMind services{hTime && ` · checked in ${hTime}`}
                  </p>
                </div>
                <button onClick={check} disabled={hLoad}
                  className={cn(tm.btn, tm.btnSec, tm.btnSm, hLoad&&'opacity-70')}>
                  <RefreshCw size={12} className={hLoad ? 'spin' : ''} /> Refresh
                </button>
              </div>

              {!health ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {services.map(s => <div key={s.key} className="skeleton h-16" />)}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {services.map(s => {
                    const ok = health[s.key] === 'ok'
                    return (
                      <div key={s.name} className={cn(
                        'flex items-center gap-3 p-3.5 rounded-xl border',
                        ok ? 'bg-ok-subtle border-ok/20' : 'bg-bad-subtle border-bad/20'
                      )}>
                        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                          ok ? 'bg-ok/15' : 'bg-bad/15')}>
                          <s.icon size={15} className={ok ? 'text-ok' : 'text-bad'} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-[13px] font-semibold text-text truncate">{s.name}</p>
                            {ok ? <CheckCircle size={13} className="text-ok shrink-0" /> : <XCircle size={13} className="text-bad shrink-0" />}
                          </div>
                          <p className={cn('text-[11px] mt-0.5', ok ? 'text-ok' : 'text-bad')}>
                            {ok ? 'Operational' : 'Down / Not configured'}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              <div className={cn(
                'mt-4 flex items-center gap-2 px-3.5 py-2.5 rounded-lg border text-[13px] font-medium',
                health?.status === 'ok'
                  ? 'bg-ok-subtle text-ok border-ok/20'
                  : 'bg-warn-subtle text-warn border-warn/20'
              )}>
                <CheckCircle size={14} />
                {health ? (health.status === 'ok' ? 'All systems operational' : 'Some services need attention') : 'Checking…'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className={cn(tm.h2, 'pb-3 mb-4 border-b border-border')}>{title}</h2>
      {children}
    </div>
  )
}
function Fld({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={cn(tm.label, 'block mb-1.5')}>{label}</label>
      {children}
    </div>
  )
}
