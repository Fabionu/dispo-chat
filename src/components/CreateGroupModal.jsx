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
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6 shadow-2xl"
        style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border-md)' }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-semibold text-white/90">Create a group</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white/70 transition">
            <IconX size={15} stroke={2.2} />
          </button>
        </div>

        <form onSubmit={handleCreate}>
          <div style={{ marginBottom: 12 }}>
            <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-2">
              Group name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); setError('') }}
              placeholder="e.g. Fast Transport SRL"
              autoFocus
              className="w-full rounded-xl px-4 py-2.5 text-sm text-white/90 placeholder-white/25 outline-none transition"
              style={{ background: 'var(--c-surface2)', border: '1.5px solid var(--c-border-md)', boxSizing: 'border-box' }}
              onFocus={e => e.target.style.borderColor = 'var(--c-accent)'}
              onBlur={e => e.target.style.borderColor  = 'var(--c-border-md)'}
            />
          </div>

          {error && <p className="text-xs text-red-400/70 mb-3">{error}</p>}

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white/90 transition hover:opacity-85 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'var(--c-accent)' }}
          >
            {loading ? 'Creating…' : 'Create group →'}
          </button>
        </form>
      </div>
    </div>
  )
}
