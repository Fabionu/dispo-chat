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
        (SELECT content    FROM dm_messages WHERE conv_id = dc.id ORDER BY created_at DESC LIMIT 1) AS last_message,
        (SELECT created_at FROM dm_messages WHERE conv_id = dc.id ORDER BY created_at DESC LIMIT 1) AS last_message_at
      FROM dm_conversations dc
      JOIN dm_participants dp ON dp.conv_id = dc.id AND dp.user_id != $1
      JOIN users u ON u.id = dp.user_id
      WHERE dc.id IN (SELECT conv_id FROM dm_participants WHERE user_id = $1)
      ORDER BY last_message_at DESC NULLS LAST
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

// GET /api/dm/:id/messages
router.get('/:id/messages', async (req, res) => {
  const convId = parseInt(req.params.id)

  const { rows: auth } = await pool.query(
    'SELECT 1 FROM dm_participants WHERE conv_id = $1 AND user_id = $2',
    [convId, req.user.id]
  )
  if (!auth.length) return res.status(403).json({ error: 'Forbidden' })

  try {
    const { rows } = await pool.query(`
      SELECT
        m.id, m.content, m.created_at,
        u.id AS sender_id, u.first_name, u.last_name, u.username
      FROM dm_messages m
      JOIN users u ON u.id = m.sender_id
      WHERE m.conv_id = $1
      ORDER BY m.created_at ASC
    `, [convId])

    res.json({ messages: rows })
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

export default router
