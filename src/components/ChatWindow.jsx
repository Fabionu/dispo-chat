import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { IconSend, IconCheckCheck, IconMessage, IconUserPlus, IconX, IconMoreVertical, IconReply, IconPencil, IconPin, IconChevronDown, IconSearch } from './Icons.jsx'
import { useSettings, STATUSES, PATTERNS, THEMES } from '../contexts/SettingsContext.jsx'
import { api } from '../services/api.js'
import { getSocket } from '../services/socket.js'
import { playReceive } from '../services/sounds.js'
import AddMemberModal from './AddMemberModal.jsx'
import GroupSettingsModal from './GroupSettingsModal.jsx'

// ─── URL / highlight parsing ──────────────────────────────────
const URL_RE = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi

function parseContent(text, highlight) {
  const segs = []
  const re = new RegExp('https?:\\/\\/[^\\s<>"{}|\\\\^`[\\]]+', 'gi')
  re.lastIndex = 0
  let last = 0, m
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) splitHighlight(text.slice(last, m.index), highlight, segs)
    segs.push({ type: 'url', value: m[0] })
    last = m.index + m[0].length
  }
  if (last < text.length) splitHighlight(text.slice(last), highlight, segs)
  return segs
}

function splitHighlight(text, hl, out) {
  if (!hl || hl.length < 2) { out.push({ type: 'text', value: text }); return }
  const re = new RegExp(hl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
  let last = 0, m
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push({ type: 'text', value: text.slice(last, m.index) })
    out.push({ type: 'match', value: m[0] })
    last = m.index + m[0].length
  }
  if (last < text.length) out.push({ type: 'text', value: text.slice(last) })
}

function MessageText({ content, highlight }) {
  const parts = parseContent(content, highlight)
  return (
    <>
      {parts.map((p, i) => {
        if (p.type === 'url') return (
          <a key={i} href={p.value} target="_blank" rel="noopener noreferrer"
            className="underline underline-offset-2 hover:opacity-80 transition-opacity break-all"
            style={{ color: 'var(--c-accent)' }}
            onClick={e => e.stopPropagation()}
          >{p.value}</a>
        )
        if (p.type === 'match') return (
          <mark key={i} className="rounded px-0.5"
            style={{ background: 'rgba(251,191,36,0.4)', color: 'inherit' }}
          >{p.value}</mark>
        )
        return <span key={i}>{p.value}</span>
      })}
    </>
  )
}

// ─── Link preview ─────────────────────────────────────────────
const previewCache = new Map()

function extractFirstUrl(content) {
  URL_RE.lastIndex = 0
  const m = URL_RE.exec(content)
  return m ? m[0] : null
}

function LinkPreview({ url }) {
  const [status, setStatus] = useState('loading')
  const [data, setData]     = useState(null)

  useEffect(() => {
    if (previewCache.has(url)) {
      const c = previewCache.get(url)
      if (c) { setData(c); setStatus('ok') } else setStatus('error')
      return
    }
    setStatus('loading')
    fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`)
      .then(r => r.json())
      .then(json => {
        if (json.status !== 'success') throw new Error()
        const d = json.data
        const preview = {
          title:       d.title || null,
          description: d.description || null,
          image:       d.image?.url || null,
          logo:        d.logo?.url || null,
          domain:      (() => { try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url } })(),
        }
        if (!preview.title && !preview.description && !preview.image) throw new Error()
        previewCache.set(url, preview)
        setData(preview); setStatus('ok')
      })
      .catch(() => { previewCache.set(url, null); setStatus('error') })
  }, [url])

  if (status !== 'ok' || !data) return null
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      onClick={e => e.stopPropagation()}
      className="mt-2 rounded-xl overflow-hidden flex flex-col hover:opacity-90 transition-opacity"
      style={{ background: 'var(--c-surface3)', border: '1px solid var(--c-border-md)', maxWidth: 280 }}
    >
      {data.image && (
        <img src={data.image} alt="" className="w-full object-cover" style={{ maxHeight: 130 }}
          onError={e => { e.target.style.display = 'none' }} />
      )}
      <div className="px-3 py-2.5">
        <div className="flex items-center gap-1.5 mb-1">
          {data.logo && <img src={data.logo} alt="" className="w-3.5 h-3.5 rounded flex-shrink-0"
            style={{ objectFit: 'contain' }} onError={e => { e.target.style.display = 'none' }} />}
          <span className="text-[10px] text-white/30 truncate">{data.domain}</span>
        </div>
        {data.title       && <div className="text-xs font-semibold text-white/80 leading-snug line-clamp-2">{data.title}</div>}
        {data.description && <div className="text-[11px] text-white/40 mt-0.5 leading-snug line-clamp-2">{data.description}</div>}
      </div>
    </a>
  )
}

// ─── Profile popup ────────────────────────────────────────────
function ProfilePopup({ profile, onClose }) {
  const [imgFull, setImgFull] = useState(false)

  return (
    <>
      {/* Backdrop + centering wrapper */}
      <div
        className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm flex items-center justify-center"
        onClick={onClose}
      >
      {/* Modal */}
      <div
        className="rounded-3xl shadow-2xl overflow-hidden panel-in w-80"
        style={{
          background: 'var(--c-surface)',
          border: '1px solid var(--c-border-lg)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Banner / avatar area */}
        <div className="relative h-24 flex items-end justify-center pb-0" style={{ background: 'var(--c-surface2)' }}>
          <div
            className="absolute bottom-0 translate-y-1/2 cursor-pointer"
            onClick={() => profile.avatar_url && setImgFull(true)}
          >
            <div
              className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center text-3xl font-bold ring-4"
              style={{
                background: 'var(--c-surface3)',
                color: 'rgba(255,255,255,0.3)',
                ringColor: 'var(--c-surface)',
                boxShadow: '0 0 0 4px var(--c-surface)',
              }}
            >
              {profile.avatar_url
                ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                : profile.initials
              }
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="pt-16 pb-6 px-6 text-center flex flex-col items-center gap-1">
          <div className="text-lg font-bold text-white/92 leading-tight">{profile.name}</div>
          {profile.username && (
            <div className="text-sm text-white/40">@{profile.username}</div>
          )}
          {profile.statusLabel && (
            <div className="mt-1 flex items-center justify-center gap-1.5 text-sm">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: profile.statusColor }} />
              <span className="text-white/50">{profile.statusLabel}</span>
            </div>
          )}
          {profile.unique_code && (
            <div className="mt-3 px-3 py-1.5 rounded-xl text-xs text-white/30 font-mono tracking-widest" style={{ background: 'var(--c-surface2)' }}>
              #{profile.unique_code}
            </div>
          )}
        </div>
      </div>
      </div>

      {/* Full-size image overlay */}
      {imgFull && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center backdrop-blur-sm"
          onClick={() => setImgFull(false)}
        >
          <img
            src={profile.avatar_url}
            alt=""
            className="max-w-[80vw] max-h-[80vh] rounded-2xl shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}

function SystemMessage({ content }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="flex-1 h-px bg-white/[0.04]" />
      <span className="text-[11px] text-white/25 flex-shrink-0">{content}</span>
      <div className="flex-1 h-px bg-white/[0.04]" />
    </div>
  )
}

function Message({ msg, isOwn, showAvatar, showName, showTime, onOpenReads, onReply, onEdit, onPin, pinnedMsgId, isGroup, highlighted, onRef, onScrollTo, highlight, onAvatarClick }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [openUpward, setOpenUpward] = useState(false)
  const chevronRef = useRef(null)

  if (msg.type === 'system') return <SystemMessage content={msg.content} />

  const isPinned   = pinnedMsgId === msg.id
  const isEditable = isOwn && msg.createdAt &&
    (Date.now() - new Date(msg.createdAt).getTime() < 5 * 60 * 1000)

  const menuItems = [
    { label: 'Reply', icon: <IconReply size={12} stroke={1.5} />, action: () => onReply?.(msg) },
    ...(isEditable ? [{ label: 'Edit', icon: <IconPencil size={12} stroke={1.5} />, action: () => onEdit?.(msg) }] : []),
    ...(onPin ? [{
      label: isPinned ? 'Unpin' : 'Pin',
      icon: <IconPin size={12} stroke={1.5} color={isPinned ? 'rgba(251,191,36,0.7)' : 'currentColor'} />,
      action: () => onPin?.(msg),
    }] : []),
  ]

  return (
    <div
      ref={onRef}
      className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'} ${showAvatar ? 'mt-3' : 'mt-0.5'} group/msg rounded-xl px-1 -mx-1 transition-colors duration-700
        ${highlighted ? 'bg-amber-400/[0.12]' : ''}`}
      onDoubleClick={() => onReply?.(msg)}
    >
      {/* Avatar slot (others only) */}
      {!isOwn && (
        <div className="w-6 flex-shrink-0 mt-1.5">
          {showAvatar && (
            <button
              onClick={e => onAvatarClick?.(e, msg)}
              className="w-6 h-6 rounded-full bg-white/[0.05] flex items-center justify-center text-[9px] font-medium text-white/30 hover:bg-white/[0.10] transition overflow-hidden"
            >
              {msg.avatar_url
                ? <img src={msg.avatar_url} alt="" className="w-full h-full object-cover" />
                : msg.avatar
              }
            </button>
          )}
        </div>
      )}

      {/* Content column */}
      <div className={`max-w-[65%] flex flex-col gap-1 ${isOwn ? 'items-end' : 'items-start'}`}>
        {!isOwn && showName && (
          <span className="text-[11px] text-white/35 ml-0.5">{msg.senderName}</span>
        )}

        {/* Reply quote */}
        {msg.replyTo && (
          <button
            onClick={(e) => { e.stopPropagation(); onScrollTo?.(msg.replyTo.id) }}
            onDoubleClick={(e) => e.stopPropagation()}
            className={`flex items-stretch gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.05] max-w-full text-left
              hover:bg-white/[0.11] hover:border-white/[0.09] transition-colors
              ${isOwn ? 'rounded-br-sm' : 'rounded-bl-sm'}`}>
            <div className="w-0.5 rounded-full bg-white/[0.20] flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] text-white/40 font-medium mb-0.5">{msg.replyTo.senderName}</div>
              <div className="text-[11px] text-white/30 truncate">{msg.replyTo.content}</div>
            </div>
          </button>
        )}

        {/* Bubble */}
        <div
          className={`rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words
          ${isOwn ? 'text-white/90 rounded-br-sm' : 'text-white/80 rounded-bl-sm'}
          ${isPinned ? 'ring-1 ring-amber-400/20' : ''}`}
          style={{
            background: isOwn ? 'var(--c-msg-own)' : 'var(--c-msg-other)',
            padding: 'var(--c-bubble-py) var(--c-bubble-px)',
          }}
        >
          <MessageText content={msg.content} highlight={highlight} />
          {msg.edited_at && (
            <span className="text-[10px] text-white/20 ml-1.5 select-none">(edited)</span>
          )}
        </div>

        {/* Link preview */}
        {(() => { const u = extractFirstUrl(msg.content); return u ? <LinkPreview key={u} url={u} /> : null })()}

        {/* Time + checkmarks */}
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

      {/* Chevron trigger + dropdown */}
      <div
        className={`relative flex-shrink-0 transition-opacity ${menuOpen ? 'opacity-100' : 'opacity-0 group-hover/msg:opacity-100'}`}
        style={{
          marginTop: `${(showName ? 22 : 0) + (msg.replyTo ? 52 : 0) + 6}px`,
          alignSelf: 'flex-start',
        }}
      >
        <button
          ref={chevronRef}
          onClick={(e) => {
            e.stopPropagation()
            const rect = chevronRef.current?.getBoundingClientRect()
            setOpenUpward(rect ? rect.bottom > window.innerHeight - 160 : false)
            setMenuOpen(v => !v)
          }}
          onDoubleClick={(e) => e.stopPropagation()}
          className={`w-6 h-6 flex items-center justify-center rounded-lg transition
            ${menuOpen
              ? 'text-white/80 bg-white/[0.14]'
              : 'text-white/60 bg-white/[0.08] hover:text-white/90 hover:bg-white/[0.16]'}`}
        >
          <IconChevronDown size={13} stroke={2.2} />
        </button>

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-[49]" onClick={() => setMenuOpen(false)} />
            <div
              className={`absolute z-50 border rounded-xl overflow-hidden shadow-xl min-w-[130px] ${isOwn ? 'right-0' : 'left-0'} ${openUpward ? 'bottom-full mb-1' : 'top-full mt-1'}`}
              style={{ background: 'var(--c-surface3)', borderColor: 'var(--c-border-md)' }}
            >
              {menuItems.map(item => (
                <button
                  key={item.label}
                  onClick={(e) => { e.stopPropagation(); item.action(); setMenuOpen(false) }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-white/45 hover:text-white/80 hover:bg-white/[0.09] transition text-left"
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function sameGroup(a, b) {
  if (!a || !b) return false
  if (a.type === 'system' || b.type === 'system') return false
  if (b.replyTo) return false
  return a.isOwn === b.isOwn && a.senderName === b.senderName
}

// ─── Message reads panel ──────────────────────────────────────
function MessageReadsPanel({ msgId, refreshKey, onClose }) {
  const [reads, setReads]     = useState([])
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
      <div className="absolute top-0 right-0 bottom-0 w-60 z-40 border-l border-white/[0.04] flex flex-col" style={{ background: 'var(--c-surface)' }}>

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

function MembersPanel({ members, isAdmin, currentUserId, userStatuses, onAddMember, onClose, onChangeRole, onRemoveMember }) {
  const [openRoleMenu, setOpenRoleMenu] = useState(null)
  const sorted = [...members].sort((a, b) => (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9))

  return (
    <>
      <div className="fixed inset-0 z-30" onClick={() => { onClose(); setOpenRoleMenu(null) }} />
      <div className="absolute top-0 right-0 bottom-0 w-64 z-40 border-l border-white/[0.04] flex flex-col" style={{ background: 'var(--c-surface)' }}>

        <div className="px-5 py-4 border-b border-white/[0.04] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-medium text-white/50 uppercase tracking-widest">Members</span>
            {isAdmin && (
              <button
                onClick={onAddMember}
                className="w-5 h-5 flex items-center justify-center rounded-md text-white/20 hover:text-white/60 hover:bg-white/[0.11] transition"
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
            const initials   = `${m.first_name?.[0] ?? ''}${m.last_name?.[0] ?? ''}`.toUpperCase()
            const isMe       = m.id === currentUserId
            const status     = userStatuses?.[m.id] ?? m.status ?? 'available'
            const statusColor = STATUSES.find(s => s.value === status)?.color ?? '#6b7280'
            return (
              <div key={m.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.09] transition group/row">
                <div className="relative flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-white/[0.05] flex items-center justify-center text-[11px] font-medium text-white/30 overflow-hidden">
                    {m.avatar_url
                      ? <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />
                      : initials
                    }
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2" style={{ background: statusColor, borderColor: 'var(--c-surface)' }} />
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
                        <div className="absolute left-0 top-full mt-1 z-[50] border rounded-xl overflow-hidden shadow-xl min-w-[110px]" style={{ background: 'var(--c-surface3)', borderColor: 'var(--c-border-md)' }}>
                          {ROLES.map(r => (
                            <button
                              key={r}
                              onClick={() => { onChangeRole(m.id, r); setOpenRoleMenu(null) }}
                              className={`w-full text-left px-4 py-2 text-xs capitalize transition
                                ${r === m.role
                                  ? 'text-white/70 bg-white/[0.06]'
                                  : 'text-white/35 hover:text-white/65 hover:bg-white/[0.09]'}`}
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

function GroupHeader({ group, memberCount, isAdmin, onToggleMembers, onAddMember, onSettings, onSearch }) {
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
      <div className="flex items-center gap-1">
        {isAdmin && (
          <button onClick={onAddMember}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-white/55 hover:text-white/85 hover:bg-white/[0.10] transition"
            title="Add member">
            <IconUserPlus size={16} stroke={2} />
          </button>
        )}
        <button onClick={onSearch}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-white/55 hover:text-white/85 hover:bg-white/[0.10] transition"
          title="Search in conversation">
          <IconSearch size={16} stroke={2.2} />
        </button>
        <button onClick={onSettings}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-white/55 hover:text-white/85 hover:bg-white/[0.10] transition"
          title="Options">
          <IconMoreVertical size={17} stroke={2.2} />
        </button>
      </div>
    </div>
  )
}

function DmHeader({ otherUser, userStatuses, onSearch, onAvatarClick }) {
  const initials  = `${otherUser.first_name?.[0] ?? ''}${otherUser.last_name?.[0] ?? ''}`.toUpperCase()
  const status    = userStatuses?.[otherUser.user_id ?? otherUser.id] ?? otherUser.status ?? 'available'
  const statusCfg = STATUSES.find(s => s.value === status) ?? STATUSES[0]

  return (
    <div className="px-7 py-2.5 border-b border-white/[0.04] flex items-center gap-3" style={{ background: 'var(--c-bg)' }}>
      <button
        onClick={onAvatarClick}
        className="relative flex-shrink-0 rounded-full hover:opacity-80 transition"
        title="View profile"
      >
        <div className="w-10 h-10 rounded-full bg-white/[0.05] flex items-center justify-center text-[13px] font-medium text-white/30 overflow-hidden">
          {otherUser.avatar_url
            ? <img src={otherUser.avatar_url} alt="" className="w-full h-full object-cover" />
            : initials
          }
        </div>
        <span
          className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2"
          style={{ background: statusCfg.color, borderColor: 'var(--c-bg)' }}
        />
      </button>
      <div className="flex-1 min-w-0">
        <div className="text-xl font-bold text-white/95 tracking-tight leading-none">
          {otherUser.first_name} {otherUser.last_name}
        </div>
        <div className="text-xs mt-1 flex items-center gap-1.5">
          <span className="text-white/40">@{otherUser.username}</span>
          <span className="text-white/20">·</span>
          <span style={{ color: statusCfg.color + 'bb' }} className="text-[11px]">{statusCfg.label}</span>
        </div>
      </div>
      <button onClick={onSearch}
        className="w-8 h-8 flex items-center justify-center rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.10] transition"
        title="Search in conversation">
        <IconSearch size={15} stroke={1.5} />
      </button>
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
    edited_at:  m.edited_at,
    createdAt:  m.created_at,
    replyTo:    m.reply_to_id ? {
      id:         m.reply_to_id,
      content:    m.reply_content,
      senderName: `${m.reply_first_name ?? ''} ${m.reply_last_name ?? ''}`.trim(),
    } : null,
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
    createdAt:  m.created_at,
  }))
}

export default function ChatWindow({ user, activeConversation, userStatuses = {}, onGroupUpdated, onGroupRemoved }) {
  const { appearance } = useSettings()
  const isLightTheme  = THEMES[appearance?.theme]?.light ?? false
  const chatPattern   = PATTERNS[appearance?.background] ?? PATTERNS.none
  const chatBgImage   = isLightTheme ? chatPattern.light : chatPattern.dark
  const chatBgSize    = chatPattern.size
  const densityClass  = appearance?.density === 'compact' ? 'space-y-0.5' : 'space-y-1'
  const [input, setInput]                     = useState('')
  const [messages, setMessages]               = useState([])
  const [sending, setSending]                 = useState(false)
  const [showAddMember, setShowAddMember]     = useState(false)
  const [showMembers, setShowMembers]         = useState(false)
  const [showSettings, setShowSettings]       = useState(false)
  const [members, setMembers]                 = useState([])
  const [readsPanel, setReadsPanel]           = useState(null)
  const [readsRefreshKey, setReadsRefreshKey] = useState(0)
  const [typers, setTypers]                   = useState([])
  const [replyTo, setReplyTo]                 = useState(null)   // { id, content, senderName }
  const [editingMsg, setEditingMsg]           = useState(null)   // { id, content }
  const [pinnedMsg, setPinnedMsg]             = useState(null)   // { id, content, first_name, last_name }
  const [highlightedMsgId, setHighlightedMsgId] = useState(null)
  const [searchOpen, setSearchOpen]           = useState(false)
  const [searchQuery, setSearchQuery]         = useState('')
  const [searchIdx, setSearchIdx]             = useState(0)
  const [profileUser, setProfileUser]         = useState(null)
  const [hasMore, setHasMore]                 = useState(false)
  const [loadingMore, setLoadingMore]         = useState(false)
  const [showScrollBtn, setShowScrollBtn]     = useState(false)
  const searchInputRef                        = useRef(null)
  const bottomRef                             = useRef(null)
  const topRef                                = useRef(null)
  const scrollContainerRef                    = useRef(null)
  const currentRoomRef                        = useRef(null)
  const typingTimers                          = useRef({})
  const typingTimeoutRef                      = useRef(null)
  const textareaRef                           = useRef(null)
  const msgRefs                               = useRef({})
  const highlightTimer                        = useRef(null)

  const group     = activeConversation?.type === 'group' ? activeConversation.group : null
  const dmConvId  = activeConversation?.type === 'dm'    ? activeConversation.convId : null
  const otherUser = activeConversation?.type === 'dm'    ? activeConversation.otherUser : null
  const isAdmin   = group?.role === 'admin'

  // ─── Socket: messages + member events ────────────────────────
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const handleNewMessage = ({ type, message }) => {
      const isOwn = message.sender_id === user.id
      if (!isOwn) {
        const convKey = type === 'group' ? `group:${message.group_id}` : `dm:${message.conv_id}`
        const isMuted = (() => {
          try { return (JSON.parse(localStorage.getItem('dc_muted') || '[]')).includes(convKey) }
          catch { return false }
        })()
        if (!isMuted) playReceive()
        if (type === 'group' && message.group_id) {
          api.markGroupRead(message.group_id).catch(() => {})
        }
      }
      setMessages(prev => {
        // Deduplicate — message may already be added optimistically via ack
        if (prev.some(m => m.id === message.id)) return prev
        return [...prev, {
          id:          message.id,
          content:     message.content,
          time:        new Date(message.created_at).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' }),
          isOwn,
          senderName:  `${message.first_name} ${message.last_name}`,
          avatar:      `${message.first_name?.[0] ?? ''}${message.last_name?.[0] ?? ''}`.toUpperCase(),
          avatar_url:  message.avatar_url || null,
          edited_at:   null,
          createdAt:   message.created_at,
          replyTo:     message.reply_to_id ? {
            id:         message.reply_to_id,
            content:    message.reply_content,
            senderName: `${message.reply_first_name ?? ''} ${message.reply_last_name ?? ''}`.trim(),
          } : null,
        }]
      })
    }

    const handleMemberAdded = ({ user: newUser, role }) => {
      setMembers(prev => [...prev, { ...newUser, role }])
      setMessages(prev => [...prev, {
        id:      `sys-${Date.now()}`,
        type:    'system',
        content: `${newUser.first_name} ${newUser.last_name} joined the group as ${role}`,
      }])
    }

    const handleMessageEdited = ({ id, content, edited_at }) => {
      setMessages(prev => prev.map(m => m.id === id ? { ...m, content, edited_at } : m))
    }

    const handleMessagePinned = ({ pinned_message }) => {
      setPinnedMsg(pinned_message)
    }

    const handleMessageUnpinned = () => {
      setPinnedMsg(null)
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

    socket.on('message:new',       handleNewMessage)
    socket.on('message:edited',    handleMessageEdited)
    socket.on('message:pinned',    handleMessagePinned)
    socket.on('message:unpinned',  handleMessageUnpinned)
    socket.on('group:member_added', handleMemberAdded)
    socket.on('typing:start',      handleTypingStart)
    socket.on('typing:stop',       handleTypingStop)
    return () => {
      socket.off('message:new',       handleNewMessage)
      socket.off('message:edited',    handleMessageEdited)
      socket.off('message:pinned',    handleMessagePinned)
      socket.off('message:unpinned',  handleMessageUnpinned)
      socket.off('group:member_added', handleMemberAdded)
      socket.off('typing:start',      handleTypingStart)
      socket.off('typing:stop',       handleTypingStop)
    }
  }, [user.id])

  // ─── Socket: group management + read updates ─────────────────
  useEffect(() => {
    const socket = getSocket()
    if (!socket || !group) return

    const handleReadUpdate    = ()               => setReadsRefreshKey(k => k + 1)

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

    const handleRoleChanged = ({ user_id, role, name }) => {
      setMembers(prev => prev.map(m => m.id === user_id ? { ...m, role } : m))
      const displayName = name || 'A member'
      const roleLabel   = role.charAt(0).toUpperCase() + role.slice(1)
      setMessages(prev => [...prev, {
        id:      `sys-role-${Date.now()}`,
        type:    'system',
        content: `${displayName} is now a ${roleLabel}`,
      }])
    }

    socket.on('group:member_removed',      handleMemberRemoved)
    socket.on('group:member_role_changed', handleRoleChanged)
    socket.on('group:read_update',         handleReadUpdate)

    return () => {
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

    // Re-join current room on socket reconnect (room membership is lost on disconnect)
    const handleReconnect = () => {
      if (currentRoomRef.current) {
        const [type, id] = currentRoomRef.current.split(':')
        socket?.emit(type === 'group' ? 'group:join' : 'dm:join', parseInt(id))
      }
    }
    socket?.on('connect', handleReconnect)

    setTypers([])
    setReplyTo(null)
    setEditingMsg(null)
    setInput('')
    setHighlightedMsgId(null)
    clearTimeout(highlightTimer.current)
    msgRefs.current = {}

    if (!activeConversation) {
      setMessages([])
      setMembers([])
      setShowMembers(false)
      setShowSettings(false)
      setReadsPanel(null)
      setPinnedMsg(null)
      return
    }

    if (group) {
      if (socket) {
        socket.emit('group:join', group.id)
        currentRoomRef.current = `group:${group.id}`
      }
      api.markGroupRead(group.id).catch(() => {})
      api.getGroupMessages(group.id)
        .then(({ messages, pinned_message, has_more }) => {
          setMessages(formatGroupMessages(messages, user.id))
          setPinnedMsg(pinned_message || null)
          setHasMore(has_more || false)
        })
        .catch(() => { setMessages([]); setPinnedMsg(null); setHasMore(false) })
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
      setPinnedMsg(null)
      api.markDmRead(dmConvId).catch(() => {})
      api.getDmMessages(dmConvId)
        .then(({ messages, has_more, pinned_message }) => {
          setMessages(formatDmMessages(messages, user.id))
          setHasMore(has_more || false)
          setPinnedMsg(pinned_message || null)
        })
        .catch(() => { setMessages([]); setHasMore(false); setPinnedMsg(null) })
    }

    return () => {
      socket?.off('connect', handleReconnect)
      if (currentRoomRef.current && socket) {
        const [type, id] = currentRoomRef.current.split(':')
        socket.emit(type === 'group' ? 'group:leave' : 'dm:leave', parseInt(id))
        currentRoomRef.current = null
      }
    }
  }, [activeConversation, group?.id, dmConvId, user.id])

  useEffect(() => {
    const el = scrollContainerRef.current
    if (!el) return
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    // Auto-scroll only if user is already near the bottom (within 200px)
    if (distFromBottom < 200) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
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

  const scrollToMessage = (id) => {
    const el = msgRefs.current[id]
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    clearTimeout(highlightTimer.current)
    setHighlightedMsgId(id)
    highlightTimer.current = setTimeout(() => setHighlightedMsgId(null), 1600)
  }

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Show scroll-to-bottom button when scrolled up more than 300px
  useEffect(() => {
    const el = scrollContainerRef.current
    if (!el) return
    const onScroll = () => {
      const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
      setShowScrollBtn(distFromBottom > 225)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [activeConversation])

  const loadMore = async () => {
    if (loadingMore || !hasMore || !messages.length) return
    const firstId = messages[0]?.id
    if (!firstId || typeof firstId !== 'number') return
    setLoadingMore(true)
    try {
      if (group) {
        const { messages: older, has_more } = await api.getGroupMessages(group.id, firstId)
        setMessages(prev => [...formatGroupMessages(older, user.id), ...prev])
        setHasMore(has_more || false)
      } else if (dmConvId) {
        const { messages: older, has_more } = await api.getDmMessages(dmConvId, firstId)
        setMessages(prev => [...formatDmMessages(older, user.id), ...prev])
        setHasMore(has_more || false)
      }
      // Keep scroll position — don't jump to bottom
      topRef.current?.scrollIntoView({ block: 'start' })
    } catch {}
    setLoadingMore(false)
  }

  // ─── Search ───────────────────────────────────────────────────
  const searchResults = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return []
    const q = searchQuery.toLowerCase()
    return messages
      .filter(m => m.type !== 'system' && m.content?.toLowerCase().includes(q))
      .map(m => m.id)
  }, [searchQuery, messages])

  // Scroll to match when idx or results change
  useEffect(() => {
    if (!searchResults.length) return
    const id = searchResults[searchIdx] ?? searchResults[0]
    const el = msgRefs.current[id]
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [searchIdx, searchResults])

  // Focus input when search opens
  useEffect(() => {
    if (searchOpen) setTimeout(() => searchInputRef.current?.focus(), 50)
    else { setSearchQuery(''); setSearchIdx(0) }
  }, [searchOpen])

  // Reset search when conversation changes
  useEffect(() => { setSearchOpen(false); setSearchQuery(''); setSearchIdx(0) }, [activeConversation])

  // Ctrl+F shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f' && activeConversation) {
        e.preventDefault()
        setSearchOpen(v => !v)
      }
      if (e.key === 'Escape' && searchOpen) setSearchOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [activeConversation, searchOpen])

  // ─── Profile popup ────────────────────────────────────────────
  const handleAvatarClick = useCallback((e, msg) => {
    setProfileUser({
      name:        msg.senderName,
      initials:    msg.avatar,
      avatar_url:  msg.avatar_url || null,
      username:    null,
      statusLabel: null,
      statusColor: null,
      unique_code: null,
    })
  }, [])

  const handleDmAvatarClick = useCallback(() => {
    if (!otherUser) return
    const statusCfg = STATUSES.find(s => s.value === (userStatuses?.[otherUser.user_id ?? otherUser.id] ?? otherUser.status ?? 'available')) ?? STATUSES[0]
    setProfileUser({
      name:        `${otherUser.first_name} ${otherUser.last_name}`,
      initials:    `${otherUser.first_name?.[0] ?? ''}${otherUser.last_name?.[0] ?? ''}`.toUpperCase(),
      avatar_url:  otherUser.avatar_url || null,
      username:    otherUser.username,
      statusLabel: statusCfg.label,
      statusColor: statusCfg.color,
      unique_code: otherUser.unique_code || null,
    })
  }, [otherUser, userStatuses])

  const handleReply = (msg) => {
    setReplyTo({ id: msg.id, content: msg.content, senderName: msg.senderName })
    setEditingMsg(null)
    setInput('')
    setTimeout(() => textareaRef.current?.focus(), 0)
  }

  const handleEdit = (msg) => {
    setEditingMsg({ id: msg.id })
    setReplyTo(null)
    setInput(msg.content)
    setTimeout(() => textareaRef.current?.focus(), 0)
  }

  const handlePin = async (msg) => {
    try {
      if (group) {
        if (pinnedMsg?.id === msg.id) await api.unpinMessage(group.id)
        else await api.pinMessage(group.id, msg.id)
      } else if (dmConvId) {
        if (pinnedMsg?.id === msg.id) await api.unpinDmMessage(dmConvId)
        else await api.pinDmMessage(dmConvId, msg.id)
      }
    } catch {}
  }

  const cancelCompose = () => {
    setReplyTo(null)
    setEditingMsg(null)
    setInput('')
  }

  const handleSend = () => {
    // Edit mode
    if (editingMsg) {
      const content = input.trim()
      if (!content) return
      api.editGroupMessage(editingMsg.id, content)
        .then(() => {
          setEditingMsg(null)
          setInput('')
        })
        .catch(() => {})
      return
    }

    if (!input.trim() || sending) return
    const content        = input.trim()
    const currentReplyTo = replyTo
    const socket         = getSocket()
    setInput('')
    setReplyTo(null)
    setSending(true)

    if (socket?.connected) {
      const event   = group ? 'group:message' : 'dm:message'
      const payload = group
        ? { group_id: group.id, content, reply_to_id: currentReplyTo?.id }
        : { conv_id: dmConvId, content }

      socket.emit(event, payload, (ack) => {
        if (ack?.error) {
          setInput(content)
          setReplyTo(currentReplyTo)
        } else {
          // Add message immediately from ack payload (handles reconnect case
          // where the socket echo may not arrive if room join was lost)
          if (ack?.message) {
            const msg = ack.message
            setMessages(prev => {
              if (prev.some(m => m.id === msg.id)) return prev
              return [...prev, {
                id:        msg.id,
                content:   msg.content,
                time:      new Date(msg.created_at).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' }),
                isOwn:     true,
                senderName: `${user.first_name} ${user.last_name}`,
                avatar:    `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase(),
                edited_at: null,
                createdAt: msg.created_at,
                replyTo:   msg.reply_to_id ? {
                  id:         msg.reply_to_id,
                  content:    msg.reply_content,
                  senderName: `${msg.reply_first_name ?? ''} ${msg.reply_last_name ?? ''}`.trim(),
                } : null,
              }]
            })
          }
        }
        setSending(false)
      })
    } else {
      const req = group
        ? api.sendGroupMessage(group.id, content)
        : api.sendDmMessage(dmConvId, content)

      req.then(({ message: msg }) => {
        setMessages(prev => [...prev, {
          id:        msg.id,
          content:   msg.content,
          time:      new Date(msg.created_at).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' }),
          isOwn:     true,
          senderName: `${user.first_name} ${user.last_name}`,
          avatar:    `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase(),
          edited_at: null,
          createdAt: msg.created_at,
          replyTo:   null,
        }])
      }).catch(() => { setInput(content); setReplyTo(currentReplyTo) })
       .finally(() => setSending(false))
    }
  }

  const handleInputChange = (e) => {
    setInput(e.target.value)
    const socket = getSocket()
    const room   = group ? `group:${group.id}` : dmConvId ? `dm:${dmConvId}` : null
    if (!socket || !room || editingMsg) return
    socket.emit('typing:start', { room })
    clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing:stop', { room })
    }, 2000)
  }

  const handleKey = (e) => {
    if (e.key === 'Escape') { cancelCompose(); return }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  if (!activeConversation) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: 'var(--c-bg)' }}>
        <div className="text-center">
          <span className="text-white/10 inline-block mb-3"><IconMessage size={28} stroke={1} /></span>
          <p className="text-xs text-white/30">Select a group or conversation</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 relative" style={{ background: 'var(--c-bg)' }}>

      {group
        ? <GroupHeader
            group={group}
            memberCount={members.length || null}
            isAdmin={isAdmin}
            onToggleMembers={() => setShowMembers(v => !v)}
            onAddMember={() => setShowAddMember(true)}
            onSettings={() => setShowSettings(true)}
            onSearch={() => setSearchOpen(v => !v)}
          />
        : <DmHeader
            otherUser={otherUser}
            userStatuses={userStatuses}
            onSearch={() => setSearchOpen(v => !v)}
            onAvatarClick={handleDmAvatarClick}
          />
      }

      {/* Search bar */}
      {searchOpen && (
        <div className="px-4 py-2 flex items-center gap-2 border-b border-white/[0.04] flex-shrink-0" style={{ background: 'var(--c-bg)' }}>
          <IconSearch size={12} color="rgba(255,255,255,0.25)" />
          <input
            ref={searchInputRef}
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setSearchIdx(0) }}
            onKeyDown={e => {
              if (e.key === 'Escape') setSearchOpen(false)
              if (e.key === 'Enter') {
                e.preventDefault()
                if (!searchResults.length) return
                setSearchIdx(i => e.shiftKey
                  ? (i - 1 + searchResults.length) % searchResults.length
                  : (i + 1) % searchResults.length
                )
              }
            }}
            placeholder="Search in conversation..."
            className="flex-1 bg-transparent text-xs text-white/70 placeholder-white/20 outline-none"
          />
          {searchQuery.length >= 2 && (
            <span className="text-[10px] text-white/30 whitespace-nowrap flex-shrink-0">
              {searchResults.length > 0 ? `${searchIdx + 1} of ${searchResults.length}` : 'No results'}
            </span>
          )}
          {searchResults.length > 1 && (
            <>
              <button onClick={() => setSearchIdx(i => (i - 1 + searchResults.length) % searchResults.length)}
                className="text-white/30 hover:text-white/60 transition p-0.5">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="18 15 12 9 6 15"/></svg>
              </button>
              <button onClick={() => setSearchIdx(i => (i + 1) % searchResults.length)}
                className="text-white/30 hover:text-white/60 transition p-0.5">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
            </>
          )}
          <button onClick={() => setSearchOpen(false)} className="text-white/20 hover:text-white/50 transition">
            <IconX size={11} />
          </button>
        </div>
      )}

      {/* Pinned message banner */}
      {pinnedMsg && (group || dmConvId) && (
        <div className="px-6 py-2 border-b border-white/[0.04] bg-white/[0.01] flex items-center gap-2.5">
          <IconPin size={11} stroke={1.4} color="rgba(251,191,36,0.45)" />
          <button
            onClick={() => {
              if (msgRefs.current[pinnedMsg.id]) {
                scrollToMessage(pinnedMsg.id)
              } else {
                topRef.current?.scrollIntoView({ behavior: 'smooth' })
              }
            }}
            className="flex-1 min-w-0 text-left hover:opacity-75 transition-opacity"
          >
            <div className="text-[10px] text-white/25 mb-0.5">
              Pinned · {pinnedMsg.first_name} {pinnedMsg.last_name}
            </div>
            <div className="text-[11px] text-white/50 truncate">{pinnedMsg.content}</div>
          </button>
          <button
            onClick={() => group
              ? api.unpinMessage(group.id).catch(() => {})
              : api.unpinDmMessage(dmConvId).catch(() => {})
            }
            className="text-white/15 hover:text-white/40 transition flex-shrink-0 ml-1"
            title="Unpin"
          >
            <IconX size={11} />
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="relative flex-1 min-h-0">
      <div
        ref={scrollContainerRef}
        className={`h-full overflow-y-auto px-7 py-6 ${densityClass}`}
        style={{ backgroundImage: chatBgImage, backgroundSize: chatBgSize, fontSize: 'var(--c-font-size)' }}
      >
        {hasMore && (
          <div className="flex justify-center mb-4" ref={topRef}>
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="text-xs text-white/40 hover:text-white/70 px-4 py-1.5 rounded-full border border-white/[0.08] hover:bg-white/[0.06] transition disabled:opacity-40"
            >
              {loadingMore ? 'Loading...' : 'Load older messages'}
            </button>
          </div>
        )}
        {!hasMore && <div ref={topRef} />}
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
              isGroup={!!group}
              pinnedMsgId={pinnedMsg?.id}
              highlighted={highlightedMsgId === msg.id}
              highlight={searchQuery.length >= 2 ? searchQuery : ''}
              onRef={el => { if (el) msgRefs.current[msg.id] = el; else delete msgRefs.current[msg.id] }}
              onScrollTo={scrollToMessage}
              onAvatarClick={handleAvatarClick}
              onOpenReads={group && msg.isOwn && msg.id && typeof msg.id === 'number'
                ? (id) => setReadsPanel(id)
                : undefined
              }
              onReply={handleReply}
              onEdit={handleEdit}
              onPin={handlePin}
            />
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Scroll to bottom button */}
      {showScrollBtn && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-4 right-5 z-20 w-8 h-8 flex items-center justify-center rounded-full border border-white/[0.12] bg-[var(--c-surface3)] shadow-lg transition-all hover:border-white/25 hover:scale-105"
          title="Scroll to bottom"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-white/55">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <polyline points="19 12 12 19 5 12"/>
          </svg>
        </button>
      )}
      </div>

      {/* Typing indicator */}
      {typers.length > 0 && (
        <div className="px-7 pb-2 flex items-center gap-2.5">
          <div className="flex gap-[4px] items-center">
            <span className="w-2 h-2 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span className="text-xs text-white/45">
            {typers.length === 1
              ? `${typers[0].username} is typing...`
              : `${typers.map(t => t.username).join(', ')} are typing...`}
          </span>
        </div>
      )}

      {/* Reply / edit strip */}
      {(replyTo || editingMsg) && (
        <div className="px-5 pt-2">
          <div className="flex items-center justify-between bg-white/[0.03] border border-white/[0.05] rounded-xl px-3.5 py-2">
            <div className="flex items-center gap-2 min-w-0">
              {replyTo ? (
                <>
                  <IconReply size={12} stroke={1.5} color="rgba(255,255,255,0.25)" />
                  <div className="min-w-0">
                    <div className="text-[10px] text-white/35">{replyTo.senderName}</div>
                    <div className="text-[11px] text-white/25 truncate">{replyTo.content}</div>
                  </div>
                </>
              ) : (
                <>
                  <IconPencil size={12} stroke={1.5} color="rgba(255,255,255,0.25)" />
                  <span className="text-[11px] text-white/30">Editing message</span>
                </>
              )}
            </div>
            <button
              onClick={cancelCompose}
              className="text-white/20 hover:text-white/50 transition flex-shrink-0 ml-3"
              title="Cancel"
            >
              <IconX size={11} />
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-5 pb-5 pt-2">
        <div className="flex items-end gap-2 bg-white/[0.05] border border-white/[0.10] rounded-2xl px-4 py-2.5 focus-within:border-white/20 transition-all">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKey}
            placeholder={editingMsg ? 'Edit message...' : 'Message...'}
            rows={1}
            className="flex-1 bg-transparent text-sm text-white/90 placeholder-white/40 focus:outline-none resize-none py-1 min-h-[22px] max-h-[100px]"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="p-1 rounded-lg transition flex-shrink-0 mb-0.5 text-white/45 hover:text-white/80 disabled:opacity-25"
          >
            <IconSend size={15} />
          </button>
        </div>
      </div>

      {showMembers && group && (
        <MembersPanel
          members={members}
          isAdmin={isAdmin}
          currentUserId={user.id}
          userStatuses={userStatuses}
          onAddMember={() => { setShowMembers(false); setShowAddMember(true) }}
          onClose={() => setShowMembers(false)}
          onChangeRole={handleChangeRole}
          onRemoveMember={handleRemoveMember}
        />
      )}

      {showAddMember && group && (
        <AddMemberModal
          groupId={group.id}
          currentMembers={members}
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

      {profileUser && (
        <ProfilePopup profile={profileUser} onClose={() => setProfileUser(null)} />
      )}
    </div>
  )
}
