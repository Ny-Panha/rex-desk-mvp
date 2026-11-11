import { useState } from 'react'
import { X, UserPlus, Sparkles } from 'lucide-react'

export default function AddAgentModal({ onClose, onCreate }) {
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim() || !role.trim()) return
    setLoading(true)
    await onCreate(name.trim(), role.trim())
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-xs" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative bg-[#0f1623] border border-slate-700/80 rounded-2xl w-full max-w-sm shadow-2xl p-5 z-10 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <UserPlus size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">Add Custom Agent</h3>
              <p className="text-[10px] text-slate-400 font-mono">Extend autonomous team</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-800"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Agent Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Architect, Security Engineer"
              className="w-full bg-[#080c14] border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Role & Specialty
            </label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Database & API Architect"
              className="w-full bg-[#080c14] border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all"
            />
          </div>

          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-3 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || !role.trim() || loading}
              className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              {loading ? 'Creating...' : 'Create Agent'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
