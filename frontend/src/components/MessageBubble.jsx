import { ShieldAlert, Check, X, Lock } from 'lucide-react'

export default function MessageBubble({ message, onResolveApproval }) {
  const isAgent = message.isAgent
  const time = message.createdAt
    ? new Date(message.createdAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : ''

  if (isAgent) {
    // Approval Gate Card rendering
    if (message.isApproval) {
      const data = message.approvalData || {}
      const isPending = message.approvalStatus === 'pending'
      const isApproved = message.approvalStatus === 'approved'
      const isRejected = message.approvalStatus === 'rejected'

      return (
        <div className="flex justify-start">
          <div className="max-w-[85%] sm:max-w-[75%]">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-xs font-medium text-slate-300">
                {message.senderName}
              </span>
              {message.senderRole && (
                <span className="text-[10px] text-slate-500 bg-slate-800 px-1 py-0.5 rounded">
                  {message.senderRole}
                </span>
              )}
            </div>

            <div className="bg-slate-900 border-2 border-amber-500/40 rounded-xl p-4 shadow-lg shadow-amber-500/5 space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs tracking-wide uppercase">
                  <ShieldAlert size={16} className="text-amber-400 stroke-[2.2]" />
                  <span>Approval Gate Required</span>
                </div>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  {data.actionType || 'Action'}
                </span>
              </div>

              {/* Title & Description */}
              <div>
                <h4 className="text-sm font-semibold text-slate-100 mb-1">
                  {data.title || 'Critical Action Requested'}
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {data.description || message.text}
                </p>
              </div>

              {/* Target / Payload highlight */}
              {data.payload && (
                <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5 text-xs font-mono">
                  {data.payload.command && (
                    <div className="text-slate-400">
                      <span className="text-slate-500">$ </span>
                      <span className="text-emerald-300">{data.payload.command}</span>
                    </div>
                  )}
                  {data.payload.fileName && (
                    <div className="text-slate-400">
                      <span className="text-slate-500">Target File: </span>
                      <span className="text-rose-300">{data.payload.fileName}</span>
                    </div>
                  )}
                  {data.payload.branch && (
                    <div className="text-slate-400">
                      <span className="text-slate-500">Branch: </span>
                      <span className="text-sky-300">{data.payload.branch}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons or Resolution Status */}
              <div className="pt-1 flex items-center justify-between gap-2">
                {isPending ? (
                  <div className="flex items-center gap-2 w-full">
                    <button
                      onClick={() => onResolveApproval?.(message.approvalId, 'approve')}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition-colors shadow-sm cursor-pointer"
                    >
                      <Check size={14} className="stroke-[2.5]" />
                      Approve
                    </button>
                    <button
                      onClick={() => onResolveApproval?.(message.approvalId, 'reject')}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-rose-600/80 hover:bg-rose-600 text-white rounded-lg text-xs font-medium transition-colors shadow-sm cursor-pointer"
                    >
                      <X size={14} className="stroke-[2.5]" />
                      Reject
                    </button>
                  </div>
                ) : isApproved ? (
                  <div className="w-full flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-xs font-medium">
                    <Check size={15} className="stroke-[2.5]" />
                    <span>✓ Approved by Nha (Executed)</span>
                  </div>
                ) : isRejected ? (
                  <div className="w-full flex items-center gap-2 px-3 py-2 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-xs font-medium">
                    <X size={15} className="stroke-[2.5]" />
                    <span>✕ Rejected by Nha (Blocked)</span>
                  </div>
                ) : null}
              </div>
            </div>

            {time && (
              <p className="text-[10px] text-slate-600 mt-1 ml-1">{time}</p>
            )}
          </div>
        </div>
      )
    }

    return (
      <div className="flex justify-start">
        <div className="max-w-[75%]">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-xs font-medium text-slate-300">
              {message.senderName}
            </span>
            {message.senderRole && (
              <span className="text-[10px] text-slate-500 bg-slate-800 px-1 py-0.5 rounded">
                {message.senderRole}
              </span>
            )}
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2">
            <p className="text-sm text-slate-200 whitespace-pre-wrap break-words">
              {message.text}
            </p>
          </div>
          {time && (
            <p className="text-[10px] text-slate-600 mt-1 ml-1">{time}</p>
          )}
        </div>
      </div>
    )
  }

  // User message
  return (
    <div className="flex justify-end">
      <div className="max-w-[75%]">
        <div className="bg-indigo-500/20 border border-indigo-500/30 rounded-lg px-3 py-2">
          <p className="text-sm text-slate-100 whitespace-pre-wrap break-words">
            {message.text}
          </p>
        </div>
        {time && (
          <p className="text-[10px] text-slate-600 mt-1 text-right mr-1">{time}</p>
        )}
      </div>
    </div>
  )
}
