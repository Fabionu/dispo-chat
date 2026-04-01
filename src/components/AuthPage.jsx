import { useState, useRef, useCallback, useEffect } from 'react'
import { api } from '../services/api.js'

const iBase = {
  width: '100%', borderRadius: '9px', fontSize: '14px',
  outline: 'none', transition: 'all 0.2s', fontFamily: 'inherit',
  boxSizing: 'border-box', color: 'rgba(255,255,255,0.9)',
}

const lStyle = {
  display: 'block', fontSize: '12px', fontWeight: 500,
  color: 'rgba(255,255,255,0.35)', marginBottom: '7px', letterSpacing: '0.01em',
}

const iconPos = {
  position: 'absolute', left: '14px', top: '50%',
  transform: 'translateY(-50%)', pointerEvents: 'none', transition: 'stroke 0.2s',
}

function Field({ label, type = 'text', value, onChange, placeholder, focused, focusKey, onFocus, onBlur, icon, autoFocus }) {
  const hasPad = !!icon
  const style = {
    ...iBase,
    padding: hasPad ? '12px 16px 12px 44px' : '12px 16px',
    border: `1.5px solid ${focused === focusKey ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.14)'}`,
    background: focused === focusKey ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.05)',
  }
  return (
    <div>
      {label && <label style={lStyle}>{label}</label>}
      <div style={{ position: 'relative' }}>
        {icon && <span style={iconPos}>{icon(focused === focusKey)}</span>}
        <input
          type={type} value={value} onChange={onChange} placeholder={placeholder}
          onFocus={() => onFocus(focusKey)} onBlur={() => onFocus(null)}
          autoFocus={autoFocus} required style={style}
        />
      </div>
    </div>
  )
}

function ErrorBox({ msg }) {
  if (!msg) return null
  return (
    <div style={{
      background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)',
      color: 'rgba(239,68,68,0.8)', padding: '10px 14px', borderRadius: '8px',
      fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px',
    }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      {msg}
    </div>
  )
}

function Spinner() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      style={{ animation: 'spin-loader 0.65s linear infinite', transformOrigin: 'center', flexShrink: 0 }}>
      <circle cx="12" cy="12" r="9" stroke="rgba(0,0,0,0.2)" strokeWidth="2.5"/>
      <path d="M12 3a9 9 0 0 1 9 9" stroke="rgba(0,0,0,0.6)" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  )
}

function SubmitBtn({ loading, label, loadingLabel }) {
  return (
    <button type="submit" disabled={loading} style={{
      width: '100%', padding: '13px',
      background: loading ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.88)',
      border: 'none', borderRadius: '9px', fontSize: '14px', fontWeight: 600,
      color: '#0a0a0f', cursor: loading ? 'not-allowed' : 'pointer',
      transition: 'all 0.2s', fontFamily: 'inherit',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    }}
    onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#fff' }}
    onMouseLeave={e => { if (!loading) e.currentTarget.style.background = 'rgba(255,255,255,0.88)' }}
    >
      {loading ? <><Spinner />{loadingLabel}</> : label}
    </button>
  )
}

// ─── Icons ───────────────────────────────────────────────────────
const IconMail = (active) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
    stroke={active ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.2)'} strokeWidth="2" strokeLinecap="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
)
const IconLock = (active) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
    stroke={active ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.2)'} strokeWidth="2" strokeLinecap="round">
    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
)
const IconUser = (active) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
    stroke={active ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.2)'} strokeWidth="2" strokeLinecap="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
)

// ─── Login form ───────────────────────────────────────────────────
function LoginForm({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const [focused, setFocused] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const { user, token } = await api.login(username, password)
      onLogin(user, token, rememberMe)
    } catch (err) {
      setError(err.message || 'Invalid username or password')
    } finally { setLoading(false) }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <Field label="Username" value={username} onChange={e => { setUsername(e.target.value); setError('') }}
        placeholder="ion.popescu" focused={focused} focusKey="un" onFocus={setFocused}
        icon={IconUser} autoFocus />
      <Field label="Password" type="password" value={password} onChange={e => { setPassword(e.target.value); setError('') }}
        placeholder="••••••••" focused={focused} focusKey="pw" onFocus={setFocused} icon={IconLock} />

      {/* Remember me */}
      <div onClick={() => setRememberMe(v => !v)}
        style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none', marginTop: '-2px' }}>
        <div style={{
          width: 16, height: 16, borderRadius: 4, flexShrink: 0, transition: 'all 0.18s',
          border: `1.5px solid ${rememberMe ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)'}`,
          background: rememberMe ? 'rgba(255,255,255,0.15)' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {rememberMe && (
            <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
              <polyline points="1 3.5 3.5 6 8 1" stroke="rgba(255,255,255,0.8)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
        <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>Remember me</span>
      </div>

      <ErrorBox msg={error} />
      <SubmitBtn loading={loading} label="Log in →" loadingLabel="Logging in..." />
    </form>
  )
}

// ─── Register form ────────────────────────────────────────────────
function RegisterForm({ onLogin }) {
  const [form, setForm]     = useState({ first_name: '', last_name: '', username: '', email: '', password: '', confirm: '' })
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const [focused, setFocused] = useState(null)

  const set = (k) => (e) => { setForm(f => ({ ...f, [k]: e.target.value })); setError('') }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.first_name.trim() || !form.last_name.trim()) return setError('First and last name are required')
    if (form.username.trim().length < 3)  return setError('Username must be at least 3 characters')
    if (form.password.length < 6)         return setError('Password must be at least 6 characters')
    if (form.password !== form.confirm)   return setError('Passwords do not match')
    setLoading(true)
    try {
      const { user, token } = await api.register(form.first_name.trim(), form.last_name.trim(), form.username.trim(), form.email.trim(), form.password)
      onLogin(user, token, true)
    } catch (err) {
      setError(err.message || 'Registration failed')
    } finally { setLoading(false) }
  }

  const iSimple = (f) => ({
    ...iBase,
    padding: '12px 16px',
    border: `1.5px solid ${focused === f ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.14)'}`,
    background: focused === f ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.05)',
  })

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Name row */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <div style={{ flex: 1 }}>
          <label style={lStyle}>First name</label>
          <input type="text" value={form.first_name} onChange={set('first_name')} placeholder="Ion"
            onFocus={() => setFocused('fn')} onBlur={() => setFocused(null)} required style={iSimple('fn')} autoFocus />
        </div>
        <div style={{ flex: 1 }}>
          <label style={lStyle}>Last name</label>
          <input type="text" value={form.last_name} onChange={set('last_name')} placeholder="Popescu"
            onFocus={() => setFocused('ln')} onBlur={() => setFocused(null)} required style={iSimple('ln')} />
        </div>
      </div>

      <Field label="Username" value={form.username} onChange={set('username')}
        placeholder="ion.popescu" focused={focused} focusKey="un" onFocus={setFocused} icon={IconUser} />
      <Field label="Email" type="email" value={form.email} onChange={set('email')}
        placeholder="ion@company.com" focused={focused} focusKey="em" onFocus={setFocused} icon={IconMail} />
      <Field label="Password" type="password" value={form.password} onChange={set('password')}
        placeholder="••••••••" focused={focused} focusKey="pw" onFocus={setFocused} icon={IconLock} />
      <Field label="Confirm password" type="password" value={form.confirm} onChange={set('confirm')}
        placeholder="••••••••" focused={focused} focusKey="cf" onFocus={setFocused} icon={IconLock} />

      <ErrorBox msg={error} />
      <SubmitBtn loading={loading} label="Register →" loadingLabel="Creating account..." />
    </form>
  )
}

// ─── Main AuthPage ────────────────────────────────────────────────
export default function AuthPage({ onLogin }) {
  const [view, setView]         = useState('login')
  const [phase, setPhase]       = useState('idle') // 'idle' | 'out' | 'in'
  const [rendered, setRendered] = useState('login')
  const [cursor, setCursor]     = useState({ x: 0, y: 0, visible: false })
  const rightRef                = useRef(null)
  const timerRef                = useRef(null)

  const switchTo = (next) => {
    if (next === view || phase !== 'idle') return
    setView(next)
    setPhase('out')
  }

  useEffect(() => {
    if (phase === 'out') {
      timerRef.current = setTimeout(() => {
        setRendered(view)
        setPhase('in')
      }, 180)
    } else if (phase === 'in') {
      timerRef.current = setTimeout(() => setPhase('idle'), 20)
    }
    return () => clearTimeout(timerRef.current)
  }, [phase, view])

  const formStyle = {
    transition: 'opacity 0.18s ease, transform 0.18s ease',
    opacity:    phase === 'out' ? 0 : 1,
    transform:  phase === 'out'
      ? `translateX(${view === 'register' ? '-18px' : '18px'})`
      : phase === 'in' ? `translateX(${view === 'register' ? '18px' : '-18px'})` : 'translateX(0)',
  }

  const handleMouseMove = useCallback((e) => {
    const rect = rightRef.current?.getBoundingClientRect()
    if (!rect) return
    setCursor({ x: e.clientX - rect.left, y: e.clientY - rect.top, visible: true })
  }, [])
  const handleMouseLeave = useCallback(() => setCursor(c => ({ ...c, visible: false })), [])

  const tabBtn = (label, key) => {
    const active = view === key
    return (
      <button
        key={key}
        onClick={() => switchTo(key)}
        style={{
          flex: 1, padding: '9px 0',
          borderRadius: '8px', border: 'none',
          fontSize: '13px', fontWeight: 600,
          background: active ? 'rgba(255,255,255,0.16)' : 'transparent',
          color: active ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.40)',
          cursor: 'pointer', fontFamily: 'inherit',
          transition: 'all 0.2s',
        }}
        onMouseEnter={e => { if (!active) e.currentTarget.style.color = 'rgba(255,255,255,0.5)' }}
        onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'rgba(255,255,255,0.25)' }}
      >
        {label}
      </button>
    )
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, display: 'flex',
      fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      {/* ── LEFT PANEL ── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center',
        padding: '48px 44px', background: '#0a0a0f',
        borderRight: '1px solid rgba(255,255,255,0.05)', overflowY: 'auto',
      }}>
        <div style={{ width: '100%', maxWidth: '360px' }}>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '36px' }}>
            <div style={{
              width: 36, height: 36, borderRadius: 9, flexShrink: 0,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <span style={{ fontSize: '15px', fontWeight: 600, color: 'rgba(255,255,255,0.8)', letterSpacing: '-0.01em' }}>
              Dispo Chat
            </span>
          </div>

          {/* Toggle tabs */}
          <div style={{
            display: 'flex', gap: '4px', marginBottom: '30px',
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '11px', padding: '4px',
          }}>
            {tabBtn('Log in', 'login')}
            {tabBtn('Register', 'register')}
          </div>

          {/* Heading */}
          <div style={{ marginBottom: '24px', ...formStyle }}>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#fff', letterSpacing: '-0.03em', marginBottom: '6px', lineHeight: 1.2 }}>
              {rendered === 'login' ? 'Welcome back' : 'Create your account'}
            </h1>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', lineHeight: 1.55 }}>
              {rendered === 'login'
                ? 'Enter your credentials to access the dispatch platform'
                : 'Join Dispo Chat and start coordinating with your team'}
            </p>
          </div>

          {/* Form */}
          <div style={formStyle}>
            {rendered === 'login'
              ? <LoginForm onLogin={onLogin} />
              : <RegisterForm onLogin={onLogin} />
            }
          </div>

        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div ref={rightRef} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}
        style={{ flex: 1, position: 'relative', background: '#0d0d14', overflow: 'hidden', cursor: 'none' }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '28px 28px', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', top: '-80px', right: '-60px', width: 520, height: 520,
          background: 'radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 65%)', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '-80px', left: '10%', width: 340, height: 340,
          background: 'radial-gradient(circle, rgba(255,255,255,0.025) 0%, transparent 65%)', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute',
          left: cursor.x, top: cursor.y, width: 500, height: 500,
          transform: 'translate(-50%, -50%)', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 35%, transparent 70%)',
          filter: 'blur(40px)', pointerEvents: 'none',
          opacity: cursor.visible ? 1 : 0, transition: 'opacity 0.3s ease',
        }} />
      </div>
    </div>
  )
}
