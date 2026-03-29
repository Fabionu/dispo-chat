const PALETTE = [
  ['#4f46e5', '#7c3aed'],  // indigo → violet
  ['#2563eb', '#3b82f6'],  // blue
  ['#7c3aed', '#a855f7'],  // violet → purple
  ['#0d9488', '#0891b2'],  // teal → cyan
  ['#dc2626', '#e11d48'],  // red → rose
  ['#d97706', '#f59e0b'],  // amber
  ['#059669', '#10b981'],  // emerald
  ['#db2777', '#ec4899'],  // pink
]

export function avatarStyle(str = '') {
  if (!str) return { background: 'rgba(255,255,255,0.06)' }
  let h = 0
  for (const c of str) h = (h * 31 + c.charCodeAt(0)) >>> 0
  const [a, b] = PALETTE[h % PALETTE.length]
  return {
    background: `linear-gradient(135deg, ${a}4d 0%, ${b}33 100%)`,
  }
}
