import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ArrowRight, Sparkles, FileSearch, Shield, BarChart3, Sun, Moon } from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { cn } from '../lib/utils'
import { tm } from '../lib/ui'

export function Login() {
  const [email, setEmail]     = useState('')
  const [pwd,   setPwd]       = useState('')
  const [show,  setShow]      = useState(false)
  const [err,   setErr]       = useState('')
  const [busy,  setBusy]      = useState(false)
  const navigate = useNavigate()
  const { login } = useAuth()
  const { theme, toggle } = useTheme()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(''); setBusy(true)
    try {
      const fd = new URLSearchParams()
      fd.append('username', email); fd.append('password', pwd)
      const r = await api.post('/auth/login', fd, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
      login(r.data.access_token); navigate('/')
    } catch (e: any) { setErr(e.response?.data?.detail || 'Invalid email or password.') }
    finally { setBusy(false) }
  }

  return (
    <div className="min-h-screen flex overflow-hidden bg-bg">
      {/* ── Left panel: deep dark with red glow ── */}
      <div
        className="hidden lg:flex flex-col justify-between w-[460px] shrink-0 relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg,#1a0a0a 0%,#1f0d0a 50%,#0d0905 100%)' }}
      >
        {/* Grid overlay */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: 'linear-gradient(rgba(244,64,34,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(244,64,34,.08) 1px,transparent 1px)', backgroundSize: '36px 36px' }} />
        {/* Glow orb */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle,rgba(244,64,34,.28) 0%,transparent 70%)' }} />

        {/* Logo */}
        <div className="relative z-10 p-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(244,64,34,.25)', border: '1px solid rgba(244,64,34,.4)' }}>
              <Sparkles size={17} className="text-brand" />
            </div>
            <span className="text-white text-[15px] font-bold tracking-tight">TenderMind</span>
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 px-10 pb-6">
          <h2 className="text-[28px] font-bold text-white leading-tight mb-4">
            Turn Complex Tenders<br />Into Clear Decisions.
          </h2>
          <p className="text-sm leading-relaxed mb-10" style={{ color: 'rgba(255,255,255,.45)' }}>
            The AI procurement platform that reads, analyses and matches tender documents with your company profile in minutes.
          </p>

          <div className="space-y-5">
            {[
              { icon: FileSearch,  title: 'Intelligent document analysis',    desc: 'Extract key information from complex PDFs automatically.' },
              { icon: Shield,      title: 'Multi-document understanding',      desc: 'Analyse and cross-reference multiple tender documents.' },
              { icon: BarChart3,   title: 'AI-powered eligibility insights',   desc: 'Know instantly if your company qualifies before bidding.' },
            ].map(f => (
              <div key={f.title} className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(244,64,34,.15)', border: '1px solid rgba(244,64,34,.25)' }}>
                  <f.icon size={16} style={{ color: '#F44022' }} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{f.title}</p>
                  <p className="text-[12px] mt-0.5" style={{ color: 'rgba(255,255,255,.4)' }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 px-10 pb-10 text-[11px]" style={{ color: 'rgba(255,255,255,.2)' }}>
          © 2026 TenderMind · Intelligence Behind Every Tender
        </p>
      </div>

      {/* ── Right panel: auth form ── */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        <div className="flex justify-end p-4">
          <button onClick={toggle} className={cn(tm.btn, tm.btnGhost, tm.btnIcon)} aria-label="Toggle theme">
            {theme === 'dark' ? <Sun size={15} className="text-warn" /> : <Moon size={15} className="text-text2" />}
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 pb-10">
          <div className="w-full max-w-sm tm-up">
            {/* Mobile logo */}
            <div className="lg:hidden flex items-center gap-2 mb-8">
              <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center">
                <Sparkles size={14} className="text-white" />
              </div>
              <span className="text-[14px] font-bold text-text">TenderMind</span>
            </div>

            <h1 className="text-2xl font-bold text-text mb-1">Welcome back</h1>
            <p className="text-sm text-text2 mb-7">Sign in to your account to continue.</p>

            {err && (
              <div className="bg-bad-subtle border border-bad/20 text-bad text-sm px-3.5 py-2.5 rounded-lg mb-5 tm-in">
                {err}
              </div>
            )}

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className={tm.label}>Email address</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className={tm.input} placeholder="you@company.com" required autoComplete="email" />
              </div>
              <div>
                <label className={tm.label}>Password</label>
                <div className="relative">
                  <input type={show ? 'text' : 'password'} value={pwd} onChange={e => setPwd(e.target.value)}
                    className={cn(tm.input, 'pr-9')} placeholder="••••••••" required autoComplete="current-password" />
                  <button type="button" onClick={() => setShow(!show)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-text transition-colors">
                    {show ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={busy}
                className={cn(tm.btn, tm.btnBrand, 'w-full', busy && 'opacity-70')}>
                {busy
                  ? <><span className={tm.spinSm} style={{ borderTopColor:'#fff', borderColor:'rgba(255,255,255,.3)' }} />Signing in…</>
                  : <><span>Sign in</span><ArrowRight size={14} /></>
                }
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-text2">
              Don't have an account?{' '}
              <Link to="/register" className="text-brand font-semibold hover:underline">Create one free</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
