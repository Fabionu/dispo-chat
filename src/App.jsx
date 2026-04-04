import { useState, useEffect, useRef } from 'react'
import Sidebar from './components/Sidebar.jsx'
import ChatWindow from './components/ChatWindow.jsx'
import AuthPage from './components/AuthPage.jsx'
import { api } from './services/api.js'
import { connectSocket, disconnectSocket, getSocket } from './services/socket.js'
import { SettingsProvider } from './contexts/SettingsContext.jsx'

function updateFavicon(count) {
  const canvas = document.createElement('canvas')
  canvas.width = 32; canvas.height = 32
  const ctx = canvas.getContext('2d')

  // Base icon — chat bubble
  ctx.fillStyle = '#818cf8'
  ctx.beginPath(); ctx.roundRect(0, 0, 32, 32, 7); ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.beginPath(); ctx.roundRect(5, 5, 22, 16, 4); ctx.fill()
  ctx.fillStyle = '#818cf8'
  ctx.beginPath(); ctx.moveTo(8, 21); ctx.lineTo(13, 27); ctx.lineTo(18, 21); ctx.closePath(); ctx.fill()

  if (count > 0) {
    const label = count > 99 ? '99+' : String(count)
    const bx = label.length > 1 ? 22 : 23, by = 9, br = label.length > 2 ? 9 : 7
    ctx.fillStyle = '#ef4444'
    ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.font = `bold ${label.length > 2 ? 7 : 9}px sans-serif`
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(label, bx, by)
  }

  let link = document.querySelector("link[rel~='icon']")
  if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link) }
  link.href = canvas.toDataURL()
}

export default function App() {
  const [user, setUser]                             = useState(null)
  const [groups, setGroups]                         = useState([])
  const [activeConversation, setActiveConversation] = useState(null)
  const [unreads, setUnreads]                       = useState({})
  const [loading, setLoading]                       = useState(true)
  const [userStatuses, setUserStatuses]             = useState({}) // { [userId]: status }
  const activeConvRef                               = useRef(null)

  useEffect(() => { activeConvRef.current = activeConversation }, [activeConversation])

  // ─── Favicon badge + document title ──────────────────────────
  useEffect(() => {
    const total = Object.values(unreads).reduce((s, n) => s + n, 0)
    updateFavicon(total)
    document.title = total > 0 ? `(${total}) Dispo Chat` : 'Dispo Chat'
  }, [unreads])

  // ─── Socket: sidebar live updates + unread + status ────────────
  useEffect(() => {
    if (!user) return
    const socket = getSocket()
    if (!socket) return

    const handleMessage = ({ type, message }) => {
      // Update sidebar last_message for the active conversation's room
      if (type === 'group') {
        setGroups(prev => {
          const updated = prev.map(g =>
            g.id === message.group_id
              ? { ...g, last_message: message.content, last_message_at: message.created_at }
              : g
          )
          return updated.sort((a, b) => {
            if (!a.last_message_at) return 1
            if (!b.last_message_at) return -1
            return new Date(b.last_message_at) - new Date(a.last_message_at)
          })
        })
      }
    }

    // Received via personal room (user:{id}) for messages in other conversations
    const handleUnread = ({ type, message }) => {
      const conv = activeConvRef.current

      if (type === 'group') {
        setGroups(prev => {
          const updated = prev.map(g =>
            g.id === message.group_id
              ? { ...g, last_message: message.content, last_message_at: message.created_at }
              : g
          )
          return updated.sort((a, b) => {
            if (!a.last_message_at) return 1
            if (!b.last_message_at) return -1
            return new Date(b.last_message_at) - new Date(a.last_message_at)
          })
        })
        const isActive = conv?.type === 'group' && conv.group.id === message.group_id
        if (!isActive) {
          setUnreads(prev => ({
            ...prev,
            [`group:${message.group_id}`]: (prev[`group:${message.group_id}`] || 0) + 1,
          }))
        }
      }

      if (type === 'dm') {
        const isActive = conv?.type === 'dm' && conv.convId === message.conv_id
        if (!isActive) {
          setUnreads(prev => ({
            ...prev,
            [`dm:${message.conv_id}`]: (prev[`dm:${message.conv_id}`] || 0) + 1,
          }))
        }
      }
    }

    const handleStatusChanged = ({ user_id, status }) => {
      setUserStatuses(prev => ({ ...prev, [user_id]: status }))
      if (user_id === user?.id) setUser(prev => ({ ...prev, status }))
    }

    const handleGroupUpdatedSocket = (updatedGroup) => handleGroupUpdated(updatedGroup)
    const handleGroupDeletedSocket = ({ group_id }) => handleGroupRemoved(group_id)

    socket.on('message:new',        handleMessage)
    socket.on('unread:new',         handleUnread)
    socket.on('user:status_changed', handleStatusChanged)
    socket.on('group:updated',       handleGroupUpdatedSocket)
    socket.on('group:deleted',       handleGroupDeletedSocket)
    return () => {
      socket.off('message:new',        handleMessage)
      socket.off('unread:new',         handleUnread)
      socket.off('user:status_changed', handleStatusChanged)
      socket.off('group:updated',       handleGroupUpdatedSocket)
      socket.off('group:deleted',       handleGroupDeletedSocket)
    }
  }, [user])

  const handleSelectConversation = (conv) => {
    setActiveConversation(conv)
    if (!conv) return
    const key = conv.type === 'group' ? `group:${conv.group.id}` : `dm:${conv.convId}`
    setUnreads(prev => ({ ...prev, [key]: 0 }))
  }

  useEffect(() => {
    const token = localStorage.getItem('dc_token') || sessionStorage.getItem('dc_token')
    if (!token) { setLoading(false); return }

    connectSocket(token)
    api.bootstrap()
      .then(({ user: me, groups, unreads }) => {
        setUser(me)
        setGroups(groups)
        setUnreads(unreads)
      })
      .catch(() => {
        localStorage.removeItem('dc_token')
        sessionStorage.removeItem('dc_token')
        disconnectSocket()
      })
      .finally(() => setLoading(false))
  }, [])

  const handleLogin = async (user, token, rememberMe = true) => {
    if (rememberMe) localStorage.setItem('dc_token', token)
    else sessionStorage.setItem('dc_token', token)
    connectSocket(token)
    setUser(user)
    const { groups, unreads } = await api.bootstrap().catch(() => ({ groups: [], unreads: {} }))
    setGroups(groups)
    setUnreads(unreads)
  }

  const handleLogout = async () => {
    try { await api.updateProfile({ status: 'offline' }) } catch {}
    // Disconnect socket — the server's disconnect handler will broadcast offline to everyone
    disconnectSocket()
    localStorage.removeItem('dc_token')
    sessionStorage.removeItem('dc_token')
    setUser(null)
    setGroups([])
    setActiveConversation(null)
    setUnreads({})
    setUserStatuses({})
  }

  const handleGroupCreated = (group) => setGroups(prev => [group, ...prev])

  const handleGroupUpdated = (updatedGroup) => {
    setGroups(prev => prev.map(g => g.id === updatedGroup.id ? { ...g, ...updatedGroup } : g))
    setActiveConversation(prev =>
      prev?.type === 'group' && prev.group.id === updatedGroup.id
        ? { ...prev, group: { ...prev.group, ...updatedGroup } }
        : prev
    )
  }

  const handleGroupRemoved = (groupId) => {
    setGroups(prev => prev.filter(g => g.id !== groupId))
    setActiveConversation(prev =>
      prev?.type === 'group' && prev.group.id === groupId ? null : prev
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--c-bg)' }}>
        <div className="w-5 h-5 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return <AuthPage onLogin={handleLogin} />

  return (
    <SettingsProvider user={user} onUserUpdate={setUser}>
      <div className="flex h-screen overflow-hidden" style={{ background: 'var(--c-bg)' }}>
        <Sidebar
          user={user}
          groups={groups}
          unreads={unreads}
          userStatuses={userStatuses}
          activeConversation={activeConversation}
          onSelectConversation={handleSelectConversation}
          onGroupCreated={handleGroupCreated}
          onLogout={handleLogout}
          onMarkAllRead={() => setUnreads({})}
          onMarkRead={(key) => setUnreads(prev => ({ ...prev, [key]: 0 }))}
          onMarkUnread={(key) => setUnreads(prev => ({ ...prev, [key]: 1 }))}
        />
        <ChatWindow
          user={user}
          activeConversation={activeConversation}
          userStatuses={userStatuses}
          onGroupUpdated={handleGroupUpdated}
          onGroupRemoved={handleGroupRemoved}
        />
      </div>
    </SettingsProvider>
  )
}
