import { Router } from 'express'
import pool from '../db/pool.js'
import { requireAuth } from '../middleware/requireAuth.js'

const router = Router()
router.use(requireAuth)

// GET /api/users/search?q=...
router.get('/search', async (req, res) => {
  const q = req.query.q?.trim()
  if (!q || q.length < 2) return res.json({ users: [] })

  try {
    const { rows } = await pool.query(`
      SELECT id, first_name, last_name, username
      FROM users
      WHERE (
        username          ILIKE $1 OR
        first_name        ILIKE $1 OR
        last_name         ILIKE $1 OR
        first_name || ' ' || last_name ILIKE $1
      )
      AND id != $2
      ORDER BY first_name, last_name
      LIMIT 10
    `, [`%${q}%`, req.user.id])

    res.json({ users: rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
