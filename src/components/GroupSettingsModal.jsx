import { useState } from 'react'
import { IconX, IconTrash } from './Icons.jsx'
import { api } from '../services/api.js'

export default function GroupSettingsModal({ group, isAdmin, onClose, onUpdated, onRemoved }) {
  const [name, setName]               = useState(group.name)
  const [description, setDescription] = useState(group.description || '')
  const [saving, setSaving]           = useState(false)
  const [leaving, setLeaving]         = useState(false)
  const [deleting, setDeleting]       = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError]             = useState('')

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    setError('')
    try {
      const { group: updated } = await api.updateGroup(group.id, name.trim(), description.trim())
      onUpdated(updated)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleLeave = async () => {
    setLeaving(true)
    setError('')
    try {
      await api.leaveGroup(group.id)
      onRemoved(group.id)
    } catch (err) {
      setError(err.message)
      setLeaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setDeleting(true)
    setError('')
    try {
      await api.deleteGroup(group.id)
      onRemoved(group.id)
    } catch (err) {
      setError(err.message)
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative z-10 w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border-md)' }}
      >
        <div
          className="px-6 py-5 flex items-center justify-between"
          style={{ borderBottom: '1px solid var(--c-border)' }}
        >
          <h2 className="text-sm font-semibold text-white/90">Group settings</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white/70 transition">
            <IconX size={15} stroke={2.2} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">

          {isAdmin && (
            <>
              <div>
                <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-1.5">
                  Group name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => { setName(e.target.value); setError('') }}
                  className="w-full rounded-xl px-4 py-2.5 text-sm text-white/90 placeholder-white/20 outline-none transition"
                  style={{ background: 'var(--c-surface2)', border: '1.5px solid var(--c-border-md)' }}
                  onFocus={e => e.target.style.borderColor = 'var(--c-accent)'}
                  onBlur={e => e.target.style.borderColor  = 'var(--c-border-md)'}
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-1.5">
                  Description{' '}
                  <span className="text-white/15 normal-case tracking-normal font-normal">— optional</span>
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Short note about this group…"
                  className="w-full rounded-xl px-4 py-2.5 text-sm text-white/90 placeholder-white/20 outline-none transition"
                  style={{ background: 'var(--c-surface2)', border: '1.5px solid var(--c-border-md)' }}
                  onFocus={e => e.target.style.borderColor = 'var(--c-accent)'}
                  onBlur={e => e.target.style.borderColor  = 'var(--c-border-md)'}
                />
              </div>

              {error && <p className="text-xs text-red-400/70">{error}</p>}

              <button
                onClick={handleSave}
                disabled={saving || !name.trim()}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white/90 transition hover:opacity-85 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: 'var(--c-accent)' }}
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>

              <div style={{ borderTop: '1px solid var(--c-border)' }} />
            </>
          )}

          {/* Danger zone */}
          <div className="space-y-1">
            {!isAdmin && error && <p className="text-xs text-red-400/70 mb-2">{error}</p>}
            <button
              onClick={handleLeave}
              disabled={leaving}
              className="w-full text-left px-3 py-2.5 rounded-xl text-sm text-red-400/60 hover:text-red-400 hover:bg-red-400/[0.05] transition disabled:opacity-40"
            >
              {leaving ? 'Leaving…' : 'Leave group'}
            </button>
            {isAdmin && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="w-full text-left px-3 py-2.5 rounded-xl text-sm text-red-400/60 hover:text-red-400 hover:bg-red-400/[0.05] transition disabled:opacity-40 flex items-center gap-2"
              >
                <IconTrash size={13} />
                {deleting ? 'Deleting…' : confirmDelete ? 'Click again to confirm' : 'Delete group'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
