import { useState } from 'react'
import { api } from '../services/api.js'
import { IconCopy, IconCheck } from './Icons.jsx'

export default function OnboardingScreen({ user, onGroupCreated }) {
  const [name, setName]       = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [copied, setCopied]   = useState(false)

  const copyCode = () => {
    navigator.clipboard.writeText(user.unique_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError('')
    try {
      const { group } = await api.createGroup(name.trim())
      onGroupCreated({ ...group, role: 'dispatcher' })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--c-bg)' }}>
      <div className="w-full max-w-[380px]">

        {/* Title */}
        <div style={{ marginBottom: 36 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: '-0.03em', marginBottom: 8, lineHeight: 1.2 }}>
            Welcome, {user.first_name}
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.28)', lineHeight: 1.6 }}>
            Create a group to get started as a dispatcher, or share your unique code with a dispatcher to be added.
          </p>
        </div>

        {/* Unique code block */}
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Your unique code
          </p>
          <button
            onClick={copyCode}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 18px',
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 12,
              cursor: 'pointer',
              transition: 'all 0.15s',
              boxSizing: 'border-box',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.025)'; e.currentTarget.style.border = '1px solid rgba(255,255,255,0.07)' }}
          >
            <span style={{ fontFamily: 'monospace', fontSize: 22, fontWeight: 600, color: 'rgba(255,255,255,0.75)', letterSpacing: '0.25em' }}>
              {user.unique_code}
            </span>
            <span style={{ color: copied ? 'rgba(52,211,153,0.7)' : 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center' }}>
              {copied ? <IconCheck size={15} color="rgba(52,211,153,0.7)" /> : <IconCopy size={15} />}
            </span>
          </button>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.15)', marginTop: 8, lineHeight: 1.55 }}>
            {copied ? 'Copied to clipboard' : 'Click to copy — share this with a dispatcher to be added to their group'}
          </p>
        </div>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.05)' }} />
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.18)' }}>or create a group</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.05)' }} />
        </div>

        {/* Create group form */}
        <form onSubmit={handleCreate}>
          <div style={{ marginBottom: 12 }}>
            <label style={{
              display: 'block',
              fontSize: 12,
              fontWeight: 500,
              color: 'rgba(255,255,255,0.3)',
              marginBottom: 7,
              letterSpacing: '0.01em',
            }}>
              Group name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); setError('') }}
              placeholder="e.g. Fast Transport SRL"
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1.5px solid rgba(255,255,255,0.07)',
                borderRadius: 9,
                fontSize: 14,
                background: 'rgba(255,255,255,0.025)',
                color: 'rgba(255,255,255,0.85)',
                outline: 'none',
                transition: 'all 0.2s',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
              onFocus={e => { e.target.style.border = '1.5px solid rgba(255,255,255,0.18)'; e.target.style.background = 'rgba(255,255,255,0.04)' }}
              onBlur={e => { e.target.style.border = '1.5px solid rgba(255,255,255,0.07)'; e.target.style.background = 'rgba(255,255,255,0.025)' }}
            />
          </div>

          {error && <p className="text-xs text-red-400/70 mb-3 pl-0.5">{error}</p>}

          <button
            type="submit"
            disabled={loading || !name.trim()}
            style={{
              width: '100%',
              padding: 13,
              background: loading || !name.trim() ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.88)',
              border: 'none',
              borderRadius: 9,
              fontSize: 14,
              fontWeight: 600,
              color: '#0a0a0f',
              cursor: loading || !name.trim() ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              fontFamily: 'inherit',
            }}
            onMouseEnter={e => { if (!loading && name.trim()) e.currentTarget.style.background = '#ffffff' }}
            onMouseLeave={e => { if (!loading && name.trim()) e.currentTarget.style.background = 'rgba(255,255,255,0.88)' }}
          >
            {loading ? 'Creating...' : 'Create group →'}
          </button>
        </form>

      </div>
    </div>
  )
}
