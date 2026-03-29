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
      <div className="relative z-10 w-full max-w-sm bg-[#111118] border border-white/[0.05] rounded-2xl overflow-hidden shadow-2xl">

        <div className="px-6 py-5 border-b border-white/[0.05] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white/95">Group settings</h2>
          <button onClick={onClose} className="text-white/20 hover:text-white/60 transition">
            <IconX size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">

          {isAdmin && (
            <>
              <div>
                <label className="block text-[11px] font-medium text-white/30 uppercase tracking-wider mb-1.5">
                  Group name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => { setName(e.target.value); setError('') }}
                  className="w-full bg-white/[0.04] border border-white/[0.07] rounded-xl px-4 py-2.5 text-sm text-white/90 placeholder-white/20 focus:outline-none focus:border-white/[0.18] focus:bg-white/[0.06] transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-white/30 uppercase tracking-wider mb-1.5">
                  Description{' '}
                  <span className="text-white/15 normal-case tracking-normal font-normal">— optional</span>
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Short note about this group..."
                  className="w-full bg-white/[0.04] border border-white/[0.07] rounded-xl px-4 py-2.5 text-sm text-white/90 placeholder-white/20 focus:outline-none focus:border-white/[0.18] focus:bg-white/[0.06] transition"
                />
              </div>

              {error && <p className="text-xs text-red-400/70">{error}</p>}

              <button
                onClick={handleSave}
                disabled={saving || !name.trim()}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: saving || !name.trim() ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.88)',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#0a0a0f',
                  cursor: saving || !name.trim() ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  fontFamily: 'inherit',
                }}
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>

              <div className="border-t border-white/[0.04]" />
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
