// Notification sounds via Web Audio API — no external files needed

let ctx = null

function getCtx() {
  if (!ctx || ctx.state === 'closed') {
    ctx = new (window.AudioContext || window.webkitAudioContext)()
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function tone(freq, startTime, duration, gainValue, type = 'sine') {
  const c    = getCtx()
  const osc  = c.createOscillator()
  const gain = c.createGain()

  osc.type = type
  osc.frequency.setValueAtTime(freq, startTime)

  gain.gain.setValueAtTime(0, startTime)
  gain.gain.linearRampToValueAtTime(gainValue, startTime + 0.008)
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration)

  osc.connect(gain)
  gain.connect(c.destination)
  osc.start(startTime)
  osc.stop(startTime + duration + 0.01)
}

// ─── Send: soft upward "pop" ─────────────────────────────────────
// Single sine tone, quick and subtle — like a message whooshing out
export function playSend() {
  try {
    const c = getCtx()
    const t = c.currentTime
    tone(520, t,        0.07, 0.12)
    tone(780, t + 0.04, 0.09, 0.07)
  } catch {}
}

// ─── Receive: gentle two-note chime ──────────────────────────────
// C5 → E5 staggered — pleasant, not intrusive
export function playReceive() {
  try {
    const c = getCtx()
    const t = c.currentTime
    tone(523,  t,        0.22, 0.13)   // C5
    tone(659,  t + 0.09, 0.20, 0.10)   // E5
  } catch {}
}
