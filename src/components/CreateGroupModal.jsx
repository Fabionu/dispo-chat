import { useState } from 'react'
import { api } from '../services/api.js'
import { IconX } from './Icons.jsx'

export default function CreateGroupModal({ onCreated, onClose }) {
  const [name, setName]       = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError('')
    try {
      const { group } = await api.createGroup(name.trim())
      onCreated({ ...group, role: 'dispatcher' })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-sm mx-4 bg-[#111118] border border-white/[0.08] rounded-2xl p-6 shadow-2xl">

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-semibold text-white/95">Create a group</h2>
          <button onClick={onClose} className="text-white/20 hover:text-white/50 transition">
            <IconX size={15} />
          </button>
        </div>

        <form onSubmit={handleCreate}>
          <div style={{ marginBottom: 12 }}>
            <label style={{
              display: 'block', fontSize: 12, fontWeight: 500,
              color: 'rgba(255,255,255,0.3)', marginBottom: 7, letterSpacing: '0.01em',
            }}>
              Group name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); setError('') }}
              placeholder="e.g. Fast Transport SRL"
              autoFocus
              style={{
                width: '100%', padding: '11px 14px',
                border: '1.5px solid rgba(255,255,255,0.07)', borderRadius: 9,
                fontSize: 13, background: 'rgba(255,255,255,0.025)',
                color: 'rgba(255,255,255,0.85)', outline: 'none',
                transition: 'all 0.2s', fontFamily: 'inherit', boxSizing: 'border-box',
              }}
              onFocus={e => { e.target.style.border = '1.5px solid rgba(255,255,255,0.18)'; e.target.style.background = 'rgba(255,255,255,0.04)' }}
              onBlur={e => { e.target.style.border = '1.5px solid rgba(255,255,255,0.07)'; e.target.style.background = 'rgba(255,255,255,0.025)' }}
            />
          </div>

          {error && <p className="text-xs text-red-400/70 mb-3">{error}</p>}

          <button
            type="submit"
            disabled={loading || !name.trim()}
            style={{
              width: '100%', padding: '11px',
              background: loading || !name.trim() ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.88)',
              border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 600,
              color: '#0a0a0f', cursor: loading || !name.trim() ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s', fontFamily: 'inherit',
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
