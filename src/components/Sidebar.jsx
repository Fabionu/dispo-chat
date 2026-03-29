import { useState, useEffect, useCallback } from 'react'
import { IconSearch, IconPlus, IconMoreVertical, IconBellOff, IconBell } from './Icons.jsx'
import { api } from '../services/api.js'
import { getSocket } from '../services/socket.js'
import ProfilePanel from './ProfilePanel.jsx'
import CreateGroupModal from './CreateGroupModal.jsx'
import NewDmModal from './NewDmModal.jsx'

function UnreadBadge({ count }) {
  if (!count) return null
  return (
    <span className="flex-shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-white/[0.18] text-[10px] font-semibold text-white/90 flex items-center justify-center">
      {count > 99 ? '99+' : count}
    </span>
  )
}

function ItemOptions({ convKey, muted, onToggleMute, onClose }) {
  return (
    <div className="absolute right-0 top-full mt-1 z-[70] bg-[#1a1a28] border border-white/[0.08] rounded-xl overflow-hidden shadow-xl min-w-[170px]">
      <button
        onClick={() => { onToggleMute(convKey); onClose() }}
        className="w-full text-left px-4 py-2.5 text-xs text-white/50 hover:text-white/80 hover:bg-white/[0.04] transition flex items-center gap-2.5"
      >
        {muted
          ? <><IconBell size={12} /> Unmute notifications</>
          : <><IconBellOff size={12} /> Mute notifications</>
        }
      </button>
    </div>
  )
}

function GroupItem({ group, active, unread, muted, optionsOpen, onOpenOptions, onCloseOptions, onToggleMute, onClick }) {
  const initials = group.name.slice(0, 2).toUpperCase()
  const time = group.last_message_at
    ? new Date(group.last_message_at).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })
    : ''
  const convKey = `group:${group.id}`

  return (
    <div className={`relative group/item ${optionsOpen ? 'z-10' : ''}`}>
      <button
        onClick={onClick}
        className={`w-full text-left px-3 py-3 rounded-xl transition-all flex items-center gap-3
          ${active ? 'bg-white/[0.07]' : 'hover:bg-white/[0.03]'}`}
      >
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-semibold flex-shrink-0 transition-all
          ${active ? 'bg-white/[0.12] text-white/70' : 'bg-white/[0.05] text-white/30'}`}>
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <span className={`text-sm font-medium truncate block ${unread ? 'text-white' : 'text-white/95'}`}>
            {group.name}
          </span>
          <div className={`text-[11px] truncate mt-0.5 ${unread ? 'text-white/50' : 'text-white/25'}`}>
            {group.last_message || 'No messages yet'}
          </div>
        </div>
        {/* Right column: time + badge — fades out on hover */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0 group-hover/item:opacity-0 transition-opacity duration-150">
          {time && <span className="text-[10px] text-white/20 whitespace-nowrap">{time}</span>}
          <UnreadBadge count={unread} />
        </div>
      </button>

      {/* Options button — fades in on hover */}
      <div
        className="absolute right-2.5 top-1/2 -translate-y-1/2"
        onMouseDown={e => e.stopPropagation()}
      >
        <button
          onClick={(e) => { e.stopPropagation(); optionsOpen ? onCloseOptions() : onOpenOptions(convKey) }}
          className={`w-6 h-6 flex items-center justify-center rounded-md transition-all
            text-white/30 hover:text-white/70 hover:bg-white/[0.08]
            ${optionsOpen ? 'opacity-100' : 'opacity-0 group-hover/item:opacity-100'}`}
        >
          <IconMoreVertical size={13} />
        </button>
        {optionsOpen && (
          <ItemOptions
            convKey={convKey}
            muted={muted}
            onToggleMute={onToggleMute}
            onClose={onCloseOptions}
          />
        )}
      </div>
    </div>
  )
}

function DmItem({ conv, active, unread, muted, optionsOpen, onOpenOptions, onCloseOptions, onToggleMute, onClick }) {
  const initials = `${conv.first_name?.[0] ?? ''}${conv.last_name?.[0] ?? ''}`.toUpperCase()
  const time = conv.last_message_at
    ? new Date(conv.last_message_at).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })
    : ''
  const convKey = `dm:${conv.conv_id}`

  return (
    <div className={`relative group/item ${optionsOpen ? 'z-10' : ''}`}>
      <button
        onClick={onClick}
        className={`w-full text-left px-3 py-3 rounded-xl transition-all flex items-center gap-3
          ${active ? 'bg-white/[0.07]' : 'hover:bg-white/[0.03]'}`}
      >
        <div className="w-9 h-9 rounded-full bg-white/[0.05] flex items-center justify-center text-[11px] font-medium text-white/30 flex-shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <span className={`text-sm font-medium truncate block ${unread ? 'text-white' : 'text-white/95'}`}>
            {conv.first_name} {conv.last_name}
          </span>
          <div className={`text-xs truncate mt-0.5 ${unread ? 'text-white/50' : 'text-white/30'}`}>
            {conv.last_message || `@${conv.username}`}
          </div>
        </div>
        {/* Right column: time + badge — fades out on hover */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0 group-hover/item:opacity-0 transition-opacity duration-150">
          {time && <span className="text-[10px] text-white/20 whitespace-nowrap">{time}</span>}
          <UnreadBadge count={unread} />
        </div>
      </button>

      {/* Options button — fades in on hover */}
      <div
        className="absolute right-2.5 top-1/2 -translate-y-1/2"
        onMouseDown={e => e.stopPropagation()}
      >
        <button
          onClick={(e) => { e.stopPropagation(); optionsOpen ? onCloseOptions() : onOpenOptions(convKey) }}
          className={`w-6 h-6 flex items-center justify-center rounded-md transition-all
            text-white/30 hover:text-white/70 hover:bg-white/[0.08]
            ${optionsOpen ? 'opacity-100' : 'opacity-0 group-hover/item:opacity-100'}`}
        >
          <IconMoreVertical size={13} />
        </button>
        {optionsOpen && (
          <ItemOptions
            convKey={convKey}
            muted={muted}
            onToggleMute={onToggleMute}
            onClose={onCloseOptions}
          />
        )}
      </div>
    </div>
  )
}

export default function Sidebar({ user, groups, unreads = {}, activeConversation, onSelectConversation, onGroupCreated, onLogout }) {
  const [search, setSearch]               = useState('')
  const [dmConvs, setDmConvs]             = useState([])
  const [showProfile, setShowProfile]     = useState(false)
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [optionsFor, setOptionsFor]       = useState(null)
  const [showNewDm, setShowNewDm]         = useState(false)

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

    socket.on('message:new', handleMessage)
    return () => socket.off('message:new', handleMessage)
  }, [loadDms])

  const initials = `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase()

  const filteredGroups = groups.filter(g =>
    search === '' || g.name.toLowerCase().includes(search.toLowerCase())
  )

  const filteredDms = dmConvs.filter(c =>
    search === '' ||
    `${c.first_name} ${c.last_name}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="w-64 flex-shrink-0 flex flex-col h-full bg-[#0d0d14] border-r border-white/[0.05] relative">

      {/* Header */}
      <div className="px-4 pt-5 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <span className="text-sm font-semibold text-white/50 tracking-tight">Dispo Chat</span>
        </div>
        <button
          onClick={() => setShowCreateGroup(true)}
          className="w-6 h-6 flex items-center justify-center rounded-md text-white/20 hover:text-white/50 hover:bg-white/[0.05] transition"
          title="New group"
        >
          <IconPlus size={13} />
        </button>
      </div>

      {/* Search */}
      <div className="px-4 pb-3">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/15 pointer-events-none">
            <IconSearch size={11} />
          </span>
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white/[0.03] rounded-lg pl-7 pr-3 py-1.5 text-xs text-white/60 placeholder-white/15 focus:outline-none focus:bg-white/[0.05] transition-all"
          />
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-2">

        {/* Groups section */}
        <div className="mb-1">
          <p className="text-[10px] text-white/25 uppercase tracking-widest px-3 mb-1.5">Groups</p>
          {filteredGroups.length === 0 ? (
            <p className="text-xs text-white/30 px-3 py-2">No groups</p>
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
                  optionsOpen={optionsFor === convKey}
                  onOpenOptions={(k) => setOptionsFor(k)}
                  onCloseOptions={() => setOptionsFor(null)}
                  onToggleMute={toggleMute}
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
              <p className="text-[10px] text-white/25 uppercase tracking-widest">Direct Messages</p>
              <button
                onClick={() => setShowNewDm(true)}
                className="w-4 h-4 flex items-center justify-center rounded text-white/20 hover:text-white/50 hover:bg-white/[0.05] transition"
                title="New message"
              >
                <IconPlus size={11} />
              </button>
            </div>
            {filteredDms.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-5 px-3">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" opacity="0.18">
                  <circle cx="11" cy="16" r="8" stroke="white" strokeWidth="1.2"/>
                  <circle cx="21" cy="16" r="8" stroke="white" strokeWidth="1.2"/>
                  <path d="M8 24 L5 28" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
                  <path d="M24 24 L27 28" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
                <p className="text-[11px] text-white/20 text-center leading-relaxed">
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
                    optionsOpen={optionsFor === convKey}
                    onOpenOptions={(k) => setOptionsFor(k)}
                    onCloseOptions={() => setOptionsFor(null)}
                    onToggleMute={toggleMute}
                    onClick={() => onSelectConversation({ type: 'dm', otherUser: conv, convId: conv.conv_id })}
                  />
                )
              })
            )}
          </div>
        )}
      </div>

      {/* User footer */}
      <div className="px-3 py-3 border-t border-white/[0.04]">
        <button
          onClick={() => setShowProfile(v => !v)}
          className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/[0.04] transition group"
        >
          <div className="w-7 h-7 rounded-full bg-white/[0.06] flex items-center justify-center text-[11px] font-medium text-white/40 flex-shrink-0 group-hover:bg-white/[0.09] transition">
            {initials}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <div className="text-xs text-white/95 truncate">{user.first_name} {user.last_name}</div>
            <div className="text-[10px] text-white/25 font-mono mt-0.5">#{user.unique_code}</div>
          </div>
        </button>
      </div>

      {showProfile && (
        <ProfilePanel user={user} onLogout={onLogout} onClose={() => setShowProfile(false)} />
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
