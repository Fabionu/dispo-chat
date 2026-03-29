// Alphabet fara caractere ambigue: 0/O, 1/I/L
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateCode(length = 6) {
  let code = ''
  for (let i = 0; i < length; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)]
  }
  return code
}

// Genereaza un cod unic verificand ca nu exista deja in DB
export async function generateUniqueCode(pool, table, column, length = 6) {
  let code
  let exists = true
  while (exists) {
    code = generateCode(length)
    const { rows } = await pool.query(
      `SELECT 1 FROM ${table} WHERE ${column} = $1`,
      [code]
    )
    exists = rows.length > 0
  }
  return code
}
