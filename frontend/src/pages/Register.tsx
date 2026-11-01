import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ArrowRight, Sparkles, Sun, Moon } from 'lucide-react'
import { api } from '../lib/api'
import { useTheme } from '../contexts/ThemeContext'
import { cn } from '../lib/utils'
import { tm } from '../lib/ui'

export function Register() {
  const [name,  setName]  = useState('')
  const [email, setEmail] = useState('')
  const [pwd,   setPwd]   = useState('')
  const [conf,  setConf]  = useState('')
  const [show,  setShow]  = useState(false)
  const [err,   setErr]   = useState('')
  const [ok,    setOk]    = useState('')
  const [busy,  setBusy]  = useState(false)
  const navigate = useNavigate()
  const { theme, toggle } = useTheme()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(''); setOk('')
    if (pwd !== conf) return setErr('Passwords do not match.')
    if (pwd.length < 8) return setErr('Password must be at least 8 characters.')
    setBusy(true)
    try {
      await api.post('/auth/register', { email, password: pwd, full_name: name })
      setOk('Account created! Redirecting…')
      setTimeout(() => navigate('/login'), 2000)
    } catch (e: any) {
      const d = e.response?.data?.detail
      setErr(Array.isArray(d) ? d[0]?.msg : d || 'Registration failed.')
    } finally { setBusy(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg py-10 px-4 relative">
      <div className="absolute top-4 right-4">
        <button onClick={toggle} className={cn(tm.btn, tm.btnGhost, tm.btnIcon)} aria-label="Toggle theme">
          {theme === 'dark' ? <Sun size={14} className="text-warn" /> : <Moon size={14} className="text-text2" />}
        </button>
      </div>

      <div className="w-full max-w-md tm-up">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-9 h-9 bg-brand rounded-xl flex items-center justify-center">
            <Sparkles size={16} className="text-white" />
          </div>
          <div>
            <p className="text-[14px] font-bold text-text">TenderMind</p>
            <p className="text-[10px] text-muted">Intelligence Behind Every Tender</p>
          </div>
        </div>

        <div className={cn(tm.card, 'p-7')}>
          <h1 className="text-xl font-bold text-text mb-1">Create your account</h1>
          <p className="text-sm text-text2 mb-6">Get started in minutes. No credit card required.</p>

          {err && <div className="bg-bad-subtle border border-bad/20 text-bad text-[13px] px-3.5 py-2.5 rounded-lg mb-4 tm-in">{err}</div>}
          {ok  && <div className="bg-ok-subtle border border-ok/20 text-ok text-[13px] px-3.5 py-2.5 rounded-lg mb-4 tm-in">{ok}</div>}

          <form onSubmit={submit} className="space-y-4">
            {[
              { l:'Full name',  t:'text',  v:name,  s:setName,  p:'Jane Smith'       },
              { l:'Work email', t:'email', v:email, s:setEmail, p:'you@company.com'  },
            ].map(f => (
              <div key={f.l}>
                <label className={tm.label}>{f.l}</label>
                <input type={f.t} value={f.v} onChange={e => f.s(e.target.value)} className={tm.input} placeholder={f.p} required />
              </div>
            ))}
            <div>
              <label className={tm.label}>Password</label>
              <div className="relative">
                <input type={show ? 'text' : 'password'} value={pwd} onChange={e => setPwd(e.target.value)}
                  className={cn(tm.input, 'pr-9')} placeholder="Min. 8 characters" required />
                <button type="button" onClick={() => setShow(!show)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-text transition-colors">
                  {show ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <div>
              <label className={tm.label}>Confirm password</label>
              <input type="password" value={conf} onChange={e => setConf(e.target.value)} className={tm.input} placeholder="••••••••" required />
            </div>
            <button type="submit" disabled={busy || !!ok}
              className={cn(tm.btn, tm.btnBrand, 'w-full', (busy || !!ok) && 'opacity-70')}>
              {busy
                ? <><span className={tm.spinSm} style={{ borderTopColor:'#fff', borderColor:'rgba(255,255,255,.3)' }} />Creating…</>
                : <><span>Create account</span><ArrowRight size={14} /></>
              }
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-text2">
          Already have an account?{' '}
          <Link to="/login" className="text-brand font-semibold hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
