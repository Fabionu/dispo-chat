import 'dotenv/config'
import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'

import authRoutes     from './routes/auth.js'
import groupRoutes    from './routes/groups.js'
import tripRoutes     from './routes/trips.js'
import messageRoutes  from './routes/messages.js'
import dmRoutes            from './routes/dm.js'
import groupMessageRoutes  from './routes/groupMessages.js'
import usersRoutes         from './routes/users.js'
import { registerSocketHandlers } from './socket/handlers.js'

const app    = express()
const server = createServer(app)

const CORS_ORIGIN = (origin, cb) => {
  if (!origin) return cb(null, true)                        // server-to-server
  if (/^http:\/\/localhost(:\d+)?$/.test(origin)) return cb(null, true)
  const allowed = process.env.FRONTEND_URL
  if (allowed && origin === allowed) return cb(null, true)
  cb(new Error('Not allowed by CORS'))
}

const io     = new Server(server, {
  cors: { origin: CORS_ORIGIN, credentials: true },
})

app.use(cors({ origin: CORS_ORIGIN, credentials: true }))
app.use(express.json())
app.use((req, _, next) => { req.io = io; next() })

// Routes
app.use('/api/auth',     authRoutes)
app.use('/api/groups',   groupRoutes)
app.use('/api/trips',    tripRoutes)
app.use('/api/messages', messageRoutes)
app.use('/api/dm',             dmRoutes)
app.use('/api/group-messages', groupMessageRoutes)
app.use('/api/users',          usersRoutes)

// Health check
app.get('/api/health', (_, res) => res.json({ ok: true }))

registerSocketHandlers(io)

const PORT = process.env.PORT || 3001
server.listen(PORT, () => {
  console.log(`✓ Server running on http://localhost:${PORT}`)
})
