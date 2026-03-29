import { Router } from 'express'
import pool from '../db/pool.js'
import { requireAuth } from '../middleware/requireAuth.js'

const router = Router()
router.use(requireAuth)

// GET /api/trips?group_id=1&status=active
router.get('/', async (req, res) => {
  const { group_id, status } = req.query
  if (!group_id) return res.status(400).json({ error: 'group_id is required' })

  try {
    // Verifica ca userul e in grup
    const { rows: member } = await pool.query(
      `SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2`,
      [group_id, req.user.id]
    )
    if (!member.length) return res.status(403).json({ error: 'Not a member of this group' })

    const conditions = ['t.group_id = $1']
    const params = [group_id]

    if (status) {
      conditions.push(`t.status = $${params.length + 1}`)
      params.push(status)
    }

    const { rows } = await pool.query(
      `SELECT t.*,
        (SELECT content FROM messages WHERE trip_id = t.id ORDER BY created_at DESC LIMIT 1) AS last_message,
        (SELECT created_at FROM messages WHERE trip_id = t.id ORDER BY created_at DESC LIMIT 1) AS last_message_at,
        (SELECT COUNT(*) FROM messages m
         LEFT JOIN message_reads mr ON mr.message_id = m.id AND mr.user_id = $${params.length + 1}
         WHERE m.trip_id = t.id AND mr.message_id IS NULL) AS unread_count
       FROM trips t
       WHERE ${conditions.join(' AND ')}
       ORDER BY last_message_at DESC NULLS LAST, t.created_at DESC`,
      [...params, req.user.id]
    )
    res.json({ trips: rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/trips — creeaza cursa (doar dispatcher)
router.post('/', async (req, res) => {
  const { group_id, vehicle_plate, origin, destination, date } = req.body

  if (!group_id || !vehicle_plate || !origin || !destination || !date) {
    return res.status(400).json({ error: 'All fields are required' })
  }

  try {
    // Verifica ca e dispatcher
    const { rows: member } = await pool.query(
      `SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2`,
      [group_id, req.user.id]
    )
    if (!member.length) return res.status(403).json({ error: 'Not a member of this group' })
    if (member[0].role !== 'dispatcher') return res.status(403).json({ error: 'Only dispatchers can create trips' })

    // Genereaza ref unic: TRP-YYYY-XXX
    const year = new Date().getFullYear()
    const { rows: count } = await pool.query(
      `SELECT COUNT(*) FROM trips WHERE group_id = $1 AND EXTRACT(YEAR FROM created_at) = $2`,
      [group_id, year]
    )
    const ref = `TRP-${year}-${String(parseInt(count[0].count) + 1).padStart(3, '0')}`

    const { rows } = await pool.query(
      `INSERT INTO trips (ref, group_id, vehicle_plate, origin, destination, date, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [ref, group_id, vehicle_plate.toUpperCase(), origin, destination, date, req.user.id]
    )
    res.status(201).json({ trip: rows[0] })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// PATCH /api/trips/:id/status — schimba statusul
router.patch('/:id/status', async (req, res) => {
  const { status } = req.body
  if (!['active', 'completed', 'archived'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' })
  }

  try {
    const { rows } = await pool.query(
      `UPDATE trips SET status = $1 WHERE id = $2 RETURNING *`,
      [status, req.params.id]
    )
    if (!rows.length) return res.status(404).json({ error: 'Trip not found' })
    res.json({ trip: rows[0] })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
