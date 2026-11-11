import { useState } from 'react'
import { X, Plus, Clock, CheckCircle2, Loader2, Layers } from 'lucide-react'

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-xl w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Layers size={18} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">
                Background Job Queue
              </h3>
              <p className="text-[11px] text-slate-400">
                {pendingCount} pending · {runningCount} running
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors p-1 rounded-md hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        {/* Enqueue Form */}
        <form onSubmit={handleSubmit} className="p-4 border-b border-slate-800 bg-slate-950/40">
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Queue a New Background Task
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={taskText}
              onChange={(e) => setTaskText(e.target.value)}
              placeholder="e.g. Write a helper function formatCurrency(amount)"
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-indigo-500 transition-colors"
            />
            <button
              type="submit"
              disabled={!taskText.trim() || submitting}
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus size={14} />
              <span>Queue</span>
            </button>
          </div>
        </form>

        {/* Jobs List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {jobs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-xs text-slate-500">No jobs in queue yet.</p>
              <p className="text-[11px] text-slate-600 mt-1">
                Queue tasks to let agents work autonomously in background.
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

                return (
                  <div
                    key={job.id}
                    className="bg-slate-950/60 border border-slate-800 rounded-lg p-3 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-slate-200 line-clamp-1">
                        {job.task}
                      </span>
                      {isRunning && (
                        <span className="flex items-center gap-1 text-[10px] text-sky-400 bg-sky-500/10 border border-sky-500/30 px-2 py-0.5 rounded-full font-mono">
                          <Loader2 size={10} className="animate-spin" />
                          running
                        </span>
                      )}
                      {isCompleted && (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono">
                          <CheckCircle2 size={10} />
                          completed
                        </span>
                      )}
                      {isPending && (
                        <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full font-mono">
                          <Clock size={10} />
                          pending
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                      <span>Agent: {job.targetAgent || 'Dev'}</span>
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
        <div className="px-5 py-3 border-t border-slate-800 flex justify-end bg-slate-900/50">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
