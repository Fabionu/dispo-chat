import { Router } from 'express'
import pool from '../db/pool.js'
import { requireAuth } from '../middleware/requireAuth.js'

const router = Router()
router.use(requireAuth)

// GET /api/dm — list all DM conversations for current user (with last message + other user info)
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        dc.id              AS conv_id,
        u.id               AS user_id,
        u.first_name,
        u.last_name,
        u.username,
        u.unique_code,
        u.avatar_url,
        COALESCE(u.status, 'available') AS status,
        lm.content    AS last_message,
        lm.created_at AS last_message_at
      FROM dm_conversations dc
      JOIN dm_participants my_dp ON my_dp.conv_id = dc.id AND my_dp.user_id = $1
      JOIN dm_participants dp    ON dp.conv_id = dc.id AND dp.user_id != $1
      JOIN users u ON u.id = dp.user_id
      LEFT JOIN LATERAL (
        SELECT content, created_at
        FROM dm_messages
        WHERE conv_id = dc.id
        ORDER BY created_at DESC
        LIMIT 1
      ) lm ON true
      ORDER BY lm.created_at DESC NULLS LAST
    `, [req.user.id])

    res.json({ conversations: rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/dm — start or retrieve existing DM conversation with another user
router.post('/', async (req, res) => {
  const { other_user_id, invite_code } = req.body
  const myId = req.user.id

  try {
    let targetId = other_user_id
    let targetUser = null

    if (invite_code) {
      const { rows } = await pool.query(
        'SELECT id, first_name, last_name, username FROM users WHERE unique_code = $1',
        [invite_code.trim().toUpperCase()]
      )
      if (!rows[0]) return res.status(404).json({ error: 'User not found' })
      targetUser = rows[0]
      targetId   = rows[0].id
    }

    if (!targetId) return res.status(400).json({ error: 'other_user_id or invite_code is required' })
    if (Number(targetId) === myId) return res.status(400).json({ error: 'Cannot DM yourself' })

    // Fetch user info if not already loaded
    if (!targetUser) {
      const { rows } = await pool.query(
        'SELECT id, first_name, last_name, username FROM users WHERE id = $1',
        [targetId]
      )
      targetUser = rows[0] ?? null
    }

    // Check if a DM conversation already exists between these two users
    const { rows: existing } = await pool.query(`
      SELECT dc.id FROM dm_conversations dc
      WHERE dc.id IN (SELECT conv_id FROM dm_participants WHERE user_id = $1)
        AND dc.id IN (SELECT conv_id FROM dm_participants WHERE user_id = $2)
    `, [myId, targetId])

    if (existing.length > 0) return res.json({ conversation_id: existing[0].id, user: targetUser })

    // Create new conversation
    const { rows: [conv] } = await pool.query('INSERT INTO dm_conversations DEFAULT VALUES RETURNING id')
    await pool.query(
      'INSERT INTO dm_participants (conv_id, user_id) VALUES ($1, $2), ($1, $3)',
      [conv.id, myId, targetId]
    )

    res.status(201).json({ conversation_id: conv.id, user: targetUser })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/dm/unreads — unread counts for all conversations (groups + DMs)
router.get('/unreads', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 'group' AS type, gm.group_id::text AS id, COUNT(*) AS count
      FROM group_messages gm
      JOIN group_members mem ON mem.group_id = gm.group_id AND mem.user_id = $1
      LEFT JOIN group_read_cursors grc ON grc.group_id = gm.group_id AND grc.user_id = $1
      WHERE gm.sender_id != $1
        AND gm.created_at > COALESCE(grc.last_read_at, '1970-01-01')
      GROUP BY gm.group_id

      UNION ALL

      SELECT 'dm' AS type, dm.conv_id::text AS id, COUNT(*) AS count
      FROM dm_messages dm
      JOIN dm_participants dp ON dp.conv_id = dm.conv_id AND dp.user_id = $1
      LEFT JOIN dm_read_cursors drc ON drc.conv_id = dm.conv_id AND drc.user_id = $1
      WHERE dm.sender_id != $1
        AND dm.created_at > COALESCE(drc.last_read_at, '1970-01-01')
      GROUP BY dm.conv_id
    `, [req.user.id])

    const unreads = {}
    for (const row of rows) {
      unreads[`${row.type}:${row.id}`] = parseInt(row.count)
    }
    res.json({ unreads })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/dm/:id/messages[?before_id=Y]
router.get('/:id/messages', async (req, res) => {
  const convId   = parseInt(req.params.id)
  const beforeId = req.query.before_id ? parseInt(req.query.before_id) : null
  const PAGE_SIZE = 60

  const { rows: auth } = await pool.query(
    'SELECT 1 FROM dm_participants WHERE conv_id = $1 AND user_id = $2',
    [convId, req.user.id]
  )
  if (!auth.length) return res.status(403).json({ error: 'Forbidden' })

  try {
    const cursorClause = beforeId ? `AND m.id < $3` : ''

    const { rows: rawRows } = await pool.query(`
      SELECT
        m.id, m.content, m.created_at,
        u.id AS sender_id, u.first_name, u.last_name, u.username
      FROM dm_messages m
      JOIN users u ON u.id = m.sender_id
      WHERE m.conv_id = $1 ${cursorClause}
      ORDER BY m.created_at DESC
      LIMIT $2
    `, beforeId ? [convId, PAGE_SIZE + 1, beforeId] : [convId, PAGE_SIZE + 1])

    const hasMore = rawRows.length > PAGE_SIZE
    const rows = rawRows.slice(0, PAGE_SIZE).reverse()

    // Fetch pinned message
    const { rows: [pinRow] } = await pool.query(`
      SELECT m.id, m.content, u.first_name, u.last_name
      FROM dm_conversations dc
      LEFT JOIN dm_messages m ON m.id = dc.pinned_message_id
      LEFT JOIN users u ON u.id = m.sender_id
      WHERE dc.id = $1
    `, [convId])

    const pinned_message = pinRow?.id ? pinRow : null

    res.json({ messages: rows, has_more: hasMore, pinned_message })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/dm/:id/messages
router.post('/:id/messages', async (req, res) => {
  const convId = parseInt(req.params.id)
  const { content } = req.body

  if (!content?.trim()) return res.status(400).json({ error: 'content is required' })

  const { rows: auth } = await pool.query(
    'SELECT 1 FROM dm_participants WHERE conv_id = $1 AND user_id = $2',
    [convId, req.user.id]
  )
  if (!auth.length) return res.status(403).json({ error: 'Forbidden' })

  try {
    const { rows: [msg] } = await pool.query(
      'INSERT INTO dm_messages (conv_id, sender_id, content) VALUES ($1, $2, $3) RETURNING *',
      [convId, req.user.id, content.trim()]
    )
    res.status(201).json({ message: msg })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/dm/:id/pin — pin a message
router.post('/:id/pin', async (req, res) => {
  const convId     = parseInt(req.params.id)
  const { message_id } = req.body
  if (!message_id) return res.status(400).json({ error: 'message_id is required' })

  const { rows: auth } = await pool.query(
    'SELECT 1 FROM dm_participants WHERE conv_id = $1 AND user_id = $2',
    [convId, req.user.id]
  )
  if (!auth.length) return res.status(403).json({ error: 'Forbidden' })

  try {
    const { rows: msgRows } = await pool.query(
      'SELECT id, content, sender_id FROM dm_messages WHERE id = $1 AND conv_id = $2',
      [message_id, convId]
    )
    if (!msgRows.length) return res.status(404).json({ error: 'Message not found' })
    const msg = msgRows[0]

    await pool.query('UPDATE dm_conversations SET pinned_message_id = $1 WHERE id = $2', [message_id, convId])

    const { rows: userRows } = await pool.query(
      'SELECT first_name, last_name FROM users WHERE id = $1', [msg.sender_id]
    )
    const pinned_message = { id: msg.id, content: msg.content, ...userRows[0] }

    const { rows: pinnedBy } = await pool.query('SELECT first_name, last_name FROM users WHERE id = $1', [req.user.id])
    req.io.to(`dm:${convId}`).emit('message:pinned', { conv_id: convId, pinned_message, pinned_by: pinnedBy[0] })
    res.json({ pinned_message })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// DELETE /api/dm/:id/pin — unpin
router.delete('/:id/pin', async (req, res) => {
  const convId = parseInt(req.params.id)
  const { rows: auth } = await pool.query(
    'SELECT 1 FROM dm_participants WHERE conv_id = $1 AND user_id = $2',
    [convId, req.user.id]
  )
  if (!auth.length) return res.status(403).json({ error: 'Forbidden' })

  try {
    await pool.query('UPDATE dm_conversations SET pinned_message_id = NULL WHERE id = $1', [convId])
    const { rows: unpinnedBy } = await pool.query('SELECT first_name, last_name FROM users WHERE id = $1', [req.user.id])
    req.io.to(`dm:${convId}`).emit('message:unpinned', { conv_id: convId, unpinned_by: unpinnedBy[0] })
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/dm/:id/read — update read cursor for DM conversation
router.post('/:id/read', async (req, res) => {
  const convId = parseInt(req.params.id)
  const { rows: auth } = await pool.query(
    'SELECT 1 FROM dm_participants WHERE conv_id = $1 AND user_id = $2',
    [convId, req.user.id]
  )
  if (!auth.length) return res.status(403).json({ error: 'Forbidden' })
  try {
    await pool.query(
      `INSERT INTO dm_read_cursors (conv_id, user_id, last_read_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (conv_id, user_id) DO UPDATE SET last_read_at = NOW()`,
      [convId, req.user.id]
    )
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
