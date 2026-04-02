import { useState, useRef, useCallback } from 'react'
import { api } from '../services/api.js'

// Accent color — light silver/gray
const ACCENT = 'rgba(255,255,255,0.55)'
const ACCENT_STRONG = 'rgba(255,255,255,0.85)'

export default function LoginPage({ onLogin, onRegister }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [loading, setLoading]       = useState(false)
  const [focused, setFocused]       = useState(null)
  const [cursor, setCursor]     = useState({ x: 0, y: 0, visible: false })
  const rightRef                 = useRef(null)

  const handleMouseMove = useCallback((e) => {
    const rect = rightRef.current?.getBoundingClientRect()
    if (!rect) return
    setCursor({ x: e.clientX - rect.left, y: e.clientY - rect.top, visible: true })
  }, [])

  const handleMouseLeave = useCallback(() => {
    setCursor(c => ({ ...c, visible: false }))
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { user, token } = await api.login(username, password)
      onLogin(user, token, rememberMe)
    } catch (err) {
      setError(err.message || 'Invalid username or password')
    } finally {
      setLoading(false)
    }
  }

  const ic = (field) => focused === field ? ACCENT_STRONG : 'rgba(255,255,255,0.2)'

  const iField = (field) => ({
    width: '100%',
    padding: '12px 16px 12px 44px',
    border: `1.5px solid ${focused === field ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.07)'}`,
    borderRadius: '9px',
    fontSize: '14px',
    background: focused === field ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.025)',
    color: 'rgba(255,255,255,0.85)',
    outline: 'none',
    transition: 'all 0.2s',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  })

  const iconStyle = {
    position: 'absolute',
    left: '14px',
    top: '50%',
    transform: 'translateY(-50%)',
    pointerEvents: 'none',
    transition: 'stroke 0.2s',
  }

  const lStyle = {
    display: 'block',
    fontSize: '12px',
    fontWeight: 500,
    color: 'rgba(255,255,255,0.35)',
    marginBottom: '7px',
    letterSpacing: '0.01em',
  }

  const Spinner = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      style={{ animation: 'spin-loader 0.65s linear infinite', transformOrigin: 'center', flexShrink: 0 }}>
      <circle cx="12" cy="12" r="9" stroke="rgba(0,0,0,0.2)" strokeWidth="2.5"/>
      <path d="M12 3a9 9 0 0 1 9 9" stroke="rgba(0,0,0,0.6)" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  )

  return (
    <div style={{
      position: 'fixed', inset: 0, display: 'flex',
      fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
    }}>

      {/* ── LEFT PANEL ── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center',
        padding: '48px 44px',
        background: '#0a0a0f',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        overflowY: 'auto',
      }}>
        <div style={{ width: '100%', maxWidth: '360px' }}>

          {/* Logo */}
          <div style={{ marginBottom: '36px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px', height: '36px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '9px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <span style={{ fontSize: '15px', fontWeight: 600, color: 'rgba(255,255,255,0.8)', letterSpacing: '-0.01em' }}>
                Dispo Chat
              </span>
            </div>
          </div>

          {/* Heading */}
          <div style={{ marginBottom: '28px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#fff', letterSpacing: '-0.03em', marginBottom: '8px', lineHeight: 1.2 }}>
              Welcome back
            </h1>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', lineHeight: 1.55 }}>
              Enter your credentials to access the dispatch platform
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '14px' }}>
              <label style={lStyle}>Username</label>
              <div style={{ position: 'relative' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={ic('un')} strokeWidth="2" strokeLinecap="round" style={iconStyle}>
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                <input
                  type="text"
                  value={username}
                  onChange={e => { setUsername(e.target.value); setError('') }}
                  onFocus={() => setFocused('un')}
                  onBlur={() => setFocused(null)}
                  placeholder="email@company.com"
                  autoFocus
                  required
                  style={iField('un')}
                />
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={lStyle}>Password</label>
              <div style={{ position: 'relative' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={ic('pw')} strokeWidth="2" strokeLinecap="round" style={iconStyle}>
                  <rect x="3" y="11" width="18" height="11" rx="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <input
                  type="password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError('') }}
                  onFocus={() => setFocused('pw')}
                  onBlur={() => setFocused(null)}
                  placeholder="••••••••"
                  required
                  style={iField('pw')}
                />
              </div>
            </div>

            {/* Remember me */}
            <div
              onClick={() => setRememberMe(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                marginBottom: '20px', cursor: 'pointer', userSelect: 'none',
              }}
            >
              <div style={{
                width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                border: `1.5px solid ${rememberMe ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)'}`,
                background: rememberMe ? 'rgba(255,255,255,0.15)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.18s ease',
              }}>
                {rememberMe && (
                  <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                    <polyline points="1 3.5 3.5 6 8 1" stroke="rgba(255,255,255,0.8)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', lineHeight: 1 }}>
                Remember me
              </span>
            </div>

            {error && (
              <div style={{
                background: 'rgba(239,68,68,0.07)',
                border: '1px solid rgba(239,68,68,0.2)',
                color: 'rgba(239,68,68,0.8)',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '13px',
                background: loading ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.88)',
                border: 'none',
                borderRadius: '9px',
                fontSize: '14px',
                fontWeight: 600,
                color: '#0a0a0f',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#ffffff' }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.background = 'rgba(255,255,255,0.88)' }}
            >
              {loading ? <><Spinner /> Signing in...</> : 'Sign in →'}
            </button>
          </form>

          {/* Register link */}
          <div style={{ marginTop: '22px', textAlign: 'center' }}>
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.2)' }}>Don't have an account? </span>
            <button
              onClick={onRegister}
              style={{
                background: 'none', border: 'none', padding: 0,
                fontSize: '13px', color: 'rgba(255,255,255,0.5)',
                cursor: 'pointer', fontFamily: 'inherit',
                textDecoration: 'underline', textUnderlineOffset: '3px',
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.8)'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
            >
              Create account
            </button>
          </div>

        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div
        ref={rightRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          flex: 1, position: 'relative',
          background: '#0d0d14',
          overflow: 'hidden',
          cursor: 'none',
        }}
      >
        {/* Dot grid */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          pointerEvents: 'none',
        }} />

        {/* Static glow top-right */}
        <div style={{
          position: 'absolute', top: '-80px', right: '-60px',
          width: '520px', height: '520px',
          background: 'radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />

        {/* Static glow bottom-left */}
        <div style={{
          position: 'absolute', bottom: '-80px', left: '10%',
          width: '340px', height: '340px',
          background: 'radial-gradient(circle, rgba(255,255,255,0.025) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />

        {/* Cursor glow */}
        <div style={{
          position: 'absolute',
          left: cursor.x, top: cursor.y,
          width: '500px', height: '500px',
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(circle, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 35%, transparent 70%)',
          filter: 'blur(40px)',
          pointerEvents: 'none',
          opacity: cursor.visible ? 1 : 0,
          transition: 'opacity 0.3s ease',
          borderRadius: '50%',
        }} />
      </div>
    </div>
  )
}
