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
import pool from './db/pool.js'

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

app.set('trust proxy', 1)
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

// ─── Auto-migrations (idempotent) ────────────────────────────
async function runMigrations() {
  try {
    // Create cursor tables first (other migrations may depend on their existence indirectly)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS dm_read_cursors (
        conv_id      INT         NOT NULL REFERENCES dm_conversations(id) ON DELETE CASCADE,
        user_id      INT         NOT NULL REFERENCES users(id)            ON DELETE CASCADE,
        last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (conv_id, user_id)
      );
      CREATE TABLE IF NOT EXISTS group_read_cursors (
        group_id     INT         NOT NULL REFERENCES groups(id)           ON DELETE CASCADE,
        user_id      INT         NOT NULL REFERENCES users(id)            ON DELETE CASCADE,
        last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (group_id, user_id)
      );
    `)

    await pool.query(`
      ALTER TABLE group_messages    ADD COLUMN IF NOT EXISTS deleted      BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE group_messages    ADD COLUMN IF NOT EXISTS deleted_for  JSONB   NOT NULL DEFAULT '[]'::jsonb;
      ALTER TABLE dm_messages       ADD COLUMN IF NOT EXISTS deleted      BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE dm_messages       ADD COLUMN IF NOT EXISTS deleted_for  JSONB   NOT NULL DEFAULT '[]'::jsonb;
      ALTER TABLE groups            ADD COLUMN IF NOT EXISTS pinned_message_id INT REFERENCES group_messages(id) ON DELETE SET NULL;
      ALTER TABLE dm_conversations  ADD COLUMN IF NOT EXISTS pinned_message_id INT REFERENCES dm_messages(id)   ON DELETE SET NULL;
      ALTER TABLE users             ADD COLUMN IF NOT EXISTS preferences  JSONB   NOT NULL DEFAULT '{}'::jsonb;
    `)

    // GIN indexes for JSONB @> containment queries on deleted_for
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_dm_messages_deleted_for    ON dm_messages    USING GIN (deleted_for);
      CREATE INDEX IF NOT EXISTS idx_group_messages_deleted_for ON group_messages USING GIN (deleted_for);
    `)
    console.log('✓ Migrations OK')
  } catch (err) {
    console.error('Migration error:', err.message)
  }
}

const PORT = process.env.PORT || 3001
server.listen(PORT, async () => {
  console.log(`✓ Server running on http://localhost:${PORT}`)
  await runMigrations()
})
