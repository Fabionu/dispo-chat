import { Router } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import pool from '../db/pool.js'
import { generateUniqueCode } from '../lib/generateCode.js'
import { requireAuth } from '../middleware/requireAuth.js'

const router = Router()

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { first_name, last_name, username, email, password } = req.body

  if (!first_name || !last_name || !username || !password) {
    return res.status(400).json({ error: 'All fields are required' })
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' })
  }

  try {
    const taken = await pool.query('SELECT 1 FROM users WHERE username = $1', [username])
    if (taken.rows.length > 0) {
      return res.status(409).json({ error: 'Username already taken' })
    }

    const password_hash = await bcrypt.hash(password, 10)
    const unique_code   = await generateUniqueCode(pool, 'users', 'unique_code', 6)

    const { rows } = await pool.query(
      `INSERT INTO users (first_name, last_name, username, email, password_hash, unique_code)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, first_name, last_name, username, email, unique_code, created_at`,
      [first_name, last_name, username, email?.trim() || null, password_hash, unique_code]
    )

    const user  = rows[0]
    const token = signToken(user)
    res.status(201).json({ token, user })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' })
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, first_name, last_name, username, unique_code, avatar_url, status, preferences, password_hash
       FROM users WHERE username = $1`,
      [username]
    )

    const user = rows[0]
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' })
    }

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return res.status(401).json({ error: 'Invalid username or password' })
    }

    const { password_hash, ...safeUser } = user
    const token = signToken(safeUser)
    res.json({ token, user: safeUser })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/auth/me  — verifica tokenul si returneaza userul curent
router.get('/me', async (req, res) => {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET)
    const { rows } = await pool.query(
      `SELECT id, first_name, last_name, username, unique_code, avatar_url, status, preferences FROM users WHERE id = $1`,
      [payload.id]
    )
    if (!rows[0]) return res.status(404).json({ error: 'User not found' })
    res.json({ user: rows[0] })
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
})

// GET /api/auth/bootstrap — single call: me + groups + unreads
router.get('/bootstrap', requireAuth, async (req, res) => {
  try {
    const uid = req.user.id
    const [userRes, groupsRes, unreadsRes] = await Promise.all([
      pool.query(
        `SELECT id, first_name, last_name, username, unique_code, avatar_url, status, preferences FROM users WHERE id = $1`,
        [uid]
      ),
      pool.query(`
        SELECT
          g.id, g.name, g.description, g.invite_code, g.created_by,
          gm.role,
          lm.content    AS last_message,
          lm.created_at AS last_message_at
        FROM groups g
        JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = $1
        LEFT JOIN LATERAL (
          SELECT content, created_at FROM group_messages
          WHERE group_id = g.id ORDER BY created_at DESC LIMIT 1
        ) lm ON true
        ORDER BY lm.created_at DESC NULLS LAST
      `, [uid]),
      pool.query(`
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
      `, [uid]),
    ])

    if (!userRes.rows[0]) return res.status(404).json({ error: 'User not found' })

    const unreads = {}
    for (const row of unreadsRes.rows) {
      unreads[`${row.type}:${row.id}`] = parseInt(row.count)
    }

    res.json({ user: userRes.rows[0], groups: groupsRes.rows, unreads })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// PATCH /api/auth/profile — update avatar_url, status, and/or preferences
router.patch('/profile', requireAuth, async (req, res) => {
  const { avatar_url, status, preferences } = req.body
  const VALID_STATUSES = ['available', 'busy', 'away', 'dnd', 'offline']

  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' })
  }

  const sets = [], vals = []
  if (avatar_url   !== undefined) { sets.push(`avatar_url = $${sets.length + 1}`);                       vals.push(avatar_url) }
  if (status       !== undefined) { sets.push(`status = $${sets.length + 1}`);                           vals.push(status) }
  if (preferences  !== undefined) { sets.push(`preferences = preferences || $${sets.length + 1}::jsonb`); vals.push(JSON.stringify(preferences)) }
  if (!sets.length) return res.status(400).json({ error: 'Nothing to update' })

  try {
    vals.push(req.user.id)
    const { rows } = await pool.query(
      `UPDATE users SET ${sets.join(', ')} WHERE id = $${vals.length}
       RETURNING id, first_name, last_name, username, unique_code, avatar_url, status, preferences`,
      vals
    )
    res.json({ user: rows[0] })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  )
}

export default router
