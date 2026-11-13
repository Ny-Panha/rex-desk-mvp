import { useState } from 'react'
import { X, Plus, Clock, CheckCircle2, Loader2, Layers, Bot, AlertTriangle } from 'lucide-react'

export default function QueueModal({ onClose, jobs, onEnqueue }) {
  const [taskText, setTaskText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!taskText.trim() || submitting) return
    setSubmitting(true)
    try {
      await onEnqueue(taskText.trim())
      setTaskText('')
    } finally {
      setSubmitting(false)
    }
  }

  const pendingCount = jobs.filter((j) => j.status === 'pending').length
  const runningCount = jobs.filter((j) => j.status === 'running').length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-xs" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="relative bg-[#0f1623] border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh] z-10 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Layers size={17} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                Background Job Queue
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                {pendingCount} pending · {runningCount} active running
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-800"
          >
            <X size={17} />
          </button>
        </div>

        {/* Enqueue Form */}
        <form onSubmit={handleSubmit} className="p-4 border-b border-slate-800 bg-[#0a0e17]">
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Enqueue Autonomous Task
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={taskText}
              onChange={(e) => setTaskText(e.target.value)}
              placeholder="e.g. Write a helper function formatCurrency(amount)"
              className="flex-1 bg-[#0f1623] border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all font-mono"
            />
            <button
              type="submit"
              disabled={!taskText.trim() || submitting}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/30 cursor-pointer active:scale-95 flex-shrink-0"
            >
              <Plus size={14} />
              <span>{submitting ? 'Adding...' : 'Enqueue'}</span>
            </button>
          </div>
        </form>

        {/* Jobs List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {jobs.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-10 h-10 rounded-xl bg-slate-800/60 flex items-center justify-center text-slate-500 mx-auto mb-2">
                <Layers size={18} />
              </div>
              <p className="text-xs font-medium text-slate-400">No jobs in queue yet.</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Queue tasks to let Dev & QA work autonomously while you step away.
              </p>
            </div>
          ) : (
            jobs
              .slice()
              .reverse()
              .map((job) => {
                const isRunning = job.status === 'running'
                const isCompleted = job.status === 'completed'
                const isPending = job.status === 'pending'
                const isFailed = job.status === 'failed'

                return (
                  <div
                    key={job.id}
                    className="bg-[#0a0e17] border border-slate-800/90 rounded-xl p-3 space-y-2 shadow-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-100 line-clamp-1">
                        {job.task}
                      </span>
                      {isRunning && (
                        <span className="flex items-center gap-1 text-[10px] text-sky-400 bg-sky-500/10 border border-sky-500/30 px-2 py-0.5 rounded-full font-mono font-medium">
                          <Loader2 size={10} className="animate-spin" />
                          running
                        </span>
                      )}
                      {isCompleted && (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono font-medium">
                          <CheckCircle2 size={10} />
                          completed
                        </span>
                      )}
                      {isFailed && (
                        <span className="flex items-center gap-1 text-[10px] text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded-full font-mono font-medium">
                          <AlertTriangle size={10} />
                          failed
                        </span>
                      )}
                      {isPending && (
                        <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full font-mono font-medium">
                          <Clock size={10} />
                          pending
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <div className="flex items-center gap-1.5">
                        <Bot size={11} className="text-indigo-400" />
                        <span>Worker: {job.targetAgent || 'Dev'}</span>
                      </div>
                      <span>
                        {job.createdAt
                          ? new Date(job.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })
                          : ''}
                      </span>
                    </div>
                  </div>
                )
              })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-800 flex justify-end bg-[#0a0e17]">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
