import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../services/api.js'
import { getSocket } from '../services/socket.js'

// ─── Theme presets ────────────────────────────────────────────
export const THEMES = {
  dark: {
    '--c-bg':       '#0a0a0f',
    '--c-sidebar':  '#0d0d14',
    '--c-surface':  '#0f0f17',
    '--c-surface2': '#131320',
    '--c-surface3': '#1a1a28',
    '--c-border':   'rgba(255,255,255,0.04)',
    '--c-border-md':'rgba(255,255,255,0.07)',
    '--c-border-lg':'rgba(255,255,255,0.10)',
    '--c-msg-own':  '#3a3a50',
    '--c-msg-other':'#262632',
    light: false,
    label: 'Dark',
  },
  dim: {
    '--c-bg':       '#111118',
    '--c-sidebar':  '#0d0d16',
    '--c-surface':  '#16161f',
    '--c-surface2': '#1c1c2a',
    '--c-surface3': '#24243a',
    '--c-border':   'rgba(255,255,255,0.05)',
    '--c-border-md':'rgba(255,255,255,0.09)',
    '--c-border-lg':'rgba(255,255,255,0.13)',
    '--c-msg-own':  'rgba(255,255,255,0.10)',
    '--c-msg-other':'rgba(255,255,255,0.05)',
    light: false,
    label: 'Dim',
  },
  amoled: {
    '--c-bg':       '#000000',
    '--c-sidebar':  '#000000',
    '--c-surface':  '#080808',
    '--c-surface2': '#101010',
    '--c-surface3': '#1a1a1a',
    '--c-border':   'rgba(255,255,255,0.06)',
    '--c-border-md':'rgba(255,255,255,0.09)',
    '--c-border-lg':'rgba(255,255,255,0.12)',
    '--c-msg-own':  'rgba(255,255,255,0.08)',
    '--c-msg-other':'rgba(255,255,255,0.04)',
    light: false,
    label: 'AMOLED',
  },
  light: {
    '--c-bg':       '#ECEEF5',
    '--c-sidebar':  '#E1E3EE',
    '--c-surface':  '#F5F5FB',
    '--c-surface2': '#ECEDF4',
    '--c-surface3': '#E3E5F0',
    '--c-border':   'rgba(0,0,0,0.07)',
    '--c-border-md':'rgba(0,0,0,0.10)',
    '--c-border-lg':'rgba(0,0,0,0.15)',
    '--c-msg-own':  '#D8DAF8',
    '--c-msg-other':'#FFFFFF',
    light: true,
    label: 'Light',
  },
}

// ─── Accent presets ───────────────────────────────────────────
export const ACCENTS = {
  indigo:  { '--c-accent': '#818cf8', '--c-accent-muted': 'rgba(129,140,248,0.15)', label: 'Indigo',  msgOwnDark: 'rgba(129,140,248,0.28)', msgOwnLight: '#c8ccfc' },
  sky:     { '--c-accent': '#38bdf8', '--c-accent-muted': 'rgba(56,189,248,0.13)',  label: 'Sky',     msgOwnDark: 'rgba(56,189,248,0.24)',  msgOwnLight: '#b6eafd' },
  emerald: { '--c-accent': '#34d399', '--c-accent-muted': 'rgba(52,211,153,0.13)',  label: 'Emerald', msgOwnDark: 'rgba(52,211,153,0.22)',  msgOwnLight: '#b6f0dc' },
  amber:   { '--c-accent': '#fbbf24', '--c-accent-muted': 'rgba(251,191,36,0.13)',  label: 'Amber',   msgOwnDark: 'rgba(251,191,36,0.24)',  msgOwnLight: '#fde99c' },
  rose:    { '--c-accent': '#fb7185', '--c-accent-muted': 'rgba(251,113,133,0.13)', label: 'Rose',    msgOwnDark: 'rgba(251,113,133,0.24)', msgOwnLight: '#fcc2c9' },
  violet:  { '--c-accent': '#c084fc', '--c-accent-muted': 'rgba(192,132,252,0.13)', label: 'Violet',  msgOwnDark: 'rgba(192,132,252,0.24)', msgOwnLight: '#debdfe' },
}

// ─── Font sizes ───────────────────────────────────────────────
// sm/md/lg = html root font-size; all rem-based Tailwind classes scale with it
export const FONT_SIZES = { sm: '14px', md: '16px', lg: '18px' }

// ─── Density vars ─────────────────────────────────────────────
export const DENSITY_VARS = {
  compact: { '--c-row-py': '6px',  '--c-bubble-px': '12px', '--c-bubble-py': '7px'  },
  normal:  { '--c-row-py': '10px', '--c-bubble-px': '16px', '--c-bubble-py': '10px' },
}

// ─── Background patterns ──────────────────────────────────────
export const PATTERNS = {
  none:       { label: 'None',   dark: 'none', light: 'none', size: 'auto' },
  dots:       {
    label: 'Dots',
    dark:  'radial-gradient(circle, rgba(255,255,255,0.045) 1px, transparent 1px)',
    light: 'radial-gradient(circle, rgba(0,0,0,0.06) 1px, transparent 1px)',
    size:  '22px 22px',
  },
  grid:       {
    label: 'Grid',
    dark:  'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
    light: 'linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px)',
    size:  '28px 28px',
  },
  diagonal:   {
    label: 'Lines',
    dark:  'repeating-linear-gradient(45deg, transparent, transparent 18px, rgba(255,255,255,0.018) 18px, rgba(255,255,255,0.018) 19px)',
    light: 'repeating-linear-gradient(45deg, transparent, transparent 18px, rgba(0,0,0,0.035) 18px, rgba(0,0,0,0.035) 19px)',
    size:  'auto',
  },
  crosshatch: {
    label: 'Cross',
    dark:  'repeating-linear-gradient(45deg, transparent, transparent 14px, rgba(255,255,255,0.015) 14px, rgba(255,255,255,0.015) 15px), repeating-linear-gradient(-45deg, transparent, transparent 14px, rgba(255,255,255,0.015) 14px, rgba(255,255,255,0.015) 15px)',
    light: 'repeating-linear-gradient(45deg, transparent, transparent 14px, rgba(0,0,0,0.03) 14px, rgba(0,0,0,0.03) 15px), repeating-linear-gradient(-45deg, transparent, transparent 14px, rgba(0,0,0,0.03) 14px, rgba(0,0,0,0.03) 15px)',
    size:  'auto',
  },
  waves:      {
    label: 'Waves',
    dark:  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='20' viewBox='0 0 100 20'%3E%3Cpath d='M0 10 C15 0 35 0 50 10 C65 20 85 20 100 10' stroke='rgba(255,255,255,0.032)' fill='none' stroke-width='1'/%3E%3C/svg%3E")`,
    light: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='20' viewBox='0 0 100 20'%3E%3Cpath d='M0 10 C15 0 35 0 50 10 C65 20 85 20 100 10' stroke='rgba(0,0,0,0.05)' fill='none' stroke-width='1'/%3E%3C/svg%3E")`,
    size:  '100px 20px',
  },
}

// ─── Status config ────────────────────────────────────────────
export const STATUSES = [
  { value: 'available', label: 'Available',      color: '#22c55e' },
  { value: 'away',      label: 'Away',           color: '#f59e0b' },
  { value: 'busy',      label: 'Busy',           color: '#ef4444' },
  { value: 'dnd',       label: 'Do not disturb', color: '#b91c1c' },
  { value: 'offline',   label: 'Appear offline', color: '#6b7280' },
]

export const STATUS_COLOR = Object.fromEntries(STATUSES.map(s => [s.value, s.color]))

export function StatusDot({ status = 'available', size = 9, className = '' }) {
  const color = STATUS_COLOR[status] ?? STATUS_COLOR.offline
  return (
    <span
      className={`rounded-full flex-shrink-0 inline-block border-2 ${className}`}
      style={{ width: size, height: size, background: color, borderColor: 'inherit' }}
    />
  )
}

// ─── Context ──────────────────────────────────────────────────
const DEFAULT = { theme: 'dark', accent: 'indigo', fontSize: 'md', density: 'normal', background: 'none' }
const SettingsContext = createContext(null)

export function SettingsProvider({ children, user, onUserUpdate }) {
  const [appearance, setAppearance] = useState(() => {
    try { return { ...DEFAULT, ...JSON.parse(localStorage.getItem('dc_appearance') || '{}') } }
    catch { return DEFAULT }
  })

  useEffect(() => {
    const root   = document.documentElement
    const theme  = THEMES[appearance.theme]  ?? THEMES.dark
    const accent = ACCENTS[appearance.accent] ?? ACCENTS.indigo
    Object.entries(theme).forEach(([k, v])  => { if (typeof v !== 'boolean' && k !== 'label') root.style.setProperty(k, v) })
    Object.entries(accent).forEach(([k, v]) => { if (k !== 'label') root.style.setProperty(k, v) })
    const fs = FONT_SIZES[appearance.fontSize] ?? FONT_SIZES.md
    root.style.fontSize = fs
    root.style.setProperty('--c-font-size', fs)
    const dv = DENSITY_VARS[appearance.density] ?? DENSITY_VARS.normal
    Object.entries(dv).forEach(([k, v]) => root.style.setProperty(k, v))
    if (theme.light) root.classList.add('theme-light')
    else             root.classList.remove('theme-light')
    // Bubble color driven by accent, not theme
    root.style.setProperty('--c-msg-own', theme.light ? accent.msgOwnLight : accent.msgOwnDark)
    localStorage.setItem('dc_appearance', JSON.stringify(appearance))
  }, [appearance])

  const updateAppearance = useCallback((patch) => setAppearance(prev => ({ ...prev, ...patch })), [])

  const updateStatus = useCallback(async (status) => {
    try {
      const { user: updated } = await api.updateProfile({ status })
      onUserUpdate?.(updated)
      getSocket()?.emit('user:status_update', { status })
    } catch {}
  }, [onUserUpdate])

  const updateAvatar = useCallback(async (avatar_url) => {
    try {
      const { user: updated } = await api.updateProfile({ avatar_url })
      onUserUpdate?.(updated)
    } catch {}
  }, [onUserUpdate])

  // ─── Auto-busy după 10 min inactivitate ──────────────────────
  const idleTimer   = useRef(null)
  const prevStatus  = useRef(null)

  useEffect(() => {
    if (!user) return
    const IDLE_MS = 10 * 60 * 1000

    const goIdle = () => {
      const current = user.status || 'available'
      if (current === 'offline' || current === 'busy' || current === 'dnd') return
      prevStatus.current = current
      updateStatus('busy')
    }

    const resetIdle = () => {
      clearTimeout(idleTimer.current)
      // Dacă eram în busy auto, revenim la statusul anterior
      if (prevStatus.current) {
        updateStatus(prevStatus.current)
        prevStatus.current = null
      }
      idleTimer.current = setTimeout(goIdle, IDLE_MS)
    }

    const EVENTS = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll']
    EVENTS.forEach(e => window.addEventListener(e, resetIdle, { passive: true }))
    idleTimer.current = setTimeout(goIdle, IDLE_MS)

    return () => {
      clearTimeout(idleTimer.current)
      EVENTS.forEach(e => window.removeEventListener(e, resetIdle))
    }
  }, [user, updateStatus])

  return (
    <SettingsContext.Provider value={{ appearance, updateAppearance, updateStatus, updateAvatar }}>
      {children}
    </SettingsContext.Provider>
  )
}

export const useSettings = () => useContext(SettingsContext)
