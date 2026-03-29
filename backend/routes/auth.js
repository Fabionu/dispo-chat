import { Router } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import pool from '../db/pool.js'
import { generateUniqueCode } from '../lib/generateCode.js'

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
      `SELECT id, first_name, last_name, username, unique_code, password_hash
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
      `SELECT id, first_name, last_name, username, unique_code FROM users WHERE id = $1`,
      [payload.id]
    )
    if (!rows[0]) return res.status(404).json({ error: 'User not found' })
    res.json({ user: rows[0] })
  } catch {
    res.status(401).json({ error: 'Invalid token' })
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
