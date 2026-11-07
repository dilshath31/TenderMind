import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Mail, Copy, Check, KeyRound, Sparkles } from 'lucide-react'
import { api } from '../lib/api'
import { cn } from '../lib/utils'
import { tm } from '../lib/ui'

type Step = 'request' | 'token_shown' | 'reset' | 'done'

export function ForgotPassword() {
  const [step,     setStep]     = useState<Step>('request')
  const [email,    setEmail]    = useState('')
  const [token,    setToken]    = useState('')
  const [userToken,setUserToken]= useState('')   // user pastes/copies the token
  const [newPwd,   setNewPwd]   = useState('')
  const [confPwd,  setConfPwd]  = useState('')
  const [copied,   setCopied]   = useState(false)
  const [busy,     setBusy]     = useState(false)
  const [err,      setErr]      = useState('')
  const [msg,      setMsg]      = useState('')

  // ── Step 1: Request reset token ──────────────────────────────────────────
  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(''); setBusy(true)
    try {
      const r = await api.post('/auth/forgot-password', { email })
      if (r.data.token) {
        setToken(r.data.token)
        setStep('token_shown')
      } else {
        // Account not found — still show a neutral message
        setMsg('If an account with that email exists, a reset token has been generated.')
        setStep('token_shown')
      }
    } catch (e: any) {
      setErr(e.response?.data?.detail || 'Something went wrong. Try again.')
    } finally { setBusy(false) }
  }

  // ── Copy token to clipboard ───────────────────────────────────────────────
  const handleCopy = () => {
    navigator.clipboard.writeText(token).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  // ── Step 2: Use token + set new password ─────────────────────────────────
  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr('')
    if (newPwd !== confPwd) { setErr('Passwords do not match.'); return }
    if (newPwd.length < 8)  { setErr('Password must be at least 8 characters.'); return }
    setBusy(true)
    try {
      await api.post('/auth/reset-password', {
        email, token: userToken, new_password: newPwd
      })
      setStep('done')
    } catch (e: any) {
      setErr(e.response?.data?.detail || 'Invalid or expired token.')
    } finally { setBusy(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4 py-12">
      <div className="w-full max-w-md tm-up">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-9 h-9 bg-brand rounded-xl flex items-center justify-center shadow-md">
            <Sparkles size={16} className="text-white" />
          </div>
          <div>
            <p className="text-[14px] font-bold text-text">TenderMind</p>
            <p className="text-[10px] text-muted">Intelligence Behind Every Tender</p>
          </div>
        </div>

        {/* ── STEP 1: Enter email ── */}
        {step === 'request' && (
          <div className={cn(tm.card, 'p-7')}>
            <div className="w-11 h-11 bg-brand-subtle rounded-xl flex items-center justify-center mb-4">
              <KeyRound size={20} className="text-brand" />
            </div>
            <h1 className="text-xl font-bold text-text mb-1">Forgot your password?</h1>
            <p className="text-sm text-text2 mb-6">
              Enter your account email. We'll generate a reset token you can use immediately — no email needed.
            </p>

            {err && (
              <div className="bg-bad-subtle border border-bad/20 text-bad text-[13px] px-3.5 py-2.5 rounded-lg mb-4 tm-in">
                {err}
              </div>
            )}

            <form onSubmit={handleRequest} className="space-y-4">
              <div>
                <label className={tm.label}>Your email address</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    className={cn(tm.input, 'pl-8')} placeholder="you@company.com" required />
                </div>
              </div>
              <button type="submit" disabled={busy}
                className={cn(tm.btn, tm.btnBrand, 'w-full', busy && 'opacity-70')}>
                {busy
                  ? <><span className={tm.spinSm} style={{ borderTopColor:'#fff', borderColor:'rgba(255,255,255,.3)' }} />Generating token…</>
                  : 'Generate Reset Token'
                }
              </button>
            </form>

            <Link to="/login"
              className="flex items-center gap-1.5 text-sm text-text2 hover:text-text mt-5 transition-colors">
              <ArrowLeft size={14} /> Back to sign in
            </Link>
          </div>
        )}

        {/* ── STEP 2: Show token ── */}
        {step === 'token_shown' && (
          <div className={cn(tm.card, 'p-7')}>
            {token ? (
              <>
                <div className="w-11 h-11 bg-ok-subtle rounded-xl flex items-center justify-center mb-4">
                  <KeyRound size={20} className="text-ok" />
                </div>
                <h1 className="text-xl font-bold text-text mb-1">Your reset token</h1>
                <p className="text-sm text-text2 mb-5">
                  Copy the token below. It expires in <strong className="text-text">6 hours</strong>.
                  You'll need it on the next step.
                </p>

                {/* Token display */}
                <div className="bg-subtle border border-border rounded-xl p-4 mb-5">
                  <p className="text-[10px] font-bold text-muted uppercase tracking-wide mb-2">Reset Token</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-[13px] font-mono text-text break-all select-all leading-relaxed">
                      {token}
                    </code>
                    <button
                      onClick={handleCopy}
                      className={cn(
                        tm.btn, tm.btnSec, tm.btnSm, 'shrink-0 gap-1.5',
                        copied && 'bg-ok-subtle text-ok border-ok/20'
                      )}
                    >
                      {copied ? <><Check size={13} />Copied!</> : <><Copy size={13} />Copy</>}
                    </button>
                  </div>
                </div>

                <div className="bg-warn-subtle border border-warn/20 rounded-lg px-3.5 py-2.5 text-[12px] text-warn mb-5">
                  ⚠️ This token is shown <strong>once only</strong>. Save or copy it before leaving this page.
                </div>

                <button
                  onClick={() => { setUserToken(token); setStep('reset') }}
                  className={cn(tm.btn, tm.btnBrand, 'w-full')}>
                  Continue to Reset Password →
                </button>
              </>
            ) : (
              <>
                <div className="w-11 h-11 bg-ok-subtle rounded-xl flex items-center justify-center mb-4">
                  <Mail size={20} className="text-ok" />
                </div>
                <h1 className="text-xl font-bold text-text mb-1">Check your details</h1>
                <p className="text-sm text-text2 mb-6">{msg}</p>
                <Link to="/login"
                  className={cn(tm.btn, tm.btnBrand, 'w-full text-center')}>
                  Back to Sign In
                </Link>
              </>
            )}
          </div>
        )}

        {/* ── STEP 3: Enter token + new password ── */}
        {step === 'reset' && (
          <div className={cn(tm.card, 'p-7')}>
            <div className="w-11 h-11 bg-brand-subtle rounded-xl flex items-center justify-center mb-4">
              <KeyRound size={20} className="text-brand" />
            </div>
            <h1 className="text-xl font-bold text-text mb-1">Set a new password</h1>
            <p className="text-sm text-text2 mb-5">
              Paste your reset token and choose a new password.
            </p>

            {err && (
              <div className="bg-bad-subtle border border-bad/20 text-bad text-[13px] px-3.5 py-2.5 rounded-lg mb-4 tm-in">
                {err}
              </div>
            )}

            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label className={tm.label}>Reset token</label>
                <input value={userToken} onChange={e => setUserToken(e.target.value)}
                  className={cn(tm.input, 'font-mono text-[13px]')}
                  placeholder="Paste your reset token here" required />
              </div>
              <div>
                <label className={tm.label}>New password</label>
                <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)}
                  className={tm.input} placeholder="Min. 8 characters" required minLength={8} />
              </div>
              <div>
                <label className={tm.label}>Confirm new password</label>
                <input type="password" value={confPwd} onChange={e => setConfPwd(e.target.value)}
                  className={tm.input} placeholder="••••••••" required />
              </div>
              <button type="submit" disabled={busy}
                className={cn(tm.btn, tm.btnBrand, 'w-full', busy && 'opacity-70')}>
                {busy
                  ? <><span className={tm.spinSm} style={{ borderTopColor:'#fff', borderColor:'rgba(255,255,255,.3)' }} />Resetting…</>
                  : 'Reset Password'
                }
              </button>
            </form>
          </div>
        )}

        {/* ── STEP 4: Success ── */}
        {step === 'done' && (
          <div className={cn(tm.card, 'p-7 text-center')}>
            <div className="w-14 h-14 bg-ok-subtle rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Check size={28} className="text-ok" />
            </div>
            <h1 className="text-xl font-bold text-text mb-2">Password reset!</h1>
            <p className="text-sm text-text2 mb-6">
              Your password has been changed successfully. You can now sign in with your new password.
            </p>
            <Link to="/login" className={cn(tm.btn, tm.btnBrand, 'inline-flex')}>
              Sign in now →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
