import { ShieldAlert, Check, X, Sun, Bot, User, Code2, Terminal } from 'lucide-react'

// Render bold (**text**) and inline code (`code`) inside non-code-block text
function renderInlineFormatting(paragraph) {
  if (!paragraph || typeof paragraph !== 'string') return paragraph
  const tokens = paragraph.split(/(\*\*[\s\S]*?\*\*|`[^`\n]+`)/g)
  if (tokens.length === 1) return paragraph

  return tokens.map((token, i) => {
    if (token.startsWith('**') && token.endsWith('**') && token.length >= 4) {
      return (
        <strong key={i} className="font-bold text-white">
          {token.slice(2, -2)}
        </strong>
      )
    }
    if (token.startsWith('`') && token.endsWith('`') && token.length >= 2) {
      return (
        <code
          key={i}
          className="px-1.5 py-0.5 rounded bg-[#101726] text-emerald-300 font-mono text-[11px] border border-slate-700/70 inline-block align-middle my-0.5"
        >
          {token.slice(1, -1)}
        </code>
      )
    }
    return token
  })
}

// Lightweight parser for code blocks, inline code, and formatting
function FormattedContent({ text = '' }) {
  // If text contains triple-backtick code blocks
  if (text.includes('```')) {
    const parts = text.split(/(```[\s\S]*?```)/g)
    return (
      <div className="space-y-2">
        {parts.map((part, idx) => {
          if (part.startsWith('```') && part.endsWith('```')) {
            const lines = part.slice(3, -3).trim().split('\n')
            const firstLine = lines[0].trim()
            const hasLang = /^[a-zA-Z0-9_\-]+$/.test(firstLine)
            const lang = hasLang ? firstLine : 'code'
            const code = hasLang ? lines.slice(1).join('\n') : lines.join('\n')

            return (
              <div
                key={idx}
                className="bg-[#080c14] border border-slate-800/80 rounded-xl overflow-hidden my-2.5 shadow-md"
              >
                <div className="bg-slate-900/90 px-3 py-1.5 border-b border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Code2 size={12} className="text-indigo-400" />
                    <span>{lang}</span>
                  </div>
                  <span className="text-slate-600">read-only</span>
                </div>
                <pre className="p-3 text-xs font-mono text-emerald-300 overflow-x-auto leading-relaxed">
                  <code>{code}</code>
                </pre>
              </div>
            )
          }

          return (
            <p key={idx} className="whitespace-pre-wrap leading-relaxed break-words text-slate-200">
              {renderInlineFormatting(part)}
            </p>
          )
        })}
      </div>
    )
  }

  return (
    <p className="whitespace-pre-wrap leading-relaxed break-words text-slate-200">
      {renderInlineFormatting(text)}
    </p>
  )
}

export default function MessageBubble({ message, onResolveApproval }) {
  const isAgent = message.isAgent
  const time = message.createdAt
    ? new Date(message.createdAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : ''

  // Agent role styling
  const getRoleBadgeStyle = (role = '') => {
    const r = role.toLowerCase()
    if (r.includes('lead') || r.includes('orchestrator')) {
      return 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
    }
    if (r.includes('dev') || r.includes('fullstack')) {
      return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
    }
    if (r.includes('qa') || r.includes('security') || r.includes('quality')) {
      return 'bg-sky-500/15 text-sky-300 border-sky-500/30'
    }
    return 'bg-slate-500/15 text-slate-300 border-slate-500/30'
  }

  if (isAgent) {
    // 1. Resume Briefing Card
    if (message.isBriefing) {
      return (
        <div className="flex justify-start my-2">
          <div className="max-w-[92%] sm:max-w-[85%] w-full">
            <div className="flex items-center gap-2 mb-1.5 px-1">
              <span className="text-xs font-semibold text-amber-300">
                {message.senderName}
              </span>
              <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 rounded-full">
                Resume Briefing
              </span>
              {time && <span className="text-[10px] text-slate-500 font-mono ml-auto">{time}</span>}
            </div>

            <div className="bg-gradient-to-br from-indigo-950/40 via-[#0f1624] to-amber-950/20 border-2 border-indigo-500/40 rounded-2xl p-4 shadow-xl shadow-indigo-500/5 space-y-3">
              <div className="flex items-center justify-between border-b border-indigo-500/20 pb-2.5">
                <div className="flex items-center gap-2 text-indigo-300 font-semibold text-xs uppercase tracking-wide">
                  <Sun size={16} className="text-amber-400 stroke-[2.2]" />
                  <span>Morning / Resume Briefing</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  Autonomous Sync
                </span>
              </div>
              <FormattedContent text={message.text} />
            </div>
          </div>
        </div>
      )
    }

    // 2. Approval Gate Card
    if (message.isApproval) {
      const data = message.approvalData || {}
      const isPending = message.approvalStatus === 'pending'
      const isApproved = message.approvalStatus === 'approved'
      const isRejected = message.approvalStatus === 'rejected'

      return (
        <div className="flex justify-start my-2">
          <div className="max-w-[92%] sm:max-w-[85%] w-full">
            <div className="flex items-center gap-2 mb-1.5 px-1">
              <span className="text-xs font-semibold text-slate-200">
                {message.senderName}
              </span>
              {message.senderRole && (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full border ${getRoleBadgeStyle(
                    message.senderRole
                  )}`}
                >
                  {message.senderRole}
                </span>
              )}
              {time && <span className="text-[10px] text-slate-500 font-mono ml-auto">{time}</span>}
            </div>

            <div className="bg-[#0f1623] border-2 border-amber-500/50 rounded-2xl p-4 shadow-xl shadow-amber-500/5 space-y-3.5">
              {/* Header */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
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
                <h4 className="text-sm font-semibold text-white mb-1">
                  {data.title || 'Critical Action Requested'}
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {data.description || message.text}
                </p>
              </div>

              {/* Payload Highlight */}
              {data.payload && (
                <div className="bg-[#080c14] border border-slate-800 rounded-xl p-3 text-xs font-mono space-y-1">
                  {data.payload.command && (
                    <div className="text-slate-300 flex items-center gap-1.5">
                      <span className="text-slate-500">$</span>
                      <span className="text-emerald-300 font-semibold">{data.payload.command}</span>
                    </div>
                  )}
                  {data.payload.fileName && (
                    <div className="text-slate-300 flex items-center gap-1.5">
                      <span className="text-slate-500">Target File:</span>
                      <span className="text-rose-300 font-semibold">{data.payload.fileName}</span>
                    </div>
                  )}
                  {data.payload.branch && (
                    <div className="text-slate-300 flex items-center gap-1.5">
                      <span className="text-slate-500">Branch:</span>
                      <span className="text-sky-300 font-semibold">{data.payload.branch}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Resolution Buttons */}
              <div className="pt-1 flex items-center gap-2.5">
                {isPending ? (
                  <>
                    <button
                      onClick={() => onResolveApproval?.(message.approvalId, 'approve')}
                      className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
                    >
                      <Check size={14} className="stroke-[2.5]" />
                      Approve Action
                    </button>
                    <button
                      onClick={() => onResolveApproval?.(message.approvalId, 'reject')}
                      className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-rose-600/80 hover:bg-rose-600 active:scale-98 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-rose-600/20 cursor-pointer"
                    >
                      <X size={14} className="stroke-[2.5]" />
                      Reject Action
                    </button>
                  </>
                ) : isApproved ? (
                  <div className="w-full flex items-center gap-2 px-3.5 py-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-semibold">
                    <Check size={15} className="stroke-[2.5]" />
                    <span>✓ Approved by Nha (Executed on Workspace)</span>
                  </div>
                ) : isRejected ? (
                  <div className="w-full flex items-center gap-2 px-3.5 py-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-semibold">
                    <X size={15} className="stroke-[2.5]" />
                    <span>✕ Rejected by Nha (Blocked safely)</span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )
    }

    // 3. Normal Agent Message
    const isError =
      typeof message.text === 'string' &&
      (message.text.startsWith('⚠️') || message.text.startsWith('Error processing'))

    return (
      <div className="flex justify-start my-1.5">
        <div className="max-w-[92%] sm:max-w-[85%]">
          <div className="flex items-center gap-2 mb-1 px-1">
            <span className="text-xs font-semibold text-slate-200">
              {message.senderName}
            </span>
            {message.senderRole && (
              <span
                className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full border ${getRoleBadgeStyle(
                  message.senderRole
                )}`}
              >
                {message.senderRole}
              </span>
            )}
            {isError && (
              <span className="text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30">
                Agent Error
              </span>
            )}
            {time && <span className="text-[10px] text-slate-500 font-mono ml-auto">{time}</span>}
          </div>

          <div
            className={`rounded-2xl rounded-tl-xs p-4 shadow-sm ${
              isError
                ? 'bg-[#150e14] border-2 border-rose-500/50 shadow-rose-500/10'
                : 'bg-[#0f1623] border border-slate-800/90'
            }`}
          >
            <FormattedContent text={message.text} />
          </div>
        </div>
      </div>
    )
  }

  // User Message
  return (
    <div className="flex justify-end my-1.5">
      <div className="max-w-[85%] sm:max-w-[75%]">
        <div className="flex items-center justify-end gap-1.5 mb-1 px-1">
          <span className="text-[10px] text-slate-500 font-mono">{time}</span>
          <span className="text-xs font-medium text-indigo-300">You</span>
        </div>
        <div className="bg-gradient-to-r from-indigo-600/25 to-indigo-500/20 border border-indigo-500/40 rounded-2xl rounded-tr-xs px-4 py-2.5 shadow-sm">
          <p className="text-sm text-slate-100 whitespace-pre-wrap leading-relaxed break-words">
            {message.text}
          </p>
        </div>
      </div>
    </div>
  )
}
