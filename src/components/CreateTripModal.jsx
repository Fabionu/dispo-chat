import { useState } from 'react'
import { IconX } from './Icons.jsx'
import { api } from '../services/api.js'

const inputStyle = (focused) => ({
  width: '100%',
  padding: '11px 14px',
  border: `1.5px solid ${focused ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.07)'}`,
  borderRadius: '9px',
  fontSize: '13px',
  background: focused ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.025)',
  color: 'rgba(255,255,255,0.85)',
  outline: 'none',
  transition: 'all 0.2s',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
})

const labelStyle = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 500,
  color: 'rgba(255,255,255,0.3)',
  marginBottom: '6px',
  letterSpacing: '0.02em',
  textTransform: 'uppercase',
}

function Field({ label, value, onChange, placeholder, type = 'text' }) {
  const [focused, setFocused] = useState(false)
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={inputStyle(focused)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </div>
  )
}

export default function CreateTripModal({ groupId, onCreated, onClose }) {
  const [form, setForm]       = useState({ vehicle_plate: '', origin: '', destination: '', date: new Date().toISOString().slice(0, 10) })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const set = (key) => (val) => setForm(f => ({ ...f, [key]: val }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { trip } = await api.createTrip({ group_id: groupId, ...form })
      onCreated(trip)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const valid = form.vehicle_plate && form.origin && form.destination && form.date

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#111118] border border-white/[0.05] rounded-2xl overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="px-6 py-5 border-b border-white/[0.05] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white/95">New Trip</h2>
          <button onClick={onClose} className="text-white/20 hover:text-white/60 transition">
            <IconX size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <Field
            label="Vehicle plate"
            value={form.vehicle_plate}
            onChange={set('vehicle_plate')}
            placeholder="e.g. B-123-XYZ"
          />
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Origin"
              value={form.origin}
              onChange={set('origin')}
              placeholder="City"
            />
            <Field
              label="Destination"
              value={form.destination}
              onChange={set('destination')}
              placeholder="City"
            />
          </div>
          <Field
            label="Date"
            value={form.date}
            onChange={set('date')}
            placeholder=""
            type="date"
          />

          {error && <p className="text-xs text-red-400/70">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !valid}
              style={{
                flex: 1,
                padding: '10px',
                background: loading || !valid ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.88)',
                border: 'none',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#0a0a0f',
                cursor: loading || !valid ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                fontFamily: 'inherit',
              }}
            >
              {loading ? 'Creating...' : 'Create trip'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
