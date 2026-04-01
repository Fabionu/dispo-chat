import { Router } from 'express'
import pool from '../db/pool.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { generateUniqueCode } from '../lib/generateCode.js'

const router = Router()
router.use(requireAuth)

// Helper: verify user is admin of a group
async function checkAdmin(group_id, user_id) {
  const { rows } = await pool.query(
    `SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2 AND role = 'admin'`,
    [group_id, user_id]
  )
  return rows.length > 0
}

// POST /api/groups — create group; creator becomes admin
router.post('/', async (req, res) => {
  const { name } = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'Group name is required' })

  try {
    const invite_code = await generateUniqueCode(pool, 'groups', 'invite_code', 8)
    const { rows } = await pool.query(
      `INSERT INTO groups (name, invite_code, created_by) VALUES ($1, $2, $3) RETURNING *`,
      [name.trim(), invite_code, req.user.id]
    )
    const group = rows[0]
    await pool.query(
      `INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, 'admin')`,
      [group.id, req.user.id]
    )
    res.status(201).json({ group })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/groups — groups the user belongs to
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT g.id, g.name, g.description, g.invite_code, gm.role,
         (SELECT content    FROM group_messages WHERE group_id = g.id ORDER BY created_at DESC LIMIT 1) as last_message,
         (SELECT created_at FROM group_messages WHERE group_id = g.id ORDER BY created_at DESC LIMIT 1) as last_message_at
       FROM groups g
       JOIN group_members gm ON gm.group_id = g.id
       WHERE gm.user_id = $1
       ORDER BY last_message_at DESC NULLS LAST, g.created_at DESC`,
      [req.user.id]
    )
    res.json({ groups: rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// PATCH /api/groups/:id — update name + description (admin only)
router.patch('/:id', async (req, res) => {
  const group_id = parseInt(req.params.id)
  const { name, description } = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'Group name is required' })

  try {
    if (!await checkAdmin(group_id, req.user.id)) {
      return res.status(403).json({ error: 'Only admins can update the group' })
    }
    const { rows } = await pool.query(
      `UPDATE groups SET name = $1, description = $2 WHERE id = $3 RETURNING *`,
      [name.trim(), description?.trim() || null, group_id]
    )
    if (!rows[0]) return res.status(404).json({ error: 'Group not found' })
    req.io.to(`group:${group_id}`).emit('group:updated', rows[0])
    res.json({ group: rows[0] })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// DELETE /api/groups/:id — delete group (admin only)
router.delete('/:id', async (req, res) => {
  const group_id = parseInt(req.params.id)
  try {
    if (!await checkAdmin(group_id, req.user.id)) {
      return res.status(403).json({ error: 'Only admins can delete the group' })
    }
    // Emit before delete so room members still exist to receive it
    req.io.to(`group:${group_id}`).emit('group:deleted', { group_id })
    await pool.query(`DELETE FROM groups WHERE id = $1`, [group_id])
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/groups/:id/members
router.get('/:id/members', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.first_name, u.last_name, u.username, u.unique_code, u.avatar_url,
              COALESCE(u.status, 'available') AS status, gm.role
       FROM group_members gm
       JOIN users u ON u.id = gm.user_id
       WHERE gm.group_id = $1
       ORDER BY gm.role, u.first_name`,
      [req.params.id]
    )
    res.json({ members: rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/groups/:id/members — add member (admin only)
router.post('/:id/members', async (req, res) => {
  const { unique_code, role } = req.body
  const group_id = parseInt(req.params.id)

  if (!unique_code || !role) return res.status(400).json({ error: 'unique_code and role are required' })
  if (!['admin', 'dispatcher', 'driver'].includes(role)) {
    return res.status(400).json({ error: 'Role must be admin, dispatcher or driver' })
  }

  try {
    if (!await checkAdmin(group_id, req.user.id)) {
      return res.status(403).json({ error: 'Only admins can add members' })
    }
    const { rows: found } = await pool.query(
      `SELECT id, first_name, last_name, username, unique_code FROM users WHERE unique_code = $1`,
      [unique_code.toUpperCase()]
    )
    if (!found.length) return res.status(404).json({ error: 'User not found' })
    const target = found[0]

    const { rows: already } = await pool.query(
      `SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2`,
      [group_id, target.id]
    )
    if (already.length) return res.status(409).json({ error: 'User is already in this group' })

    await pool.query(
      `INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, $3)`,
      [group_id, target.id, role]
    )
    req.io.to(`group:${group_id}`).emit('group:member_added', { user: target, role })
    res.status(201).json({ user: target, role })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// PATCH /api/groups/:id/members/:userId — change role (admin only)
router.patch('/:id/members/:userId', async (req, res) => {
  const group_id  = parseInt(req.params.id)
  const target_id = parseInt(req.params.userId)
  const { role }  = req.body

  if (!['admin', 'dispatcher', 'driver'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' })
  }
  try {
    if (!await checkAdmin(group_id, req.user.id)) {
      return res.status(403).json({ error: 'Only admins can change roles' })
    }
    await pool.query(
      `UPDATE group_members SET role = $1 WHERE group_id = $2 AND user_id = $3`,
      [role, group_id, target_id]
    )
    req.io.to(`group:${group_id}`).emit('group:member_role_changed', { user_id: target_id, role })
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// DELETE /api/groups/:id/members/:userId — remove member (admin only)
router.delete('/:id/members/:userId', async (req, res) => {
  const group_id  = parseInt(req.params.id)
  const target_id = parseInt(req.params.userId)

  if (target_id === req.user.id) {
    return res.status(400).json({ error: 'Use the leave endpoint to remove yourself' })
  }
  try {
    if (!await checkAdmin(group_id, req.user.id)) {
      return res.status(403).json({ error: 'Only admins can remove members' })
    }
    const { rows: found } = await pool.query(
      `SELECT first_name, last_name FROM users WHERE id = $1`, [target_id]
    )
    await pool.query(
      `DELETE FROM group_members WHERE group_id = $1 AND user_id = $2`,
      [group_id, target_id]
    )
    const name = found[0] ? `${found[0].first_name} ${found[0].last_name}` : 'A member'
    req.io.to(`group:${group_id}`).emit('group:member_removed', { user_id: target_id, name })
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/groups/:id/read — update read cursor for current user
router.post('/:id/read', async (req, res) => {
  const group_id = parseInt(req.params.id)
  try {
    const { rows: member } = await pool.query(
      `SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2`,
      [group_id, req.user.id]
    )
    if (!member.length) return res.status(403).json({ error: 'Not a member' })

    await pool.query(
      `INSERT INTO group_read_cursors (group_id, user_id, last_read_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (group_id, user_id) DO UPDATE SET last_read_at = NOW()`,
      [group_id, req.user.id]
    )
    req.io.to(`group:${group_id}`).emit('group:read_update', { user_id: req.user.id, group_id })
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/groups/:id/leave
router.post('/:id/leave', async (req, res) => {
  const group_id = parseInt(req.params.id)
  try {
    const { rows: member } = await pool.query(
      `SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2`,
      [group_id, req.user.id]
    )
    if (!member.length) return res.status(404).json({ error: 'Not a member of this group' })

    if (member[0].role === 'admin') {
      const { rows: otherAdmins } = await pool.query(
        `SELECT 1 FROM group_members WHERE group_id = $1 AND role = 'admin' AND user_id != $2`,
        [group_id, req.user.id]
      )
      if (!otherAdmins.length) {
        return res.status(400).json({ error: 'Assign another admin before leaving' })
      }
    }

    const { rows: me } = await pool.query(
      `SELECT first_name, last_name FROM users WHERE id = $1`, [req.user.id]
    )
    await pool.query(
      `DELETE FROM group_members WHERE group_id = $1 AND user_id = $2`,
      [group_id, req.user.id]
    )
    const name = me[0] ? `${me[0].first_name} ${me[0].last_name}` : 'A member'
    req.io.to(`group:${group_id}`).emit('group:member_removed', { user_id: req.user.id, name })
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/groups/:id/pin — pin a message (any member)
router.post('/:id/pin', async (req, res) => {
  const group_id    = parseInt(req.params.id)
  const { message_id } = req.body
  if (!message_id) return res.status(400).json({ error: 'message_id is required' })

  try {
    const { rows: member } = await pool.query(
      'SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2',
      [group_id, req.user.id]
    )
    if (!member.length) return res.status(403).json({ error: 'Forbidden' })

    const { rows: msgRows } = await pool.query(
      'SELECT id, content, sender_id FROM group_messages WHERE id = $1 AND group_id = $2',
      [message_id, group_id]
    )
    if (!msgRows.length) return res.status(404).json({ error: 'Message not found' })
    const msg = msgRows[0]

    await pool.query('UPDATE groups SET pinned_message_id = $1 WHERE id = $2', [message_id, group_id])

    const { rows: userRows } = await pool.query(
      'SELECT first_name, last_name FROM users WHERE id = $1',
      [msg.sender_id]
    )
    const sender = userRows[0]
    const pinned_message = {
      id:         msg.id,
      content:    msg.content,
      first_name: sender?.first_name,
      last_name:  sender?.last_name,
    }

    req.io.to(`group:${group_id}`).emit('message:pinned', { group_id, pinned_message })
    res.json({ pinned_message })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// DELETE /api/groups/:id/pin — unpin (any member)
router.delete('/:id/pin', async (req, res) => {
  const group_id = parseInt(req.params.id)
  try {
    const { rows: member } = await pool.query(
      'SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2',
      [group_id, req.user.id]
    )
    if (!member.length) return res.status(403).json({ error: 'Forbidden' })

    await pool.query('UPDATE groups SET pinned_message_id = NULL WHERE id = $1', [group_id])
    req.io.to(`group:${group_id}`).emit('message:unpinned', { group_id })
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
