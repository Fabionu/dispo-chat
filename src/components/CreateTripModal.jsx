import { useState } from 'react'
import { IconX } from './Icons.jsx'
import { api } from '../services/api.js'

function Field({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-1.5">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl px-4 py-2.5 text-sm text-white/90 placeholder-white/25 outline-none transition"
        style={{ background: 'var(--c-surface2)', border: '1.5px solid var(--c-border-md)', boxSizing: 'border-box' }}
        onFocus={e => e.target.style.borderColor = 'var(--c-accent)'}
        onBlur={e => e.target.style.borderColor  = 'var(--c-border-md)'}
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
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border-md)' }}
      >
        {/* Header */}
        <div
          className="px-6 py-5 flex items-center justify-between"
          style={{ borderBottom: '1px solid var(--c-border)' }}
        >
          <h2 className="text-sm font-semibold text-white/90">New Trip</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white/70 transition">
            <IconX size={15} stroke={2.2} />
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
              className="flex-1 py-2.5 rounded-xl text-sm text-white/35 hover:text-white/65 transition"
              style={{ background: 'var(--c-surface2)' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !valid}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white/90 transition hover:opacity-85 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: 'var(--c-accent)' }}
            >
              {loading ? 'Creating…' : 'Create trip'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
