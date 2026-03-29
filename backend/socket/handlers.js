import jwt from 'jsonwebtoken'
import pool from '../db/pool.js'

export function registerSocketHandlers(io) {

  // JWT auth middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token
    if (!token) return next(new Error('Unauthorized'))
    try {
      socket.user = jwt.verify(token, process.env.JWT_SECRET)
      next()
    } catch {
      next(new Error('Invalid token'))
    }
  })

  io.on('connection', (socket) => {
    console.log(`Socket connected: user ${socket.user.id}`)

    // ─── Group rooms ─────────────────────────────────────────────
    socket.on('group:join',  (groupId) => socket.join(`group:${groupId}`))
    socket.on('group:leave', (groupId) => socket.leave(`group:${groupId}`))

    socket.on('group:message', async ({ group_id, content }, ack) => {
      if (!group_id || !content?.trim()) return ack?.({ error: 'Invalid data' })

      try {
        // Verify membership
        const { rows: access } = await pool.query(
          'SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2',
          [group_id, socket.user.id]
        )
        if (!access.length) return ack?.({ error: 'Access denied' })

        // Save to DB
        const { rows } = await pool.query(
          `INSERT INTO group_messages (group_id, sender_id, content)
           VALUES ($1, $2, $3)
           RETURNING id, group_id, content, created_at`,
          [group_id, socket.user.id, content.trim()]
        )
        const msg = rows[0]

        // Get sender info
        const { rows: users } = await pool.query(
          'SELECT id, first_name, last_name, username FROM users WHERE id = $1',
          [socket.user.id]
        )
        const sender = users[0]

        const payload = {
          id:         msg.id,
          group_id:   msg.group_id,
          content:    msg.content,
          created_at: msg.created_at,
          sender_id:  sender.id,
          first_name: sender.first_name,
          last_name:  sender.last_name,
          username:   sender.username,
        }

        // Broadcast to all in room (including sender)
        io.to(`group:${group_id}`).emit('message:new', { type: 'group', message: payload })
        ack?.({ ok: true })
      } catch (err) {
        console.error(err)
        ack?.({ error: 'Server error' })
      }
    })

    // ─── DM rooms ────────────────────────────────────────────────
    socket.on('dm:join',  (convId) => socket.join(`dm:${convId}`))
    socket.on('dm:leave', (convId) => socket.leave(`dm:${convId}`))

    socket.on('dm:message', async ({ conv_id, content }, ack) => {
      if (!conv_id || !content?.trim()) return ack?.({ error: 'Invalid data' })

      try {
        // Verify participant
        const { rows: access } = await pool.query(
          'SELECT 1 FROM dm_participants WHERE conv_id = $1 AND user_id = $2',
          [conv_id, socket.user.id]
        )
        if (!access.length) return ack?.({ error: 'Access denied' })

        // Save to DB
        const { rows } = await pool.query(
          `INSERT INTO dm_messages (conv_id, sender_id, content)
           VALUES ($1, $2, $3)
           RETURNING id, conv_id, content, created_at`,
          [conv_id, socket.user.id, content.trim()]
        )
        const msg = rows[0]

        const { rows: users } = await pool.query(
          'SELECT id, first_name, last_name, username FROM users WHERE id = $1',
          [socket.user.id]
        )
        const sender = users[0]

        const payload = {
          id:         msg.id,
          conv_id:    msg.conv_id,
          content:    msg.content,
          created_at: msg.created_at,
          sender_id:  sender.id,
          first_name: sender.first_name,
          last_name:  sender.last_name,
          username:   sender.username,
        }

        io.to(`dm:${conv_id}`).emit('message:new', { type: 'dm', message: payload })
        ack?.({ ok: true })
      } catch (err) {
        console.error(err)
        ack?.({ error: 'Server error' })
      }
    })

    // ─── Typing indicators ───────────────────────────────────────
    socket.on('typing:start', ({ room }) => {
      socket.to(room).emit('typing:start', {
        user_id:  socket.user.id,
        username: socket.user.username,
      })
    })

    socket.on('typing:stop', ({ room }) => {
      socket.to(room).emit('typing:stop', { user_id: socket.user.id })
    })

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: user ${socket.user.id}`)
    })
  })
}
