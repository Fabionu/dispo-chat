import jwt from 'jsonwebtoken'
import pool from '../db/pool.js'

export function registerSocketHandlers(io) {

  // Track active socket count per user: Map<userId, Set<socketId>>
  const userSockets = new Map()
  // Grace period timers before marking offline: Map<userId, timeoutId>
  const offlineTimers = new Map()

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

  io.on('connection', async (socket) => {
    const uid = socket.user.id
    console.log(`Socket connected: user ${uid}`)

    // ─── Track connection ─────────────────────────────────────────
    if (!userSockets.has(uid)) userSockets.set(uid, new Set())
    const isFirstConnection = userSockets.get(uid).size === 0
    userSockets.get(uid).add(socket.id)

    // Join personal room for unread notifications
    socket.join(`user:${uid}`)

    // ─── Cancel pending offline timer (reconnect within grace period) ─
    if (offlineTimers.has(uid)) {
      clearTimeout(offlineTimers.get(uid))
      offlineTimers.delete(uid)
      // Announce still-online status to others
      try {
        const { rows } = await pool.query(`SELECT status FROM users WHERE id = $1`, [uid])
        const current = rows[0]?.status
        if (current && current !== 'offline') {
          socket.broadcast.emit('user:status_changed', { user_id: uid, status: current })
        }
      } catch {}
    } else if (isFirstConnection) {
      // ─── Fresh connect: restore status if was offline ─────────────
      try {
        const { rows } = await pool.query(
          `SELECT status FROM users WHERE id = $1`, [uid]
        )
        const current = rows[0]?.status
        if (current === 'offline') {
          await pool.query(`UPDATE users SET status = 'available' WHERE id = $1`, [uid])
          io.to(`user:${uid}`).emit('user:status_changed', { user_id: uid, status: 'available' })
          socket.broadcast.emit('user:status_changed', { user_id: uid, status: 'available' })
        } else if (current) {
          socket.broadcast.emit('user:status_changed', { user_id: uid, status: current })
        }
      } catch (err) {
        console.error('Failed to restore status on connect:', err)
      }
    }

    // ─── Group rooms ─────────────────────────────────────────────
    socket.on('group:join',  (groupId) => socket.join(`group:${groupId}`))
    socket.on('group:leave', (groupId) => socket.leave(`group:${groupId}`))

    socket.on('group:message', async ({ group_id, content, reply_to_id }, ack) => {
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
          `INSERT INTO group_messages (group_id, sender_id, content, reply_to_id)
           VALUES ($1, $2, $3, $4)
           RETURNING id, group_id, content, created_at, reply_to_id`,
          [group_id, socket.user.id, content.trim(), reply_to_id || null]
        )
        const msg = rows[0]

        // Get sender info
        const { rows: users } = await pool.query(
          'SELECT id, first_name, last_name, username, avatar_url FROM users WHERE id = $1',
          [socket.user.id]
        )
        const sender = users[0]

        // Get reply info if applicable
        let reply_content = null, reply_first_name = null, reply_last_name = null
        if (msg.reply_to_id) {
          const { rows: replyRows } = await pool.query(
            `SELECT m.content, u.first_name, u.last_name
             FROM group_messages m JOIN users u ON u.id = m.sender_id
             WHERE m.id = $1`,
            [msg.reply_to_id]
          )
          if (replyRows[0]) {
            reply_content    = replyRows[0].content
            reply_first_name = replyRows[0].first_name
            reply_last_name  = replyRows[0].last_name
          }
        }

        const payload = {
          id:               msg.id,
          group_id:         msg.group_id,
          content:          msg.content,
          created_at:       msg.created_at,
          reply_to_id:      msg.reply_to_id,
          reply_content,
          reply_first_name,
          reply_last_name,
          sender_id:        sender.id,
          first_name:       sender.first_name,
          last_name:        sender.last_name,
          username:         sender.username,
          avatar_url:       sender.avatar_url,
        }

        // Broadcast to all in room (including sender)
        io.to(`group:${group_id}`).emit('message:new', { type: 'group', message: payload })

        // Notify other members via their personal room (for unread badges)
        const { rows: otherMembers } = await pool.query(
          'SELECT user_id FROM group_members WHERE group_id = $1 AND user_id != $2',
          [group_id, socket.user.id]
        )
        for (const member of otherMembers) {
          io.to(`user:${member.user_id}`).emit('unread:new', { type: 'group', message: payload })
        }

        ack?.({ ok: true, message: payload })
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
          'SELECT id, first_name, last_name, username, avatar_url FROM users WHERE id = $1',
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
          avatar_url: sender.avatar_url,
        }

        io.to(`dm:${conv_id}`).emit('message:new', { type: 'dm', message: payload })

        // Notify the other participant via their personal room (for unread badges)
        const { rows: otherParticipants } = await pool.query(
          'SELECT user_id FROM dm_participants WHERE conv_id = $1 AND user_id != $2',
          [conv_id, socket.user.id]
        )
        for (const p of otherParticipants) {
          io.to(`user:${p.user_id}`).emit('unread:new', { type: 'dm', message: payload })
        }

        ack?.({ ok: true, message: payload })
      } catch (err) {
        console.error(err)
        ack?.({ error: 'Server error' })
      }
    })

    // ─── User status ─────────────────────────────────────────────
    socket.on('user:status_update', async ({ status }) => {
      const VALID = ['available', 'busy', 'away', 'dnd', 'offline']
      if (!VALID.includes(status)) return
      try {
        await pool.query(
          `UPDATE users SET status = $1 WHERE id = $2`, [status, socket.user.id]
        )
      } catch {}
      socket.broadcast.emit('user:status_changed', { user_id: socket.user.id, status })
    })

    // ─── Typing indicators ───────────────────────────────────────
    socket.on('typing:start', ({ room }) => {
      socket.to(room).emit('typing:start', {
        user_id:  socket.user.id,
        username: socket.user.username,
        room,
      })
    })

    socket.on('typing:stop', ({ room }) => {
      socket.to(room).emit('typing:stop', { user_id: socket.user.id, room })
    })

    socket.on('disconnect', async () => {
      const uid = socket.user.id
      console.log(`Socket disconnected: user ${uid}`)

      // ─── Remove from tracking ─────────────────────────────────
      const set = userSockets.get(uid)
      if (set) {
        set.delete(socket.id)
        if (set.size === 0) userSockets.delete(uid)
      }

      // Only mark offline when the LAST socket for this user disconnects
      // Use a 4s grace period to avoid flicker on page refresh / reconnect
      const stillOnline = (userSockets.get(uid)?.size ?? 0) > 0
      if (!stillOnline) {
        const timer = setTimeout(async () => {
          offlineTimers.delete(uid)
          // Double-check no new socket connected during grace period
          if ((userSockets.get(uid)?.size ?? 0) > 0) return
          try {
            await pool.query(`UPDATE users SET status = 'offline' WHERE id = $1`, [uid])
            socket.broadcast.emit('user:status_changed', { user_id: uid, status: 'offline' })
            console.log(`User ${uid} marked offline`)
          } catch (err) {
            console.error('Failed to set offline on disconnect:', err)
          }
        }, 4000)
        offlineTimers.set(uid, timer)
      }
    })
  })
}
