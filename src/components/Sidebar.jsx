import { useState, useEffect, useCallback, useRef } from 'react'
import { IconSearch, IconPlus, IconMoreVertical, IconBellOff, IconBell, IconCheckAll, IconSettings } from './Icons.jsx'
import { api } from '../services/api.js'
import { getSocket } from '../services/socket.js'
import ProfilePanel from './ProfilePanel.jsx'
import CreateGroupModal from './CreateGroupModal.jsx'
import NewDmModal from './NewDmModal.jsx'
import { SettingsPanel } from './SettingsModal.jsx'
import { StatusDot, STATUSES, useSettings } from '../contexts/SettingsContext.jsx'

// ─── Compact icons ─────────────────────────────────────────────
function IconGroup({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  )
}

function IconPerson({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  )
}

function UnreadBadge({ count }) {
  if (!count) return null
  return (
    <span className="flex-shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-white/[0.18] text-[10px] font-semibold text-white/90 flex items-center justify-center">
      {count > 99 ? '99+' : count}
    </span>
  )
}

// ─── Pin icon ──────────────────────────────────────────────────
function IconPin({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="17" x2="12" y2="22"/>
      <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/>
    </svg>
  )
}

function ItemOptions({ convKey, unread, muted, pinned, onToggleMute, onMarkRead, onMarkUnread, onTogglePin, onClose }) {
  return (
    <div className="absolute right-0 top-full mt-1 z-[70] border rounded-xl overflow-hidden shadow-xl min-w-[180px]" style={{ background: 'var(--c-surface3)', borderColor: 'var(--c-border-md)' }}>
      <button
        onClick={() => { onTogglePin(convKey); onClose() }}
        className="w-full text-left px-4 py-2.5 text-xs text-white/50 hover:text-white/80 hover:bg-white/[0.09] transition flex items-center gap-2.5"
      >
        <IconPin size={12} /> {pinned ? 'Unpin' : 'Pin conversation'}
      </button>
      {unread > 0 ? (
        <button
          onClick={() => { onMarkRead?.(convKey); onClose() }}
          className="w-full text-left px-4 py-2.5 text-xs text-white/50 hover:text-white/80 hover:bg-white/[0.09] transition flex items-center gap-2.5"
        >
          <IconCheckAll size={12} /> Mark as read
        </button>
      ) : (
        <button
          onClick={() => { onMarkUnread?.(convKey); onClose() }}
          className="w-full text-left px-4 py-2.5 text-xs text-white/50 hover:text-white/80 hover:bg-white/[0.09] transition flex items-center gap-2.5"
        >
          <IconCheckAll size={12} /> Mark as unread
        </button>
      )}
      <button
        onClick={() => { onToggleMute(convKey); onClose() }}
        className="w-full text-left px-4 py-2.5 text-xs text-white/50 hover:text-white/80 hover:bg-white/[0.09] transition flex items-center gap-2.5"
      >
        {muted
          ? <><IconBell size={12} /> Unmute notifications</>
          : <><IconBellOff size={12} /> Mute notifications</>
        }
      </button>
    </div>
  )
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-[3px]">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="w-1 h-1 rounded-full bg-current opacity-60"
          style={{ animation: `typing-dot 1.2s ease-in-out ${i * 0.2}s infinite` }}
        />
      ))}
    </span>
  )
}

function GroupItem({ group, active, unread, muted, pinned, compact, typingLabel, optionsOpen, onOpenOptions, onCloseOptions, onToggleMute, onMarkRead, onMarkUnread, onTogglePin, onClick }) {
  const initials = group.name.slice(0, 2).toUpperCase()
  const time = group.last_message_at
    ? new Date(group.last_message_at).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })
    : ''
  const convKey = `group:${group.id}`

  return (
    <div className={`relative group/item ${optionsOpen ? 'z-10' : ''}`}>
      <button
        onClick={onClick}
        className={`w-full text-left px-3 rounded-xl transition-all flex items-center
          ${compact ? 'gap-2' : 'gap-3'}
          ${active ? 'bg-[var(--c-accent-muted)] border border-[var(--c-accent)]/25' : 'hover:bg-white/[0.09] border border-transparent'}`}
        style={{ paddingTop: 'var(--c-row-py)', paddingBottom: 'var(--c-row-py)' }}
      >
        {compact ? (
          /* Compact: small icon only */
          <span className={`flex-shrink-0 ${active ? 'text-[var(--c-accent)]' : 'text-white/50'}`}>
            <IconGroup size={13} />
          </span>
        ) : (
          /* Normal/Comfortable: initials square */
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-semibold flex-shrink-0 transition-all
            ${active ? 'bg-[var(--c-accent)]/20 text-[var(--c-accent)]/90' : 'bg-white/[0.07] text-white/55'}`}>
            {initials}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <span className={`truncate block font-medium
            ${compact ? 'text-xs' : 'text-sm'}
            ${unread ? 'text-white' : 'text-white/95'}`}>
            {group.name}
          </span>
          {!compact && (
            <div className={`text-[11px] truncate mt-0.5 flex items-center gap-1.5
              ${typingLabel ? 'text-[var(--c-accent)]' : unread ? 'text-white/65' : 'text-white/45'}`}>
              {typingLabel
                ? <><TypingDots /><span className="truncate">{typingLabel}</span></>
                : (group.last_message || 'No messages yet')
              }
            </div>
          )}
        </div>

        {/* Right column */}
        {compact ? (
          <div className="flex items-center gap-1 flex-shrink-0 group-hover/item:opacity-0 transition-opacity duration-150">
            {pinned && <span className="text-white/40"><IconPin size={9} /></span>}
            {unread > 0 && <UnreadBadge count={unread} />}
          </div>
        ) : (
          <div className="flex flex-col items-end gap-1 flex-shrink-0 group-hover/item:opacity-0 transition-opacity duration-150">
            {pinned && <span className="text-white/40"><IconPin size={9} /></span>}
            {!typingLabel && time && <span className="text-[10px] text-white/40 whitespace-nowrap">{time}</span>}
            <UnreadBadge count={unread} />
          </div>
        )}
      </button>

      {/* Options button — fades in on hover */}
      <div
        className="absolute right-2.5 top-1/2 -translate-y-1/2"
        onMouseDown={e => e.stopPropagation()}
      >
        <button
          onClick={(e) => { e.stopPropagation(); optionsOpen ? onCloseOptions() : onOpenOptions(convKey) }}
          className={`w-6 h-6 flex items-center justify-center rounded-md transition-all
            text-white/30 hover:text-white/70 hover:bg-white/[0.12]
            ${optionsOpen ? 'opacity-100' : 'opacity-0 group-hover/item:opacity-100'}`}
        >
          <IconMoreVertical size={13} />
        </button>
        {optionsOpen && (
          <ItemOptions
            convKey={convKey}
            muted={muted}
            pinned={pinned}
            onToggleMute={onToggleMute}
            onTogglePin={onTogglePin}
            unread={unread}
            onMarkRead={onMarkRead}
            onMarkUnread={onMarkUnread}
            onClose={onCloseOptions}
          />
        )}
      </div>
    </div>
  )
}

function DmItem({ conv, active, unread, muted, pinned, compact, userStatus, typingLabel, optionsOpen, onOpenOptions, onCloseOptions, onToggleMute, onMarkRead, onMarkUnread, onTogglePin, onClick }) {
  const initials = `${conv.first_name?.[0] ?? ''}${conv.last_name?.[0] ?? ''}`.toUpperCase()
  const time = conv.last_message_at
    ? new Date(conv.last_message_at).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })
    : ''
  const convKey = `dm:${conv.conv_id}`
  const status  = userStatus ?? conv.status ?? 'available'
  const statusColor = STATUSES.find(s => s.value === status)?.color ?? '#6b7280'

  return (
    <div className={`relative group/item ${optionsOpen ? 'z-10' : ''}`}>
      <button
        onClick={onClick}
        className={`w-full text-left px-3 rounded-xl transition-all flex items-center
          ${compact ? 'gap-2' : 'gap-3'}
          ${active ? 'bg-[var(--c-accent-muted)] border border-[var(--c-accent)]/25' : 'hover:bg-white/[0.09] border border-transparent'}`}
        style={{ paddingTop: 'var(--c-row-py)', paddingBottom: 'var(--c-row-py)' }}
      >
        {compact ? (
          /* Compact: person icon + status dot */
          <span className="relative flex-shrink-0 flex items-center justify-center">
            <span className={active ? 'text-[var(--c-accent)]' : 'text-white/50'}>
              <IconPerson size={13} />
            </span>
            <span
              className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full"
              style={{ background: statusColor, boxShadow: `0 0 0 1.5px var(--c-sidebar)` }}
            />
          </span>
        ) : (
          /* Normal/Comfortable: avatar + status dot */
          <div className="relative flex-shrink-0">
            <div className="w-9 h-9 rounded-full bg-white/[0.07] flex items-center justify-center text-[11px] font-medium text-white/55 overflow-hidden">
              {conv.avatar_url
                ? <img src={conv.avatar_url} alt="" className="w-full h-full object-cover" />
                : initials
              }
            </div>
            <span
              className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2"
              style={{ background: statusColor, borderColor: 'var(--c-sidebar)' }}
            />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <span className={`truncate block font-medium
            ${compact ? 'text-xs' : 'text-sm'}
            ${unread ? 'text-white' : 'text-white/95'}`}>
            {conv.first_name} {conv.last_name}
          </span>
          {!compact && (
            <div className={`text-xs truncate mt-0.5 flex items-center gap-1.5
              ${typingLabel ? 'text-[var(--c-accent)]' : unread ? 'text-white/65' : 'text-white/50'}`}>
              {typingLabel
                ? <><TypingDots /><span className="truncate">typing...</span></>
                : (conv.last_message || `@${conv.username}`)
              }
            </div>
          )}
        </div>

        {/* Right column */}
        {compact ? (
          <div className="flex items-center gap-1 flex-shrink-0 group-hover/item:opacity-0 transition-opacity duration-150">
            {pinned && <span className="text-white/40"><IconPin size={9} /></span>}
            {unread > 0 && <UnreadBadge count={unread} />}
          </div>
        ) : (
          <div className="flex flex-col items-end gap-1 flex-shrink-0 group-hover/item:opacity-0 transition-opacity duration-150">
            {pinned && <span className="text-white/40"><IconPin size={9} /></span>}
            {!typingLabel && time && <span className="text-[10px] text-white/45 whitespace-nowrap">{time}</span>}
            <UnreadBadge count={unread} />
          </div>
        )}
      </button>

      {/* Options button — fades in on hover */}
      <div
        className="absolute right-2.5 top-1/2 -translate-y-1/2"
        onMouseDown={e => e.stopPropagation()}
      >
        <button
          onClick={(e) => { e.stopPropagation(); optionsOpen ? onCloseOptions() : onOpenOptions(convKey) }}
          className={`w-6 h-6 flex items-center justify-center rounded-md transition-all
            text-white/50 hover:text-white/80 hover:bg-white/[0.12]
            ${optionsOpen ? 'opacity-100' : 'opacity-0 group-hover/item:opacity-100'}`}
        >
          <IconMoreVertical size={13} />
        </button>
        {optionsOpen && (
          <ItemOptions
            convKey={convKey}
            muted={muted}
            pinned={pinned}
            onToggleMute={onToggleMute}
            onTogglePin={onTogglePin}
            unread={unread}
            onMarkRead={onMarkRead}
            onMarkUnread={onMarkUnread}
            onClose={onCloseOptions}
          />
        )}
      </div>
    </div>
  )
}

export default function Sidebar({ user, groups, unreads = {}, userStatuses = {}, activeConversation, onSelectConversation, onGroupCreated, onLogout, onMarkAllRead, onMarkRead, onMarkUnread }) {
  const { appearance } = useSettings()
  const compact = appearance?.density === 'compact'
  const [search, setSearch]               = useState('')
  const [dmConvs, setDmConvs]             = useState([])
  const [showProfile, setShowProfile]     = useState(false)
  const [showSettings, setShowSettings]   = useState(false)
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [showHeaderMenu, setShowHeaderMenu]   = useState(false)
  const [optionsFor, setOptionsFor]       = useState(null)
  const [showNewDm, setShowNewDm]         = useState(false)
  const [typingMap, setTypingMap]         = useState({})   // { 'group:5': 'ion', 'dm:2': true }
  const typingTimers                      = useRef({})

  // Închide dropdown-ul la click în afară
  useEffect(() => {
    if (!optionsFor) return
    const handler = () => setOptionsFor(null)
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [optionsFor])

  // Muted conversations — persisted in localStorage
  const [mutedConvs, setMutedConvs] = useState(() => {
    try {
      const saved = localStorage.getItem('dc_muted')
      return new Set(saved ? JSON.parse(saved) : [])
    } catch { return new Set() }
  })

  // Pinned conversations — persisted in localStorage
  const [pinnedConvs, setPinnedConvs] = useState(() => {
    try {
      const saved = localStorage.getItem('dc_pinned')
      return new Set(saved ? JSON.parse(saved) : [])
    } catch { return new Set() }
  })

  const togglePin = (key) => {
    setPinnedConvs(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      localStorage.setItem('dc_pinned', JSON.stringify([...next]))
      return next
    })
  }

  const toggleMute = (key) => {
    setMutedConvs(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      localStorage.setItem('dc_muted', JSON.stringify([...next]))
      return next
    })
  }

  const loadDms = useCallback(async () => {
    try {
      const { conversations } = await api.getDmConversations()
      setDmConvs(conversations)
    } catch {}
  }, [])

  useEffect(() => { loadDms() }, [loadDms])

  // ─── Socket: DM live sidebar updates ───────────────────────────
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const handleMessage = ({ type, message }) => {
      if (type !== 'dm') return
      setDmConvs(prev => {
        const exists = prev.some(c => c.conv_id === message.conv_id)
        if (!exists) { loadDms(); return prev }
        const updated = prev.map(c =>
          c.conv_id === message.conv_id
            ? { ...c, last_message: message.content, last_message_at: message.created_at }
            : c
        )
        return updated.sort((a, b) => {
          if (!a.last_message_at) return 1
          if (!b.last_message_at) return -1
          return new Date(b.last_message_at) - new Date(a.last_message_at)
        })
      })
    }

    // Also handle DM updates from unread:new (messages received while DM room not active)
    const handleUnread = ({ type, message }) => {
      if (type !== 'dm') return
      setDmConvs(prev => {
        const exists = prev.some(c => c.conv_id === message.conv_id)
        if (!exists) { loadDms(); return prev }
        const updated = prev.map(c =>
          c.conv_id === message.conv_id
            ? { ...c, last_message: message.content, last_message_at: message.created_at }
            : c
        )
        return updated.sort((a, b) => {
          if (!a.last_message_at) return 1
          if (!b.last_message_at) return -1
          return new Date(b.last_message_at) - new Date(a.last_message_at)
        })
      })
    }

    socket.on('message:new', handleMessage)
    socket.on('unread:new',  handleUnread)
    return () => {
      socket.off('message:new', handleMessage)
      socket.off('unread:new',  handleUnread)
    }
  }, [loadDms])

  // ─── Socket: typing indicators ─────────────────────────────────
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const handleTypingStart = ({ room, username }) => {
      if (!room) return
      setTypingMap(prev => ({ ...prev, [room]: username }))
      clearTimeout(typingTimers.current[room])
      typingTimers.current[room] = setTimeout(() => {
        setTypingMap(prev => { const n = { ...prev }; delete n[room]; return n })
      }, 4000)
    }

    const handleTypingStop = ({ room }) => {
      if (!room) return
      clearTimeout(typingTimers.current[room])
      setTypingMap(prev => { const n = { ...prev }; delete n[room]; return n })
    }

    socket.on('typing:start', handleTypingStart)
    socket.on('typing:stop',  handleTypingStop)
    return () => {
      socket.off('typing:start', handleTypingStart)
      socket.off('typing:stop',  handleTypingStop)
    }
  }, [])

  const initials = `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase()

  const filteredGroups = groups
    .filter(g => search === '' || g.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const pa = pinnedConvs.has(`group:${a.id}`), pb = pinnedConvs.has(`group:${b.id}`)
      return pa === pb ? 0 : pa ? -1 : 1
    })

  const filteredDms = dmConvs
    .filter(c => search === '' || `${c.first_name} ${c.last_name}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const pa = pinnedConvs.has(`dm:${a.conv_id}`), pb = pinnedConvs.has(`dm:${b.conv_id}`)
      return pa === pb ? 0 : pa ? -1 : 1
    })

  return (
    <div className="w-96 flex-shrink-0 flex flex-col h-full border-r border-white/[0.05] relative" style={{ background: 'var(--c-sidebar)' }}>

      {/* Header */}
      <div className="px-4 pt-5 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 flex items-center justify-center flex-shrink-0 text-white/50">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <span className="text-sm font-semibold text-white/70 tracking-tight">Dispo Chat</span>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowHeaderMenu(v => !v)}
            className="w-6 h-6 flex items-center justify-center rounded-md text-white/55 hover:text-white/80 hover:bg-white/[0.09] transition"
          >
            <IconMoreVertical size={15} />
          </button>
          {showHeaderMenu && (
            <>
              <div className="fixed inset-0 z-[60]" onClick={() => setShowHeaderMenu(false)} />
              <div className="absolute right-0 top-full mt-1 z-[70] border rounded-xl overflow-hidden shadow-xl min-w-[180px]" style={{ background: 'var(--c-surface3)', borderColor: 'var(--c-border-md)' }}>
                <button
                  onClick={() => { setShowCreateGroup(true); setShowHeaderMenu(false) }}
                  className="w-full text-left px-4 py-2.5 text-xs text-white/50 hover:text-white/80 hover:bg-white/[0.09] transition flex items-center gap-2.5"
                >
                  <IconPlus size={12} stroke={2} /> Create group
                </button>
                <button
                  onClick={() => { onMarkAllRead?.(); setShowHeaderMenu(false) }}
                  className="w-full text-left px-4 py-2.5 text-xs text-white/50 hover:text-white/80 hover:bg-white/[0.09] transition flex items-center gap-2.5"
                >
                  <IconCheckAll /> Mark all as read
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="px-4 pb-3">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/35 pointer-events-none">
            <IconSearch size={11} />
          </span>
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white/[0.05] rounded-lg pl-7 pr-3 py-1.5 text-xs text-white/75 placeholder-white/30 outline-none focus:bg-white/[0.08] transition-colors"
          />
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-2">

        {/* Groups section */}
        <div className="mb-1">
          <div className="flex items-center justify-between px-3 mb-1.5">
            <p className="text-[10px] text-white/60 uppercase tracking-widest font-semibold">Groups</p>
            <button
              onClick={() => setShowCreateGroup(true)}
              className="w-5 h-5 flex items-center justify-center rounded text-white/55 hover:text-white/80 hover:bg-white/[0.09] transition"
              title="Create group"
            >
              <IconPlus size={12} stroke={2} />
            </button>
          </div>
          {filteredGroups.length === 0 ? (
            <p className="text-xs text-white/50 px-3 py-2">No groups</p>
          ) : (
            filteredGroups.map(group => {
              const convKey = `group:${group.id}`
              const muted   = mutedConvs.has(convKey)
              return (
                <GroupItem
                  key={group.id}
                  group={group}
                  active={activeConversation?.type === 'group' && activeConversation?.group?.id === group.id}
                  unread={muted ? 0 : (unreads[convKey] || 0)}
                  muted={muted}
                  pinned={pinnedConvs.has(convKey)}
                  compact={compact}
                  typingLabel={typingMap[`group:${group.id}`] || null}
                  optionsOpen={optionsFor === convKey}
                  onOpenOptions={(k) => setOptionsFor(k)}
                  onCloseOptions={() => setOptionsFor(null)}
                  onToggleMute={toggleMute}
                  onTogglePin={togglePin}
                  onMarkRead={onMarkRead}
                  onMarkUnread={onMarkUnread}
                  onClick={() => onSelectConversation({ type: 'group', group })}
                />
              )
            })
          )}
        </div>

        {/* DMs section */}
        {(filteredDms.length > 0 || search === '') && (
          <div className="mt-3">
            <div className="flex items-center justify-between px-3 mb-1.5">
              <p className="text-[10px] text-white/60 uppercase tracking-widest font-semibold">Direct Messages</p>
              <button
                onClick={() => setShowNewDm(true)}
                className="w-5 h-5 flex items-center justify-center rounded text-white/55 hover:text-white/80 hover:bg-white/[0.09] transition"
                title="New message"
              >
                <IconPlus size={12} stroke={2} />
              </button>
            </div>
            {filteredDms.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-5 px-3">
                <svg width="36" height="30" viewBox="0 0 36 30" fill="none" opacity="0.2">
                  {/* Bula din spate */}
                  <rect x="8" y="4" width="22" height="15" rx="4" stroke="white" strokeWidth="1.3"/>
                  <path d="M21 19 L19 23 L17 19" stroke="white" strokeWidth="1.3" strokeLinejoin="round" fill="none"/>
                  {/* Bula din față */}
                  <rect x="2" y="10" width="20" height="14" rx="3.5" fill="#0d0d14" stroke="white" strokeWidth="1.3"/>
                  <path d="M10 24 L8 28 L13 24" stroke="white" strokeWidth="1.3" strokeLinejoin="round" fill="none"/>
                  {/* Linii text */}
                  <line x1="6" y1="15" x2="18" y2="15" stroke="white" strokeWidth="1" strokeLinecap="round" opacity="0.6"/>
                  <line x1="6" y1="19" x2="14" y2="19" stroke="white" strokeWidth="1" strokeLinecap="round" opacity="0.6"/>
                </svg>
                <p className="text-[11px] text-white/40 text-center leading-relaxed">
                  No direct messages yet.<br />Use + to start one.
                </p>
              </div>
            ) : (
              filteredDms.map(conv => {
                const convKey = `dm:${conv.conv_id}`
                const muted   = mutedConvs.has(convKey)
                return (
                  <DmItem
                    key={conv.conv_id}
                    conv={conv}
                    active={activeConversation?.type === 'dm' && activeConversation?.convId === conv.conv_id}
                    unread={muted ? 0 : (unreads[convKey] || 0)}
                    muted={muted}
                    pinned={pinnedConvs.has(convKey)}
                    compact={compact}
                    userStatus={userStatuses[conv.user_id]}
                    typingLabel={typingMap[`dm:${conv.conv_id}`] || null}
                    optionsOpen={optionsFor === convKey}
                    onOpenOptions={(k) => setOptionsFor(k)}
                    onCloseOptions={() => setOptionsFor(null)}
                    onToggleMute={toggleMute}
                    onTogglePin={togglePin}
                    onMarkRead={onMarkRead}
                    onMarkUnread={onMarkUnread}
                    onClick={() => onSelectConversation({ type: 'dm', otherUser: conv, convId: conv.conv_id })}
                  />
                )
              })
            )}
          </div>
        )}
      </div>

      {/* User footer */}
      <div className="px-4 py-3 flex-shrink-0" style={{ borderTop: '1px solid var(--c-border)' }}>
        <button
          onClick={() => setShowSettings(true)}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-white/[0.07] active:scale-[0.97] transition-all duration-150 text-left"
        >
          {/* Avatar + status */}
          <div className="relative flex-shrink-0">
            <div className="w-11 h-11 rounded-full overflow-hidden flex items-center justify-center text-sm font-medium text-white/60 bg-white/[0.08]">
              {user.avatar_url
                ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                : initials
              }
            </div>
            <span
              className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2"
              style={{
                background: STATUSES.find(s => s.value === (user.status || 'available'))?.color ?? '#22c55e',
                borderColor: 'var(--c-sidebar)',
              }}
            />
          </div>

          {/* Name + status */}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-white/95 truncate leading-none">{user.first_name} {user.last_name}</div>
            <div className="text-xs text-white/55 mt-1 capitalize leading-none">
              {STATUSES.find(s => s.value === (user.status || 'available'))?.label ?? 'Available'}
            </div>
          </div>

        </button>
      </div>

      {showProfile && (
        <ProfilePanel user={user} onLogout={onLogout} onClose={() => setShowProfile(false)} />
      )}

      {showSettings && (
        <SettingsPanel user={user} onClose={() => setShowSettings(false)} onLogout={onLogout} />
      )}

      {showCreateGroup && (
        <CreateGroupModal
          user={user}
          onCreated={(group) => { onGroupCreated(group); setShowCreateGroup(false) }}
          onClose={() => setShowCreateGroup(false)}
        />
      )}

      {showNewDm && (
        <NewDmModal
          onClose={() => setShowNewDm(false)}
          onStarted={({ convId, otherUser }) => {
            setShowNewDm(false)
            loadDms()
            onSelectConversation({ type: 'dm', convId, otherUser })
          }}
        />
      )}
    </div>
  )
}
