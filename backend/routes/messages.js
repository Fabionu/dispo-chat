import { Router } from 'express'
import pool from '../db/pool.js'
import { requireAuth } from '../middleware/requireAuth.js'

const router = Router()
router.use(requireAuth)

// GET /api/messages?trip_id=1  — istoricul complet
router.get('/', async (req, res) => {
  const { trip_id } = req.query
  if (!trip_id) return res.status(400).json({ error: 'trip_id is required' })

  try {
    // Verifica acces: userul trebuie sa fie in grupul cursei
    const { rows: access } = await pool.query(
      `SELECT 1 FROM trips t
       JOIN group_members gm ON gm.group_id = t.group_id
       WHERE t.id = $1 AND gm.user_id = $2`,
      [trip_id, req.user.id]
    )
    if (!access.length) return res.status(403).json({ error: 'Access denied' })

    const { rows } = await pool.query(
      `SELECT m.id, m.type, m.content, m.status_key, m.created_at,
        u.id AS sender_id, u.first_name, u.last_name, u.username
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.trip_id = $1
       ORDER BY m.created_at ASC`,
      [trip_id]
    )

    // Marcheaza ca citite
    if (rows.length > 0) {
      const messageIds = rows.map(r => r.id)
      await pool.query(
        `INSERT INTO message_reads (message_id, user_id)
         SELECT unnest($1::int[]), $2
         ON CONFLICT DO NOTHING`,
        [messageIds, req.user.id]
      )
    }

    res.json({ messages: rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
