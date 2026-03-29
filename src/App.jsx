import { useState, useEffect, useRef } from 'react'
import Sidebar from './components/Sidebar.jsx'
import ChatWindow from './components/ChatWindow.jsx'
import AuthPage from './components/AuthPage.jsx'
import { api } from './services/api.js'
import { connectSocket, disconnectSocket, getSocket } from './services/socket.js'

export default function App() {
  const [user, setUser]                             = useState(null)
  const [groups, setGroups]                         = useState([])
  const [activeConversation, setActiveConversation] = useState(null)
  const [unreads, setUnreads]                       = useState({})
  // { 'group:1': 3, 'dm:5': 1, ... }
  const [loading, setLoading]                       = useState(true)
  const activeConvRef                               = useRef(null)

  // Keep ref in sync so socket handler always has latest value
  useEffect(() => { activeConvRef.current = activeConversation }, [activeConversation])

  // ─── Socket: sidebar live updates + unread tracking ────────────
  useEffect(() => {
    if (!user) return
    const socket = getSocket()
    if (!socket) return

    const handleMessage = ({ type, message }) => {
      const conv = activeConvRef.current

      if (type === 'group') {
        // Update last_message preview in sidebar
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

        // Increment unread if not active conversation & not own message
        const isActive = conv?.type === 'group' && conv.group.id === message.group_id
        if (!isActive && message.sender_id !== user.id) {
          setUnreads(prev => ({
            ...prev,
            [`group:${message.group_id}`]: (prev[`group:${message.group_id}`] || 0) + 1,
          }))
        }
      }

      if (type === 'dm') {
        const isActive = conv?.type === 'dm' && conv.convId === message.conv_id
        if (!isActive && message.sender_id !== user.id) {
          setUnreads(prev => ({
            ...prev,
            [`dm:${message.conv_id}`]: (prev[`dm:${message.conv_id}`] || 0) + 1,
          }))
        }
      }
    }

    const handleGroupUpdatedSocket = (updatedGroup) => handleGroupUpdated(updatedGroup)
    const handleGroupDeletedSocket = ({ group_id }) => handleGroupRemoved(group_id)

    socket.on('message:new',   handleMessage)
    socket.on('group:updated', handleGroupUpdatedSocket)
    socket.on('group:deleted', handleGroupDeletedSocket)
    return () => {
      socket.off('message:new',   handleMessage)
      socket.off('group:updated', handleGroupUpdatedSocket)
      socket.off('group:deleted', handleGroupDeletedSocket)
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
    api.me()
      .then(async ({ user: me }) => {
        const { groups } = await api.getGroups()
        setUser(me)
        setGroups(groups)
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
    const { groups } = await api.getGroups()
    setGroups(groups)
  }

  const handleLogout = () => {
    disconnectSocket()
    localStorage.removeItem('dc_token')
    sessionStorage.removeItem('dc_token')
    setUser(null)
    setGroups([])
    setActiveConversation(null)
    setUnreads({})
  }

  const handleGroupCreated = (group) => {
    setGroups(prev => [group, ...prev])
  }

  const handleGroupUpdated = (updatedGroup) => {
    setGroups(prev => prev.map(g =>
      g.id === updatedGroup.id ? { ...g, ...updatedGroup } : g
    ))
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
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return <AuthPage onLogin={handleLogin} />

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0a0f]">
      <Sidebar
        user={user}
        groups={groups}
        unreads={unreads}
        activeConversation={activeConversation}
        onSelectConversation={handleSelectConversation}
        onGroupCreated={handleGroupCreated}
        onLogout={handleLogout}
      />
      <ChatWindow
        user={user}
        activeConversation={activeConversation}
        onGroupUpdated={handleGroupUpdated}
        onGroupRemoved={handleGroupRemoved}
      />
    </div>
  )
}
