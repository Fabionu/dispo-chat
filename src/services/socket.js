import { io } from 'socket.io-client'

const SOCKET_URL = 'http://localhost:3005'

let socket = null

export function connectSocket(token) {
  if (socket?.connected) return socket

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  })

  socket.on('connect',       () => console.log('✓ Socket connected'))
  socket.on('disconnect',    () => console.log('Socket disconnected'))
  socket.on('connect_error', (err) => console.warn('Socket error:', err.message))

  return socket
}

export function getSocket() {
  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
