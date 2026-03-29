import { useState, useRef, useEffect } from 'react'
import { IconSend, IconCheckCheck, IconMessage, IconUserPlus, IconX, IconMoreVertical } from './Icons.jsx'
import { api } from '../services/api.js'
import { getSocket } from '../services/socket.js'
import { playSend, playReceive } from '../services/sounds.js'
import AddMemberModal from './AddMemberModal.jsx'
import GroupSettingsModal from './GroupSettingsModal.jsx'

function SystemMessage({ content }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="flex-1 h-px bg-white/[0.04]" />
      <span className="text-[11px] text-white/25 flex-shrink-0">{content}</span>
      <div className="flex-1 h-px bg-white/[0.04]" />
    </div>
  )
}

function Message({ msg, isOwn, showAvatar, showName, showTime, onOpenReads }) {
  if (msg.type === 'system') return <SystemMessage content={msg.content} />

  return (
    <div className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : 'flex-row'} ${showAvatar ? '' : 'mt-[-6px]'}`}>
      {!isOwn && (
        <div className="w-6 flex-shrink-0 mt-1.5">
          {showAvatar && (
            <div className="w-6 h-6 rounded-full bg-white/[0.05] flex items-center justify-center text-[9px] font-medium text-white/30">
              {msg.avatar}
            </div>
          )}
        </div>
      )}
      <div className={`max-w-[65%] flex flex-col gap-1 ${isOwn ? 'items-end' : 'items-start'}`}>
        {!isOwn && showName && (
          <span className="text-[11px] text-white/35 ml-0.5">{msg.senderName}</span>
        )}
        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words
          ${isOwn
            ? 'bg-white/[0.10] text-white/90 rounded-br-sm'
            : 'bg-white/[0.05] text-white/80 rounded-bl-sm'
          }`}>
          {msg.content}
        </div>
        {showTime && (
          <div className={`flex items-center gap-1.5 px-0.5 ${isOwn ? 'flex-row-reverse' : ''}`}>
            <span className="text-[11px] text-white/35">{msg.time}</span>
            {isOwn && (
              onOpenReads ? (
                <button
                  onClick={() => onOpenReads(msg.id)}
                  className="text-white/30 hover:text-white/70 transition"
                  title="See who read"
                >
                  <IconCheckCheck size={16} stroke={2.2} />
                </button>
              ) : (
                <span className="text-white/30">
                  <IconCheckCheck size={16} stroke={2.2} />
                </span>
              )
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function sameGroup(a, b) {
  if (!a || !b) return false
  if (a.type === 'system' || b.type === 'system') return false
  return a.isOwn === b.isOwn && a.senderName === b.senderName && a.time === b.time
}

// ─── Message reads panel ──────────────────────────────────────
function MessageReadsPanel({ msgId, refreshKey, onClose }) {
  const [reads, setReads]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.getMessageReads(msgId)
      .then(({ reads }) => setReads(reads))
      .catch(() => setReads([]))
      .finally(() => setLoading(false))
  }, [msgId, refreshKey])

  const readList   = reads.filter(r => r.has_read)
  const unreadList = reads.filter(r => !r.has_read)

  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <div className="absolute top-0 right-0 bottom-0 w-60 z-40 bg-[#0f0f17] border-l border-white/[0.04] flex flex-col">

        <div className="px-5 py-4 border-b border-white/[0.04] flex items-center justify-between">
          <span className="text-xs font-medium text-white/50 uppercase tracking-widest">Seen by</span>
          <button onClick={onClose} className="text-white/20 hover:text-white/50 transition">
            <IconX size={13} />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto py-3">
            {reads.length === 0 && (
              <p className="text-xs text-white/25 px-5 py-3">No other members</p>
            )}

            {readList.length > 0 && (
              <div className="mb-3">
                <p className="text-[10px] text-white/25 uppercase tracking-widest px-4 mb-1.5">Read</p>
                {readList.map(m => {
                  const initials = `${m.first_name?.[0] ?? ''}${m.last_name?.[0] ?? ''}`.toUpperCase()
                  const readTime = m.last_read_at
                    ? new Date(m.last_read_at).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })
                    : null
                  return (
                    <div key={m.id} className="flex items-center gap-3 px-4 py-2.5">
                      <div className="w-7 h-7 rounded-full bg-white/[0.06] flex items-center justify-center text-[10px] font-medium text-white/40 flex-shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm text-white/85 truncate">{m.first_name} {m.last_name}</div>
                        {readTime && <div className="text-[10px] text-white/25 mt-0.5">{readTime}</div>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {unreadList.length > 0 && (
              <div>
                <p className="text-[10px] text-white/25 uppercase tracking-widest px-4 mb-1.5">Not read</p>
                {unreadList.map(m => {
                  const initials = `${m.first_name?.[0] ?? ''}${m.last_name?.[0] ?? ''}`.toUpperCase()
                  return (
                    <div key={m.id} className="flex items-center gap-3 px-4 py-2.5">
                      <div className="w-7 h-7 rounded-full bg-white/[0.04] flex items-center justify-center text-[10px] font-medium text-white/20 flex-shrink-0">
                        {initials}
                      </div>
                      <div className="text-sm text-white/35 truncate">{m.first_name} {m.last_name}</div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}

// ─── Role colors / order ──────────────────────────────────────
const ROLE_ORDER = { admin: 0, dispatcher: 1, driver: 2 }
const ROLE_COLOR = { admin: 'text-amber-400/60', dispatcher: 'text-sky-400/50', driver: 'text-white/25' }
const ROLES      = ['admin', 'dispatcher', 'driver']

function MembersPanel({ members, isAdmin, currentUserId, onAddMember, onClose, onChangeRole, onRemoveMember }) {
  const [openRoleMenu, setOpenRoleMenu] = useState(null)
  const sorted = [...members].sort((a, b) => (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9))

  return (
    <>
      <div className="fixed inset-0 z-30" onClick={() => { onClose(); setOpenRoleMenu(null) }} />
      <div className="absolute top-0 right-0 bottom-0 w-64 z-40 bg-[#0f0f17] border-l border-white/[0.04] flex flex-col">

        <div className="px-5 py-4 border-b border-white/[0.04] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-medium text-white/50 uppercase tracking-widest">Members</span>
            {isAdmin && (
              <button
                onClick={onAddMember}
                className="w-5 h-5 flex items-center justify-center rounded-md text-white/20 hover:text-white/60 hover:bg-white/[0.07] transition"
                title="Add member"
              >
                <IconUserPlus size={11} />
              </button>
            )}
          </div>
          <button onClick={onClose} className="text-white/20 hover:text-white/50 transition">
            <IconX size={13} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {sorted.map(m => {
            const initials = `${m.first_name?.[0] ?? ''}${m.last_name?.[0] ?? ''}`.toUpperCase()
            const isMe     = m.id === currentUserId
            return (
              <div key={m.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.02] transition group/row">
                <div className="w-8 h-8 rounded-full bg-white/[0.05] flex items-center justify-center text-[11px] font-medium text-white/30 flex-shrink-0">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white/95 truncate">
                    {m.first_name} {m.last_name}
                    {isMe && <span className="text-white/20 text-[11px] ml-1">you</span>}
                  </div>
                  <div className="relative mt-0.5">
                    {isAdmin && !isMe ? (
                      <button
                        onClick={() => setOpenRoleMenu(openRoleMenu === m.id ? null : m.id)}
                        className={`text-[11px] capitalize transition hover:text-white/50 ${ROLE_COLOR[m.role] ?? 'text-white/25'}`}
                      >
                        {m.role} ▾
                      </button>
                    ) : (
                      <span className={`text-[11px] capitalize ${ROLE_COLOR[m.role] ?? 'text-white/25'}`}>{m.role}</span>
                    )}
                    {openRoleMenu === m.id && (
                      <>
                        <div className="fixed inset-0 z-[45]" onClick={(e) => { e.stopPropagation(); setOpenRoleMenu(null) }} />
                        <div className="absolute left-0 top-full mt-1 z-[50] bg-[#1a1a28] border border-white/[0.08] rounded-xl overflow-hidden shadow-xl min-w-[110px]">
                          {ROLES.map(r => (
                            <button
                              key={r}
                              onClick={() => { onChangeRole(m.id, r); setOpenRoleMenu(null) }}
                              className={`w-full text-left px-4 py-2 text-xs capitalize transition
                                ${r === m.role
                                  ? 'text-white/70 bg-white/[0.06]'
                                  : 'text-white/35 hover:text-white/65 hover:bg-white/[0.04]'}`}
                            >
                              {r}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
                {isAdmin && !isMe && (
                  <button
                    onClick={() => onRemoveMember(m.id)}
                    className="opacity-0 group-hover/row:opacity-100 transition text-white/20 hover:text-red-400/70 flex-shrink-0"
                    title="Remove member"
                  >
                    <IconX size={12} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

function GroupHeader({ group, memberCount, onToggleMembers, onSettings }) {
  const initials = group.name.slice(0, 2).toUpperCase()

  const subtitle = [
    group.description || null,
    memberCount !== null ? `${memberCount} member${memberCount !== 1 ? 's' : ''}` : null,
  ].filter(Boolean).join(' · ')

  return (
    <div className="px-7 py-2.5 border-b border-white/[0.04] flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center text-[13px] font-semibold text-white/40">
          {initials}
        </div>
        <div>
          <div className="text-xl font-bold text-white/95 tracking-tight leading-none">{group.name}</div>
          <button
            onClick={onToggleMembers}
            className="text-xs text-white/40 mt-1 hover:text-white/65 transition text-left"
          >
            {subtitle || '—'}
          </button>
        </div>
      </div>
      <button
        onClick={onSettings}
        className="w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition"
        title="Options"
      >
        <IconMoreVertical size={17} />
      </button>
    </div>
  )
}

function DmHeader({ otherUser }) {
  const initials = `${otherUser.first_name?.[0] ?? ''}${otherUser.last_name?.[0] ?? ''}`.toUpperCase()

  return (
    <div className="px-7 py-2.5 border-b border-white/[0.04] flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-white/[0.05] flex items-center justify-center text-[13px] font-medium text-white/30 flex-shrink-0">
        {initials}
      </div>
      <div>
        <div className="text-xl font-bold text-white/95 tracking-tight leading-none">
          {otherUser.first_name} {otherUser.last_name}
        </div>
        <div className="text-xs text-white/40 mt-1">
          @{otherUser.username}
          {otherUser.role && <span className="ml-1.5 capitalize">· {otherUser.role}</span>}
        </div>
      </div>
    </div>
  )
}

function formatGroupMessages(messages, currentUserId) {
  return messages.map(m => ({
    id:         m.id,
    content:    m.content,
    time:       new Date(m.created_at).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' }),
    isOwn:      m.sender_id === currentUserId,
    senderName: `${m.first_name} ${m.last_name}`,
    avatar:     `${m.first_name?.[0] ?? ''}${m.last_name?.[0] ?? ''}`.toUpperCase(),
  }))
}

function formatDmMessages(messages, currentUserId) {
  return messages.map(m => ({
    id:         m.id,
    content:    m.content,
    time:       new Date(m.created_at).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' }),
    isOwn:      m.sender_id === currentUserId,
    senderName: `${m.first_name} ${m.last_name}`,
    avatar:     `${m.first_name?.[0] ?? ''}${m.last_name?.[0] ?? ''}`.toUpperCase(),
  }))
}

export default function ChatWindow({ user, activeConversation, onGroupUpdated, onGroupRemoved }) {
  const [input, setInput]                   = useState('')
  const [messages, setMessages]             = useState([])
  const [sending, setSending]               = useState(false)
  const [showAddMember, setShowAddMember]   = useState(false)
  const [showMembers, setShowMembers]       = useState(false)
  const [showSettings, setShowSettings]     = useState(false)
  const [members, setMembers]               = useState([])
  const [readsPanel, setReadsPanel]         = useState(null)
  const [readsRefreshKey, setReadsRefreshKey] = useState(0)
  const [typers, setTypers]                 = useState([])   // [{ user_id, username }]
  const bottomRef                           = useRef(null)
  const currentRoomRef                      = useRef(null)
  const typingTimers                        = useRef({})

  const group     = activeConversation?.type === 'group' ? activeConversation.group : null
  const dmConvId  = activeConversation?.type === 'dm'    ? activeConversation.convId : null
  const otherUser = activeConversation?.type === 'dm'    ? activeConversation.otherUser : null
  const isAdmin   = group?.role === 'admin'

  // ─── Socket: messages + member added ─────────────────────────
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const handleNewMessage = ({ type, message }) => {
      const isOwn = message.sender_id === user.id
      if (!isOwn) {
        playReceive()
        // Mark as read if it's a group message in the active conversation
        if (type === 'group' && message.group_id) {
          api.markGroupRead(message.group_id).catch(() => {})
        }
      }
      setMessages(prev => [...prev, {
        id:         message.id,
        content:    message.content,
        time:       new Date(message.created_at).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' }),
        isOwn,
        senderName: `${message.first_name} ${message.last_name}`,
        avatar:     `${message.first_name?.[0] ?? ''}${message.last_name?.[0] ?? ''}`.toUpperCase(),
      }])
    }

    const handleMemberAdded = ({ user: newUser, role }) => {
      setMembers(prev => [...prev, { ...newUser, role }])
      setMessages(prev => [...prev, {
        id:      `sys-${Date.now()}`,
        type:    'system',
        content: `${newUser.first_name} ${newUser.last_name} joined the group as ${role}`,
      }])
    }

    const handleTypingStart = ({ user_id, username }) => {
      setTypers(prev => prev.find(t => t.user_id === user_id) ? prev : [...prev, { user_id, username }])
      clearTimeout(typingTimers.current[user_id])
      typingTimers.current[user_id] = setTimeout(() => {
        setTypers(prev => prev.filter(t => t.user_id !== user_id))
      }, 3000)
    }
    const handleTypingStop = ({ user_id }) => {
      clearTimeout(typingTimers.current[user_id])
      setTypers(prev => prev.filter(t => t.user_id !== user_id))
    }

    socket.on('message:new',        handleNewMessage)
    socket.on('group:member_added', handleMemberAdded)
    socket.on('typing:start',       handleTypingStart)
    socket.on('typing:stop',        handleTypingStop)
    return () => {
      socket.off('message:new',        handleNewMessage)
      socket.off('group:member_added', handleMemberAdded)
      socket.off('typing:start',       handleTypingStart)
      socket.off('typing:stop',        handleTypingStop)
    }
  }, [user.id])

  // ─── Socket: group management + read updates ─────────────────
  useEffect(() => {
    const socket = getSocket()
    if (!socket || !group) return

    const handleGroupUpdated = (updated)          => onGroupUpdated?.(updated)
    const handleGroupDeleted = ({ group_id })     => { if (group_id === group.id) onGroupRemoved?.(group_id) }
    const handleReadUpdate   = ()                 => setReadsRefreshKey(k => k + 1)

    const handleMemberRemoved = ({ user_id, name }) => {
      if (user_id === user.id) {
        onGroupRemoved?.(group.id)
      } else {
        setMembers(prev => prev.filter(m => m.id !== user_id))
        setMessages(prev => [...prev, {
          id:      `sys-${Date.now()}`,
          type:    'system',
          content: `${name} was removed from the group`,
        }])
      }
    }

    const handleRoleChanged = ({ user_id, role }) => {
      setMembers(prev => prev.map(m => m.id === user_id ? { ...m, role } : m))
    }

    socket.on('group:updated',             handleGroupUpdated)
    socket.on('group:deleted',             handleGroupDeleted)
    socket.on('group:member_removed',      handleMemberRemoved)
    socket.on('group:member_role_changed', handleRoleChanged)
    socket.on('group:read_update',         handleReadUpdate)

    return () => {
      socket.off('group:updated',             handleGroupUpdated)
      socket.off('group:deleted',             handleGroupDeleted)
      socket.off('group:member_removed',      handleMemberRemoved)
      socket.off('group:member_role_changed', handleRoleChanged)
      socket.off('group:read_update',         handleReadUpdate)
    }
  }, [group?.id, user.id])

  // ─── Join / leave room when conversation changes ──────────────
  useEffect(() => {
    const socket = getSocket()

    if (currentRoomRef.current && socket) {
      const [type, id] = currentRoomRef.current.split(':')
      socket.emit(type === 'group' ? 'group:leave' : 'dm:leave', parseInt(id))
      currentRoomRef.current = null
    }

    setTypers([])
    if (!activeConversation) {
      setMessages([])
      setMembers([])
      setShowMembers(false)
      setShowSettings(false)
      setReadsPanel(null)
      return
    }

    if (group) {
      if (socket) {
        socket.emit('group:join', group.id)
        currentRoomRef.current = `group:${group.id}`
      }
      api.markGroupRead(group.id).catch(() => {})
      api.getGroupMessages(group.id)
        .then(({ messages }) => setMessages(formatGroupMessages(messages, user.id)))
        .catch(() => setMessages([]))
      api.getMembers(group.id)
        .then(({ members }) => setMembers(members))
        .catch(() => setMembers([]))
      setShowMembers(false)
      setShowSettings(false)
      setReadsPanel(null)
    } else if (dmConvId) {
      if (socket) {
        socket.emit('dm:join', dmConvId)
        currentRoomRef.current = `dm:${dmConvId}`
      }
      api.getDmMessages(dmConvId)
        .then(({ messages }) => setMessages(formatDmMessages(messages, user.id)))
        .catch(() => setMessages([]))
    }

    return () => {
      if (currentRoomRef.current && socket) {
        const [type, id] = currentRoomRef.current.split(':')
        socket.emit(type === 'group' ? 'group:leave' : 'dm:leave', parseInt(id))
        currentRoomRef.current = null
      }
    }
  }, [activeConversation, group?.id, dmConvId, user.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleChangeRole = async (userId, role) => {
    try {
      await api.changeMemberRole(group.id, userId, role)
      setMembers(prev => prev.map(m => m.id === userId ? { ...m, role } : m))
    } catch {}
  }

  const handleRemoveMember = async (userId) => {
    try {
      await api.removeMember(group.id, userId)
      setMembers(prev => prev.filter(m => m.id !== userId))
    } catch {}
  }

  const handleSend = () => {
    if (!input.trim() || sending) return
    const content = input.trim()
    const socket  = getSocket()
    setInput('')
    setSending(true)

    if (socket?.connected) {
      const event   = group ? 'group:message' : 'dm:message'
      const payload = group ? { group_id: group.id, content } : { conv_id: dmConvId, content }

      socket.emit(event, payload, (ack) => {
        if (ack?.error) setInput(content)
        else playSend()
        setSending(false)
      })
    } else {
      const req = group
        ? api.sendGroupMessage(group.id, content)
        : api.sendDmMessage(dmConvId, content)

      req.then(({ message: msg }) => {
        playSend()
        setMessages(prev => [...prev, {
          id:         msg.id,
          content:    msg.content,
          time:       new Date(msg.created_at).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' }),
          isOwn:      true,
          senderName: `${user.first_name} ${user.last_name}`,
          avatar:     `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase(),
        }])
      }).catch(() => setInput(content))
       .finally(() => setSending(false))
    }
  }

  const typingTimeoutRef = useRef(null)
  const handleInputChange = (e) => {
    setInput(e.target.value)
    const socket = getSocket()
    const room   = group ? `group:${group.id}` : dmConvId ? `dm:${dmConvId}` : null
    if (!socket || !room) return
    socket.emit('typing:start', { room })
    clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing:stop', { room })
    }, 2000)
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  if (!activeConversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0a0a0f]">
        <div className="text-center">
          <span className="text-white/10 inline-block mb-3"><IconMessage size={28} stroke={1} /></span>
          <p className="text-xs text-white/30">Select a group or conversation</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-[#0a0a0f] min-w-0 relative">

      {group
        ? <GroupHeader
            group={group}
            memberCount={members.length || null}
            onToggleMembers={() => setShowMembers(v => !v)}
            onSettings={() => setShowSettings(true)}
          />
        : <DmHeader otherUser={otherUser} />
      }

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-7 py-6 space-y-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-white/30">No messages yet. Say hello!</p>
          </div>
        )}
        {messages.map((msg, i) => {
          const prev        = messages[i - 1]
          const next        = messages[i + 1]
          const grouped     = sameGroup(prev, msg)
          const lastInGroup = !sameGroup(msg, next)
          return (
            <Message
              key={msg.id ?? i}
              msg={msg}
              isOwn={msg.isOwn}
              showAvatar={!grouped}
              showName={!grouped}
              showTime={lastInGroup}
              onOpenReads={group && msg.isOwn && msg.id && typeof msg.id === 'number'
                ? (id) => setReadsPanel(id)
                : undefined
              }
            />
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Typing indicator */}
      {typers.length > 0 && (
        <div className="px-7 pb-1 flex items-center gap-2">
          <div className="flex gap-[3px] items-center">
            <span className="w-1 h-1 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1 h-1 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1 h-1 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span className="text-[11px] text-white/25">
            {typers.length === 1
              ? `${typers[0].username} is typing...`
              : `${typers.map(t => t.username).join(', ')} are typing...`}
          </span>
        </div>
      )}

      {/* Input */}
      <div className="px-5 pb-5 pt-2">
        <div className="flex items-end gap-2 bg-white/[0.03] border border-white/[0.06] rounded-2xl px-4 py-2.5 focus-within:border-white/10 transition-all">
          <textarea
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKey}
            placeholder="Message..."
            rows={1}
            className="flex-1 bg-transparent text-sm text-white/90 placeholder-white/20 focus:outline-none resize-none py-1 min-h-[22px] max-h-[100px]"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="p-1 rounded-lg transition flex-shrink-0 mb-0.5 text-white/15 hover:text-white/50 disabled:opacity-30"
          >
            <IconSend size={14} />
          </button>
        </div>
      </div>

      {showMembers && group && (
        <MembersPanel
          members={members}
          isAdmin={isAdmin}
          currentUserId={user.id}
          onAddMember={() => { setShowMembers(false); setShowAddMember(true) }}
          onClose={() => setShowMembers(false)}
          onChangeRole={handleChangeRole}
          onRemoveMember={handleRemoveMember}
        />
      )}

      {showAddMember && group && (
        <AddMemberModal
          groupId={group.id}
          onClose={() => setShowAddMember(false)}
          onAdded={() => api.getMembers(group.id).then(({ members }) => setMembers(members)).catch(() => {})}
        />
      )}

      {showSettings && group && (
        <GroupSettingsModal
          group={group}
          isAdmin={isAdmin}
          onClose={() => setShowSettings(false)}
          onUpdated={(updated) => { onGroupUpdated?.(updated); setShowSettings(false) }}
          onRemoved={(groupId) => onGroupRemoved?.(groupId)}
        />
      )}

      {readsPanel && group && (
        <MessageReadsPanel
          msgId={readsPanel}
          refreshKey={readsRefreshKey}
          onClose={() => setReadsPanel(null)}
        />
      )}
    </div>
  )
}
