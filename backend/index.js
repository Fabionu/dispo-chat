import 'dotenv/config'
import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { existsSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))

import authRoutes     from './routes/auth.js'
import groupRoutes    from './routes/groups.js'
import tripRoutes     from './routes/trips.js'
import messageRoutes  from './routes/messages.js'
import dmRoutes            from './routes/dm.js'
import groupMessageRoutes  from './routes/groupMessages.js'
import usersRoutes         from './routes/users.js'
import { registerSocketHandlers } from './socket/handlers.js'
import { apiLimiter, authLimiter } from './middleware/rateLimiter.js'

const app    = express()
const server = createServer(app)

const CORS_ORIGIN = (origin, cb) => {
  // Allow: no origin (server-to-server), localhost, or same Railway domain
  if (!origin) return cb(null, true)
  if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return cb(null, true)
  if (process.env.RAILWAY_PUBLIC_DOMAIN && origin.includes(process.env.RAILWAY_PUBLIC_DOMAIN)) return cb(null, true)
  if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) return cb(null, true)
  // In production, same-origin requests have origin = the app domain — allow all .railway.app
  if (origin.endsWith('.railway.app')) return cb(null, true)
  cb(null, false)
}

const io     = new Server(server, {
  cors: { origin: CORS_ORIGIN, credentials: true },
})

app.use(cors({ origin: CORS_ORIGIN, credentials: true }))
app.use(express.json())
app.use((req, _, next) => { req.io = io; next() })

// Routes
app.use('/api/auth',     authLimiter, authRoutes)
app.use('/api/groups',   apiLimiter, groupRoutes)
app.use('/api/trips',    apiLimiter, tripRoutes)
app.use('/api/messages', apiLimiter, messageRoutes)
app.use('/api/dm',             apiLimiter, dmRoutes)
app.use('/api/group-messages', apiLimiter, groupMessageRoutes)
app.use('/api/users',          apiLimiter, usersRoutes)

// Health check
app.get('/api/health', (_, res) => res.json({ ok: true }))

// Serve frontend in production
const distPath = join(__dirname, '../dist')
if (existsSync(distPath)) {
  app.use(express.static(distPath))
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) return next()
    res.sendFile(join(distPath, 'index.html'))
  })
}

registerSocketHandlers(io)

const PORT = process.env.PORT || 3001
server.listen(PORT, () => {
  console.log(`✓ Server running on http://localhost:${PORT}`)
})
