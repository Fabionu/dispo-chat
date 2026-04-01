const base = {
  fill: 'none',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

const sw = (w = 14, s = 1.4) => ({ width: w, height: w, strokeWidth: s, ...base })

export const IconSearch = ({ size = 14, stroke = 1.4, color = 'currentColor' }) => (
  <svg {...sw(size, stroke)} viewBox="0 0 24 24" stroke={color}>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <line x1="15.5" y1="15.5" x2="21" y2="21" />
  </svg>
)

export const IconPlus = ({ size = 14, stroke = 1.4, color = 'currentColor' }) => (
  <svg {...sw(size, stroke)} viewBox="0 0 24 24" stroke={color}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

export const IconX = ({ size = 14, stroke = 1.4, color = 'currentColor' }) => (
  <svg {...sw(size, stroke)} viewBox="0 0 24 24" stroke={color}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

export const IconSend = ({ size = 14, stroke = 1.4, color = 'currentColor' }) => (
  <svg {...sw(size, stroke)} viewBox="0 0 24 24" stroke={color}>
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
)

export const IconZap = ({ size = 14, stroke = 1.4, color = 'currentColor' }) => (
  <svg {...sw(size, stroke)} viewBox="0 0 24 24" stroke={color}>
    <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
)

export const IconLogOut = ({ size = 14, stroke = 1.4, color = 'currentColor' }) => (
  <svg {...sw(size, stroke)} viewBox="0 0 24 24" stroke={color}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
)

export const IconCopy = ({ size = 14, stroke = 1.4, color = 'currentColor' }) => (
  <svg {...sw(size, stroke)} viewBox="0 0 24 24" stroke={color}>
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
)

export const IconCheck = ({ size = 14, stroke = 1.4, color = 'currentColor' }) => (
  <svg {...sw(size, stroke)} viewBox="0 0 24 24" stroke={color}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

export const IconCheckCheck = ({ size = 14, stroke = 1.4, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="2 13 6.5 17.5 14 8" />
    <polyline points="9.5 13 14 17.5 22 8" />
  </svg>
)

export const IconUserPlus = ({ size = 14, stroke = 1.4, color = 'currentColor' }) => (
  <svg {...sw(size, stroke)} viewBox="0 0 24 24" stroke={color}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <line x1="19" y1="8" x2="19" y2="14" />
    <line x1="16" y1="11" x2="22" y2="11" />
  </svg>
)

export const IconMessage = ({ size = 14, stroke = 1.4, color = 'currentColor' }) => (
  <svg {...sw(size, stroke)} viewBox="0 0 24 24" stroke={color}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
)

export const IconMail = ({ size = 14, stroke = 1.4, color = 'currentColor' }) => (
  <svg {...sw(size, stroke)} viewBox="0 0 24 24" stroke={color}>
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
)

export const IconLock = ({ size = 14, stroke = 1.4, color = 'currentColor' }) => (
  <svg {...sw(size, stroke)} viewBox="0 0 24 24" stroke={color}>
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
)

export const IconSettings = ({ size = 14, stroke = 1.4, color = 'currentColor' }) => (
  <svg {...sw(size, stroke)} viewBox="0 0 24 24" stroke={color}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
)

export const IconTrash = ({ size = 14, stroke = 1.4, color = 'currentColor' }) => (
  <svg {...sw(size, stroke)} viewBox="0 0 24 24" stroke={color}>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
)

export const IconMoreVertical = ({ size = 14, stroke = 1.4, color = 'currentColor' }) => (
  <svg {...sw(size, stroke)} viewBox="0 0 24 24" stroke={color}>
    <circle cx="12" cy="5"  r="2" fill={color} strokeWidth="0" />
    <circle cx="12" cy="12" r="2" fill={color} strokeWidth="0" />
    <circle cx="12" cy="19" r="2" fill={color} strokeWidth="0" />
  </svg>
)

export const IconBellOff = ({ size = 14, stroke = 1.4, color = 'currentColor' }) => (
  <svg {...sw(size, stroke)} viewBox="0 0 24 24" stroke={color}>
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    <path d="M18.63 13A17.9 17.9 0 0 1 18 8" />
    <path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14" />
    <path d="M18 8a6 6 0 0 0-9.33-5" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
)

export const IconBell = ({ size = 14, stroke = 1.4, color = 'currentColor' }) => (
  <svg {...sw(size, stroke)} viewBox="0 0 24 24" stroke={color}>
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
)

export const IconReply = ({ size = 14, stroke = 1.4, color = 'currentColor' }) => (
  <svg {...sw(size, stroke)} viewBox="0 0 24 24" stroke={color}>
    <polyline points="9 17 4 12 9 7" />
    <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
  </svg>
)

export const IconPencil = ({ size = 14, stroke = 1.4, color = 'currentColor' }) => (
  <svg {...sw(size, stroke)} viewBox="0 0 24 24" stroke={color}>
    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
  </svg>
)

export const IconPin = ({ size = 14, stroke = 1.4, color = 'currentColor' }) => (
  <svg {...sw(size, stroke)} viewBox="0 0 24 24" stroke={color}>
    <line x1="12" y1="17" x2="12" y2="22" />
    <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17z" />
  </svg>
)

export const IconChevronDown = ({ size = 14, stroke = 1.4, color = 'currentColor' }) => (
  <svg {...sw(size, stroke)} viewBox="0 0 24 24" stroke={color}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
)

export const IconCheckAll = ({ size = 12, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="2 13 6.5 17.5 14 8" />
    <polyline points="9.5 13 14 17.5 22 8" />
  </svg>
)
