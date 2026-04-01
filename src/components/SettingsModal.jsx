import { useState, useRef, useEffect, useCallback } from 'react'
import { IconX, IconLogOut, IconChevronDown } from './Icons.jsx'
import { useSettings, THEMES, ACCENTS, STATUSES, PATTERNS, FONT_SIZES } from '../contexts/SettingsContext.jsx'

const DENSITY_OPTS = [
  { value: 'compact', label: 'Compact' },
  { value: 'normal',  label: 'Normal'  },
]
const FONT_OPTS = [
  { value: 'sm', label: 'Small'  },
  { value: 'md', label: 'Medium' },
  { value: 'lg', label: 'Large'  },
]

const CROP_SIZE = 220 // px — circular viewport

// ─── Crop modal ───────────────────────────────────────────────
function CropModal({ src, onConfirm, onCancel }) {
  const [pos, setPos]         = useState({ x: 0, y: 0 })
  const [zoom, setZoom]       = useState(1)
  const [isDragging, setIsDragging] = useState(false)
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 })
  const dragStart  = useRef(null)
  const viewportRef = useRef(null)

  // Load image via JS to get reliable naturalWidth/Height
  useEffect(() => {
    const img = new window.Image()
    img.onload = () => {
      const w = img.naturalWidth
      const h = img.naturalHeight
      setImgSize({ w, h })
      const minZ = Math.max(CROP_SIZE / w, CROP_SIZE / h)
      setZoom(minZ)
      setPos({ x: 0, y: 0 })
    }
    img.src = src
  }, [src])

  const minZoom = imgSize.w > 0 ? Math.max(CROP_SIZE / imgSize.w, CROP_SIZE / imgSize.h) : 1

  // Clamp so image always covers the circle — no void areas
  const clamp = useCallback((x, y, z) => {
    if (!imgSize.w) return { x: 0, y: 0 }
    const halfW = Math.max(0, (imgSize.w * z - CROP_SIZE) / 2)
    const halfH = Math.max(0, (imgSize.h * z - CROP_SIZE) / 2)
    return {
      x: Math.max(-halfW, Math.min(halfW, x)),
      y: Math.max(-halfH, Math.min(halfH, y)),
    }
  }, [imgSize])

  // Pointer capture — works for mouse + touch, no window listeners needed
  const onPointerDown = (e) => {
    e.preventDefault()
    viewportRef.current?.setPointerCapture(e.pointerId)
    setIsDragging(true)
    dragStart.current = { x: e.clientX - pos.x, y: e.clientY - pos.y }
  }

  const onPointerMove = (e) => {
    if (!isDragging || !dragStart.current) return
    const nx = e.clientX - dragStart.current.x
    const ny = e.clientY - dragStart.current.y
    setPos(clamp(nx, ny, zoom))
  }

  const onPointerUp = () => {
    setIsDragging(false)
    dragStart.current = null
  }

  const handleZoom = (z) => {
    setZoom(z)
    setPos(prev => clamp(prev.x, prev.y, z))
  }

  const handleConfirm = () => {
    const canvas = document.createElement('canvas')
    canvas.width  = CROP_SIZE
    canvas.height = CROP_SIZE
    const ctx = canvas.getContext('2d')
    ctx.beginPath()
    ctx.arc(CROP_SIZE / 2, CROP_SIZE / 2, CROP_SIZE / 2, 0, Math.PI * 2)
    ctx.clip()
    const img = new window.Image()
    img.onload = () => {
      const iw = imgSize.w * zoom
      const ih = imgSize.h * zoom
      ctx.drawImage(img, (CROP_SIZE - iw) / 2 + pos.x, (CROP_SIZE - ih) / 2 + pos.y, iw, ih)
      onConfirm(canvas.toDataURL('image/jpeg', 0.88))
    }
    img.src = src
  }

  // Use background-image on the viewport — no img element, no CSS stretching
  const bgStyle = {
    backgroundImage:    `url(${src})`,
    backgroundSize:     imgSize.w > 0 ? `${imgSize.w * zoom}px ${imgSize.h * zoom}px` : 'contain',
    backgroundPosition: `calc(50% + ${pos.x}px) calc(50% + ${pos.y}px)`,
    backgroundRepeat:   'no-repeat',
  }

  // Preview: same bg approach scaled to 52px
  const PREV = 52
  const scale = PREV / CROP_SIZE
  const prevBgStyle = {
    backgroundImage:    `url(${src})`,
    backgroundSize:     imgSize.w > 0 ? `${imgSize.w * zoom * scale}px ${imgSize.h * zoom * scale}px` : 'contain',
    backgroundPosition: `calc(50% + ${pos.x * scale}px) calc(50% + ${pos.y * scale}px)`,
    backgroundRepeat:   'no-repeat',
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.72)' }}>
      <div
        className="flex flex-col rounded-2xl shadow-2xl"
        style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border-md)', width: 340 }}
      >
        {/* Header */}
        <div className="px-5 py-3.5 flex items-center justify-between flex-shrink-0" style={{ borderBottom: '1px solid var(--c-border)' }}>
          <span className="text-sm font-semibold text-white/70">Adjust photo</span>
          <button onClick={onCancel} className="text-white/20 hover:text-white/60 transition"><IconX size={14} /></button>
        </div>

        <div className="px-5 py-5 flex flex-col gap-5">
          {/* Circular crop viewport */}
          <div className="flex justify-center">
            <div
              ref={viewportRef}
              style={{
                ...bgStyle,
                width: CROP_SIZE, height: CROP_SIZE,
                borderRadius: '50%',
                cursor: isDragging ? 'grabbing' : 'grab',
                border: '2px solid var(--c-accent)',
                backgroundColor: '#111',
                userSelect: 'none',
                touchAction: 'none',
                flexShrink: 0,
              }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            />
          </div>

          {/* Hint */}
          <p className="text-center text-[11px] text-white/25 -mt-2">Drag to reposition</p>

          {/* Zoom slider */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-white/30 uppercase tracking-widest font-semibold">Zoom</span>
              <span className="text-[10px] text-white/30">{Math.round(zoom / minZoom * 100)}%</span>
            </div>
            <input
              type="range"
              min={minZoom}
              max={minZoom * 3}
              step={0.001}
              value={zoom}
              onChange={e => handleZoom(Number(e.target.value))}
              className="w-full"
              style={{ accentColor: 'var(--c-accent)' }}
            />
          </div>

          {/* Preview */}
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ background: 'var(--c-surface2)' }}>
            <div
              style={{
                ...prevBgStyle,
                width: PREV, height: PREV,
                borderRadius: '50%',
                flexShrink: 0,
                border: '2px solid var(--c-border-md)',
                backgroundColor: '#111',
              }}
            />
            <div>
              <div className="text-xs font-semibold text-white/70">Profile preview</div>
              <div className="text-[10px] text-white/30 mt-0.5">How your avatar will look</div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-xl text-sm text-white/40 hover:text-white/70 transition"
              style={{ background: 'var(--c-surface2)' }}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white/90 transition hover:opacity-90"
              style={{ background: 'var(--c-accent)' }}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Toast ───────────────────────────────────────────────────
function Toast({ message, visible }) {
  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] px-4 py-2 rounded-xl text-xs font-medium text-white/90 shadow-xl pointer-events-none transition-all duration-300"
      style={{
        background: 'var(--c-surface3)',
        border: '1px solid var(--c-border-md)',
        opacity: visible ? 1 : 0,
        transform: `translateX(-50%) translateY(${visible ? '0' : '8px'})`,
      }}
    >
      {message}
    </div>
  )
}

// ─── Copy button with toast ───────────────────────────────────
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <>
      <button
        onClick={handleCopy}
        className="text-[11px] text-white/25 hover:text-white/60 transition px-2 py-0.5 rounded-md hover:bg-white/[0.09]"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
      <Toast message="Code copied to clipboard!" visible={copied} />
    </>
  )
}

// ─── Shared inner content ─────────────────────────────────────
function SettingsContent({ user, onClose, onLogout }) {
  const [tab, setTab] = useState('profile')
  const { appearance, updateAppearance, updateStatus, updateAvatar } = useSettings()
  const [avatarPreview, setAvatarPreview] = useState(user.avatar_url || null)
  const [uploading, setUploading]         = useState(false)
  const [cropSrc, setCropSrc]             = useState(null)
  const fileInputRef = useRef(null)

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setCropSrc(ev.target.result)
    reader.readAsDataURL(file)
    // reset so same file can be re-selected
    e.target.value = ''
  }

  const handleCropConfirm = async (croppedDataUrl) => {
    setCropSrc(null)
    setUploading(true)
    setAvatarPreview(croppedDataUrl)
    await updateAvatar(croppedDataUrl)
    setUploading(false)
  }

  return (
    <>
      {cropSrc && (
        <CropModal
          src={cropSrc}
          onConfirm={handleCropConfirm}
          onCancel={() => setCropSrc(null)}
        />
      )}

      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-4 py-3 flex items-center justify-between flex-shrink-0" style={{ borderBottom: '1px solid var(--c-border)' }}>
          <span className="text-sm font-semibold text-white/70 tracking-wide">Settings</span>
          <button onClick={onClose} className="text-white/20 hover:text-white/60 transition">
            <IconX size={14} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-4 gap-1 flex-shrink-0" style={{ borderBottom: '1px solid var(--c-border)' }}>
          {[['profile', 'Profile'], ['appearance', 'Appearance']].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-3 py-2.5 text-xs font-medium transition border-b-2 -mb-px
                ${tab === key
                  ? 'text-white/85 border-[var(--c-accent)]'
                  : 'text-white/30 border-transparent hover:text-white/55'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {tab === 'profile'
            ? <ProfileTab
                user={user}
                avatarPreview={avatarPreview}
                uploading={uploading}
                fileInputRef={fileInputRef}
                onFileClick={() => fileInputRef.current?.click()}
                onFileChange={handleFileChange}
                onStatusChange={updateStatus}
              />
            : <AppearanceTab
                appearance={appearance}
                onUpdate={updateAppearance}
              />
          }
        </div>

        {/* Footer logout */}
        {tab === 'profile' && (
          <div className="px-4 pb-3 pt-1 flex-shrink-0" style={{ borderTop: '1px solid var(--c-border)' }}>
            <button
              onClick={() => { onClose(); onLogout?.() }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-red-400/70 hover:text-red-400 hover:bg-red-400/[0.08] transition text-left"
            >
              <IconLogOut size={14} />
              <span>Log out</span>
            </button>
          </div>
        )}
      </div>
    </>
  )
}

// ─── Floating modal ───────────────────────────────────────────
export default function SettingsModal({ user, onClose, onLogout }) {
  return (
    <>
      <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4" onClick={onClose}>
        <div
          className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
          style={{
            background: 'var(--c-surface)',
            border: '1px solid var(--c-border-md)',
            maxHeight: '88vh',
            display: 'flex',
            flexDirection: 'column',
          }}
          onClick={e => e.stopPropagation()}
        >
          <SettingsContent user={user} onClose={onClose} onLogout={onLogout} />
        </div>
      </div>
    </>
  )
}

// ─── Inline sidebar panel ─────────────────────────────────────
export function SettingsPanel({ user, onClose, onLogout }) {
  return (
    <div className="absolute inset-0 z-50 flex flex-col" style={{ background: 'var(--c-sidebar)' }}>
      <SettingsContent user={user} onClose={onClose} onLogout={onLogout} />
    </div>
  )
}

// ─── Profile tab ──────────────────────────────────────────────
function ProfileTab({ user, avatarPreview, uploading, fileInputRef, onFileClick, onFileChange, onStatusChange }) {
  const initials = `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase()
  const currentStatus = user.status || 'available'
  const statusCfg = STATUSES.find(s => s.value === currentStatus) ?? STATUSES[0]
  const [statusOpen, setStatusOpen] = useState(false)

  return (
    <div className="space-y-5">
      {/* Avatar */}
      <div className="flex flex-col items-center gap-3 pt-1">
        <div className="relative">
          <div
            className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center text-2xl font-medium select-none"
            style={{ background: 'var(--c-surface2)', color: 'rgba(255,255,255,0.35)' }}
          >
            {avatarPreview
              ? <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
              : initials
            }
          </div>
          <span
            className="absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full border-2"
            style={{ background: statusCfg.color, borderColor: 'var(--c-sidebar)' }}
          />
          <button
            onClick={onFileClick}
            disabled={uploading}
            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center text-white/90 transition hover:opacity-80 shadow-lg"
            style={{ background: 'var(--c-accent)' }}
          >
            {uploading
              ? <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin block" />
              : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
            }
          </button>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" />
        <div className="text-center">
          <div className="text-sm font-semibold text-white/85">{user.first_name} {user.last_name}</div>
          <div className="text-xs text-white/35 mt-0.5">@{user.username}</div>
        </div>
      </div>

      {/* Status */}
      <div>
        <div className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-2">Status</div>
        <button
          onClick={() => setStatusOpen(v => !v)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/80 transition hover:bg-white/[0.07]"
          style={{ background: 'var(--c-surface2)' }}
        >
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: statusCfg.color }} />
          <span className="flex-1 text-left">{statusCfg.label}</span>
          <span className={`transition-transform duration-200 ${statusOpen ? 'rotate-180' : ''}`}>
            <IconChevronDown size={13} stroke={1.8} />
          </span>
        </button>
        {statusOpen && (
          <div
            className="mt-1 rounded-xl overflow-hidden dropdown-in"
            style={{ background: 'var(--c-surface3)', border: '1px solid var(--c-border-md)' }}
          >
            {STATUSES.map(s => (
              <button
                key={s.value}
                onClick={() => { onStatusChange(s.value); setStatusOpen(false) }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition text-left
                  ${currentStatus === s.value ? 'text-white/90 bg-white/[0.07]' : 'text-white/50 hover:text-white/80 hover:bg-white/[0.06]'}`}
              >
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                <span className="flex-1">{s.label}</span>
                {currentStatus === s.value && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Unique code */}
      <div>
        <div className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-2">Unique code</div>
        <div
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
          style={{ background: 'var(--c-surface2)' }}
        >
          <span className="text-xs font-mono text-white/55 tracking-[0.15em] flex-1">{user.unique_code}</span>
          <CopyButton text={user.unique_code} />
        </div>
      </div>
    </div>
  )
}

// ─── Appearance tab ───────────────────────────────────────────
function AppearanceTab({ appearance, onUpdate }) {
  const isLight = THEMES[appearance.theme]?.light ?? false

  return (
    <div className="space-y-5">

      {/* Theme */}
      <div>
        <div className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-2.5">Theme</div>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(THEMES).map(([key, t]) => (
            <button
              key={key}
              onClick={() => onUpdate({ theme: key })}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs transition
                ${appearance.theme === key
                  ? 'ring-2 ring-[var(--c-accent)] bg-white/[0.05]'
                  : 'ring-1 ring-white/[0.07] hover:ring-white/[0.15]'}`}
            >
              <span
                className="w-4 h-4 rounded-full flex-shrink-0 border border-black/10"
                style={{ background: t['--c-bg'] }}
              />
              <span className="text-white/70">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Accent */}
      <div>
        <div className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-2.5">Accent</div>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(ACCENTS).map(([key, a]) => {
            const active = appearance.accent === key
            return (
              <button
                key={key}
                onClick={() => onUpdate({ accent: active && key !== 'indigo' ? 'indigo' : key })}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition
                  ${active
                    ? 'ring-2 ring-[var(--c-accent)] bg-white/[0.05]'
                    : 'ring-1 ring-white/[0.07] hover:ring-white/[0.15]'}`}
              >
                <span
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ background: a['--c-accent'] }}
                />
                <span className="text-white/70 flex-1 text-left">{a.label}</span>
                {active && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-white/60 flex-shrink-0">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </button>
            )
          })}
        </div>
        {appearance.accent !== 'indigo' && (
          <button
            onClick={() => onUpdate({ accent: 'indigo' })}
            className="mt-2 text-[10px] text-white/30 hover:text-white/55 transition"
          >
            ↩ Reset to default
          </button>
        )}
      </div>

      {/* Font size */}
      <div>
        <div className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-2.5">Font</div>
        <div className="flex rounded-xl overflow-hidden" style={{ background: 'var(--c-surface2)', border: '1px solid var(--c-border)' }}>
          {FONT_OPTS.map(o => (
            <button
              key={o.value}
              onClick={() => onUpdate({ fontSize: o.value })}
              className={`flex-1 py-2 text-xs transition
                ${appearance.fontSize === o.value
                  ? 'text-white/90 font-semibold bg-white/[0.07]'
                  : 'text-white/30 hover:text-white/60'}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Message density */}
      <div>
        <div className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-1">Density</div>
        <div className="text-[10px] text-white/20 mb-2.5">Affects sidebar rows and chat bubbles</div>
        <div className="flex rounded-xl overflow-hidden" style={{ background: 'var(--c-surface2)', border: '1px solid var(--c-border)' }}>
          {DENSITY_OPTS.map(o => (
            <button
              key={o.value}
              onClick={() => onUpdate({ density: o.value })}
              className={`flex-1 py-2 text-xs transition
                ${appearance.density === o.value
                  ? 'text-white/90 font-semibold bg-white/[0.07]'
                  : 'text-white/30 hover:text-white/60'}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Background pattern */}
      <div>
        <div className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-2.5">Background chat</div>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(PATTERNS).map(([key, pat]) => (
            <button
              key={key}
              onClick={() => onUpdate({ background: key })}
              className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition
                ${appearance.background === key
                  ? 'ring-2 ring-[var(--c-accent)] bg-white/[0.03]'
                  : 'ring-1 ring-white/[0.07] hover:ring-white/[0.15]'}`}
            >
              <div
                className="w-full h-8 rounded-lg"
                style={{
                  background: THEMES[appearance.theme]?.['--c-bg'] ?? '#0a0a0f',
                  backgroundImage: isLight ? pat.light : pat.dark,
                  backgroundSize: pat.size,
                }}
              />
              <span className="text-[10px] text-white/40">{pat.label}</span>
            </button>
          ))}
        </div>
      </div>

    </div>
  )
}
