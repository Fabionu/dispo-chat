import { useState } from 'react'
import { IconCopy, IconCheck, IconLogOut } from './Icons.jsx'

export default function ProfilePanel({ user, onLogout, onClose }) {
  const [copied, setCopied] = useState(false)

  const copyCode = () => {
    navigator.clipboard.writeText(user.unique_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const initials = `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase()

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />

      <div className="absolute bottom-16 left-2 right-2 z-50 bg-[#111118] border border-white/[0.04] rounded-2xl overflow-hidden shadow-xl shadow-black/60">

        {/* User info */}
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-full bg-white/6 flex items-center justify-center text-sm font-medium text-white/60 flex-shrink-0">
              {initials}
            </div>
            <div>
              <div className="text-sm font-medium text-white/95">
                {user.first_name} {user.last_name}
              </div>
              <div className="text-xs text-white/30 mt-0.5">@{user.username}</div>
            </div>
          </div>

          {/* Unique code */}
          <div className="space-y-1.5">
            <p className="text-[11px] text-white/20 tracking-widest uppercase">Your code</p>
            <button
              onClick={copyCode}
              className="w-full flex items-center justify-between px-4 py-3 bg-white/[0.03] hover:bg-white/[0.06] rounded-xl transition group"
            >
              <span className="font-mono text-lg font-medium text-white/90 tracking-widest">
                {user.unique_code}
              </span>
              <span className="text-white/20 group-hover:text-white/50 transition">
                {copied
                  ? <IconCheck size={13} color="rgba(52,211,153,0.7)" />
                  : <IconCopy size={13} />
                }
              </span>
            </button>
            <p className="text-[11px] text-white/15 leading-relaxed px-0.5">
              Others can find and add you using this code.
            </p>
          </div>
        </div>

        {/* Sign out */}
        <div className="border-t border-white/[0.05] px-2 py-2">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-white/30 hover:text-red-400/80 hover:bg-red-500/[0.06] transition"
          >
            <IconLogOut size={13} />
            Sign out
          </button>
        </div>
      </div>
    </>
  )
}
