import { useState, useRef } from 'react'
import { IconX } from './Icons.jsx'
import { api } from '../services/api.js'

export default function NewDmModal({ onClose, onStarted }) {
  const [code, setCode]       = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { conversation_id, user } = await api.startDmByCode(code.trim().toUpperCase())
      onStarted({ convId: conversation_id, otherUser: user })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-[#111118] border border-white/[0.05] rounded-2xl overflow-hidden shadow-2xl">

        <div className="px-6 py-5 border-b border-white/[0.05] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white/95">New message</h2>
          <button onClick={onClose} className="text-white/20 hover:text-white/60 transition">
            <IconX size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label style={{
              display: 'block', fontSize: '11px', fontWeight: 500,
              color: 'rgba(255,255,255,0.3)', marginBottom: '6px',
              letterSpacing: '0.02em', textTransform: 'uppercase'
            }}>
              Unique code
            </label>
            <input
              type="text"
              value={code}
              onChange={e => { setCode(e.target.value.toUpperCase()); setError('') }}
              placeholder="e.g. X7KM2Q"
              maxLength={6}
              autoFocus
              style={{
                width: '100%', padding: '11px 14px',
                border: '1.5px solid rgba(255,255,255,0.07)',
                borderRadius: '9px', fontSize: '16px',
                fontFamily: 'monospace', letterSpacing: '0.15em',
                background: 'rgba(255,255,255,0.025)',
                color: 'rgba(255,255,255,0.85)', outline: 'none',
                transition: 'all 0.2s', boxSizing: 'border-box',
                textTransform: 'uppercase',
              }}
              onFocus={e => { e.target.style.border = '1.5px solid rgba(255,255,255,0.18)'; e.target.style.background = 'rgba(255,255,255,0.04)' }}
              onBlur={e => { e.target.style.border = '1.5px solid rgba(255,255,255,0.07)'; e.target.style.background = 'rgba(255,255,255,0.025)' }}
            />
            <p className="text-[11px] text-white/20 mt-1.5">Ask the person you want to chat with for their 6-character unique code.</p>
          </div>

          {error && <p className="text-xs text-red-400/70">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || code.length !== 6}
              style={{
                flex: 1, padding: '10px',
                background: loading || code.length !== 6 ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.88)',
                border: 'none', borderRadius: '12px',
                fontSize: '13px', fontWeight: 600, color: '#0a0a0f',
                cursor: loading || code.length !== 6 ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s', fontFamily: 'inherit',
              }}
            >
              {loading ? 'Searching...' : 'Start conversation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
