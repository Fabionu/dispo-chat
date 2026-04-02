import { useState, useEffect, useRef } from 'react'
import { IconX, IconUserPlus, IconSearch } from './Icons.jsx'
import { api } from '../services/api.js'
import { STATUSES } from '../contexts/SettingsContext.jsx'

const ROLES = ['driver', 'dispatcher', 'admin']
const ROLE_DESC = {
  driver:     'Can send messages',
  dispatcher: 'Can manage routes',
  admin:      'Full control',
}

export default function AddMemberModal({ groupId, currentMembers = [], onClose, onAdded }) {
  const [tab, setTab]             = useState('contacts')   // 'contacts' | 'code'
  const [contacts, setContacts]   = useState([])
  const [loadingC, setLoadingC]   = useState(true)
  const [search, setSearch]       = useState('')
  const [selected, setSelected]   = useState(null)        // contact object
  const [role, setRole]           = useState('driver')
  const [code, setCode]           = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [success, setSuccess]     = useState(null)
  const searchRef = useRef(null)

  // Load DM contacts
  useEffect(() => {
    api.getDmConversations()
      .then(({ conversations }) => setContacts(conversations))
      .catch(() => {})
      .finally(() => setLoadingC(false))
  }, [])

  useEffect(() => {
    if (tab === 'contacts') setTimeout(() => searchRef.current?.focus(), 50)
  }, [tab])

  const memberIds = new Set(currentMembers.map(m => m.id))

  const filtered = contacts.filter(c => {
    const name = `${c.first_name} ${c.last_name} ${c.username}`.toLowerCase()
    return search === '' || name.includes(search.toLowerCase())
  })

  const handleSelect = (c) => {
    if (memberIds.has(c.user_id)) return
    setSelected(c)
    setError('')
    setSuccess(null)
  }

  const handleAdd = async () => {
    setError('')
    setSuccess(null)
    setLoading(true)
    try {
      const codeToUse = tab === 'contacts' ? selected.unique_code : code.trim().toUpperCase()
      const { user } = await api.addMember(groupId, codeToUse, role)
      setSuccess(`${user.first_name} ${user.last_name} added as ${role}.`)
      setSelected(null)
      setCode('')
      setSearch('')
      onAdded?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const canAdd = tab === 'contacts' ? !!selected : code.length === 6

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl flex flex-col" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border-md)', maxHeight: '80vh' }}>

        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between flex-shrink-0" style={{ borderBottom: '1px solid var(--c-border)' }}>
          <h2 className="text-sm font-semibold text-white/95">Add member</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white/70 transition">
            <IconX size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-5 pt-4 gap-1 flex-shrink-0">
          <button
            onClick={() => { setTab('contacts'); setError(''); setSuccess(null) }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition
              ${tab === 'contacts' ? 'bg-white/[0.10] text-white/90' : 'text-white/40 hover:text-white/65 hover:bg-white/[0.05]'}`}
          >
            From contacts
          </button>
          <button
            onClick={() => { setTab('code'); setError(''); setSuccess(null) }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition
              ${tab === 'code' ? 'bg-white/[0.10] text-white/90' : 'text-white/40 hover:text-white/65 hover:bg-white/[0.05]'}`}
          >
            By code
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0 px-5 pb-5 pt-3">

          {tab === 'contacts' ? (
            <>
              {/* Search */}
              <div className="relative mb-3 flex-shrink-0">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none">
                  <IconSearch size={12} />
                </span>
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search contacts..."
                  className="w-full rounded-xl pl-8 pr-3 py-2 text-sm text-white/80 placeholder-white/30 outline-none transition"
                  style={{ background: 'var(--c-surface2)', border: '1px solid var(--c-border-md)' }}
                />
              </div>

              {/* Contact list */}
              <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-0.5">
                {loadingC ? (
                  <p className="text-xs text-white/30 py-4 text-center">Loading contacts...</p>
                ) : filtered.length === 0 ? (
                  <p className="text-xs text-white/30 py-4 text-center">
                    {contacts.length === 0 ? 'No contacts yet. Start a DM first.' : 'No results.'}
                  </p>
                ) : (
                  filtered.map(c => {
                    const isAlready = memberIds.has(c.user_id)
                    const isActive  = selected?.user_id === c.user_id
                    const initials  = `${c.first_name?.[0] ?? ''}${c.last_name?.[0] ?? ''}`.toUpperCase()
                    const status    = STATUSES.find(s => s.value === (c.status ?? 'available'))
                    return (
                      <button
                        key={c.conv_id}
                        onClick={() => handleSelect(c)}
                        disabled={isAlready}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition text-left
                          ${isAlready ? 'opacity-40 cursor-not-allowed' : isActive ? 'bg-[var(--c-accent-muted)] border border-[var(--c-accent)]/25' : 'hover:bg-white/[0.06] border border-transparent'}`}
                      >
                        {/* Avatar */}
                        <div className="relative flex-shrink-0">
                          <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-[11px] font-medium text-white/50" style={{ background: 'var(--c-surface3)' }}>
                            {c.avatar_url
                              ? <img src={c.avatar_url} alt="" className="w-full h-full object-cover" />
                              : initials
                            }
                          </div>
                          <span
                            className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2"
                            style={{ background: status?.color ?? '#6b7280', borderColor: 'var(--c-surface)' }}
                          />
                        </div>

                        {/* Name */}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-white/90 truncate">{c.first_name} {c.last_name}</div>
                          <div className="text-xs text-white/40 truncate">@{c.username}</div>
                        </div>

                        {/* Badge */}
                        {isAlready && (
                          <span className="text-[10px] text-white/35 flex-shrink-0">Already member</span>
                        )}
                        {isActive && !isAlready && (
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: 'var(--c-accent)' }} />
                        )}
                      </button>
                    )
                  })
                )}
              </div>
            </>
          ) : (
            /* Code tab */
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-2">
                  Unique code
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={e => { setCode(e.target.value.toUpperCase()); setError(''); setSuccess(null) }}
                  placeholder="e.g. X7KM2Q"
                  maxLength={6}
                  autoFocus
                  className="w-full rounded-xl px-4 py-3 text-center text-lg font-mono tracking-[0.18em] text-white/85 placeholder-white/20 outline-none transition"
                  style={{ background: 'var(--c-surface2)', border: '1px solid var(--c-border-md)' }}
                  onFocus={e => e.target.style.borderColor = 'rgba(255,255,255,0.18)'}
                  onBlur={e => e.target.style.borderColor = 'var(--c-border-md)'}
                />
                <p className="text-[11px] text-white/30 mt-1.5">Ask the user for their 6-character unique code.</p>
              </div>
            </div>
          )}

          {/* Role selector — always visible */}
          <div className="mt-4 flex-shrink-0">
            <label className="block text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-2">Role</label>
            <div className="flex gap-2">
              {ROLES.map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium transition flex flex-col items-center gap-0.5
                    ${role === r
                      ? 'bg-white/[0.10] text-white/90'
                      : 'text-white/40 hover:text-white/65 hover:bg-white/[0.05]'
                    }`}
                >
                  <span className="capitalize">{r}</span>
                  <span className={`text-[9px] ${role === r ? 'text-white/45' : 'text-white/20'}`}>{ROLE_DESC[r]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Feedback */}
          {error   && <p className="text-xs text-red-400/80 mt-3 flex-shrink-0">{error}</p>}
          {success && <p className="text-xs text-emerald-400/80 mt-3 flex-shrink-0">{success}</p>}

          {/* Actions */}
          <div className="flex gap-2 mt-4 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm text-white/40 hover:text-white/70 hover:bg-white/[0.05] transition"
            >
              Done
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={loading || !canAdd}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2"
              style={{
                background: loading || !canAdd ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.90)',
                color: loading || !canAdd ? 'rgba(255,255,255,0.45)' : '#0a0a0f',
                cursor: loading || !canAdd ? 'not-allowed' : 'pointer',
              }}
            >
              <IconUserPlus size={13} />
              {loading ? 'Adding...' : 'Add'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
