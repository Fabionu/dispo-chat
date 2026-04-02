import { Router } from 'express'
import pool from '../db/pool.js'
import { requireAuth } from '../middleware/requireAuth.js'

const router = Router()
router.use(requireAuth)

const PAGE_SIZE = 60

async function isMember(groupId, userId) {
  const { rows } = await pool.query(
    'SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2',
    [groupId, userId]
  )
  return rows[0] || null
}

// GET /api/group-messages?group_id=X[&before_id=Y]
router.get('/', async (req, res) => {
  const groupId  = parseInt(req.query.group_id)
  const beforeId = req.query.before_id ? parseInt(req.query.before_id) : null
  if (!groupId) return res.status(400).json({ error: 'group_id is required' })

  const member = await isMember(groupId, req.user.id)
  if (!member) return res.status(403).json({ error: 'Forbidden' })

  try {
    const cursorClause = beforeId ? `AND m.id < $3` : ''

    const { rows: rawRows } = await pool.query(`
      SELECT
        m.id, m.type, m.content, m.created_at, m.edited_at,
        u.id AS sender_id, u.first_name, u.last_name, u.username,
        gm.role AS sender_role,
        m.reply_to_id,
        rm.content    AS reply_content,
        ru.first_name AS reply_first_name,
        ru.last_name  AS reply_last_name
      FROM group_messages m
      JOIN users u ON u.id = m.sender_id
      JOIN group_members gm ON gm.group_id = m.group_id AND gm.user_id = m.sender_id
      LEFT JOIN group_messages rm ON rm.id = m.reply_to_id
      LEFT JOIN users ru ON ru.id = rm.sender_id
      WHERE m.group_id = $1 ${cursorClause}
      ORDER BY m.created_at DESC
      LIMIT $2
    `, beforeId ? [groupId, PAGE_SIZE + 1, beforeId] : [groupId, PAGE_SIZE + 1])

    const hasMore = rawRows.length > PAGE_SIZE
    const rows = rawRows.slice(0, PAGE_SIZE).reverse()

    // Fetch pinned message
    const { rows: [pinRow] } = await pool.query(`
      SELECT m.id, m.content, u.first_name, u.last_name
      FROM groups g
      LEFT JOIN group_messages m ON m.id = g.pinned_message_id
      LEFT JOIN users u ON u.id = m.sender_id
      WHERE g.id = $1
    `, [groupId])

    const pinned_message = pinRow?.id ? pinRow : null

    res.json({ messages: rows, pinned_message, has_more: hasMore })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/group-messages
router.post('/', async (req, res) => {
  const { group_id, content } = req.body
  if (!group_id || !content?.trim()) {
    return res.status(400).json({ error: 'group_id and content are required' })
  }

  const member = await isMember(group_id, req.user.id)
  if (!member) return res.status(403).json({ error: 'Forbidden' })

  try {
    const { rows: [msg] } = await pool.query(`
      INSERT INTO group_messages (group_id, sender_id, content)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [group_id, req.user.id, content.trim()])

    res.status(201).json({ message: msg })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// PATCH /api/group-messages/:id — edit own message within 5 min
router.patch('/:id', async (req, res) => {
  const msg_id = parseInt(req.params.id)
  const { content } = req.body
  if (!content?.trim()) return res.status(400).json({ error: 'content is required' })

  try {
    const { rows: [msg] } = await pool.query(
      'SELECT id, group_id, sender_id, created_at FROM group_messages WHERE id = $1',
      [msg_id]
    )
    if (!msg) return res.status(404).json({ error: 'Message not found' })
    if (msg.sender_id !== req.user.id) return res.status(403).json({ error: 'Can only edit own messages' })

    const ageMs = Date.now() - new Date(msg.created_at).getTime()
    if (ageMs > 5 * 60 * 1000) {
      return res.status(403).json({ error: 'Cannot edit messages older than 5 minutes' })
    }

    const { rows: [updated] } = await pool.query(
      'UPDATE group_messages SET content = $1, edited_at = NOW() WHERE id = $2 RETURNING *',
      [content.trim(), msg_id]
    )

    req.io.to(`group:${msg.group_id}`).emit('message:edited', {
      id:         msg_id,
      group_id:   msg.group_id,
      content:    updated.content,
      edited_at:  updated.edited_at,
    })

    res.json({ message: updated })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/group-messages/:id/reads
router.get('/:id/reads', async (req, res) => {
  const msg_id = parseInt(req.params.id)
  try {
    const { rows: msgRows } = await pool.query(
      `SELECT id, group_id, created_at, sender_id FROM group_messages WHERE id = $1`,
      [msg_id]
    )
    if (!msgRows[0]) return res.status(404).json({ error: 'Message not found' })
    const { group_id, created_at, sender_id } = msgRows[0]

    const member = await isMember(group_id, req.user.id)
    if (!member) return res.status(403).json({ error: 'Forbidden' })

    const { rows } = await pool.query(
      `SELECT u.id, u.first_name, u.last_name, gm.role,
         CASE WHEN rc.last_read_at IS NOT NULL AND rc.last_read_at >= $2
              THEN true ELSE false END AS has_read,
         rc.last_read_at
       FROM group_members gm
       JOIN users u ON u.id = gm.user_id
       LEFT JOIN group_read_cursors rc
         ON rc.group_id = gm.group_id AND rc.user_id = gm.user_id
       WHERE gm.group_id = $1 AND gm.user_id != $3
       ORDER BY has_read DESC, u.first_name`,
      [group_id, created_at, sender_id]
    )
    res.json({ reads: rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
