import { useRef, useEffect, useState } from 'react'
import { ArrowUp, Moon, Sun, Layers } from 'lucide-react'
import MessageBubble from './MessageBubble'

export default function ChatPanel({
  chatName,
  chatRole,
  messages,
  onSend,
  sending,
  onResolveApproval,
  away,
  jobs = [],
  onToggleAway,
  onOpenQueue,
}) {
  const [text, setText] = useState('')
  const feedRef = useRef(null)
  const textareaRef = useRef(null)

  const pendingJobsCount = jobs.filter(
    (j) => j.status === 'pending' || j.status === 'running'
  ).length

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight
    }
  }, [messages])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleSubmit = () => {
    if (!text.trim() || sending) return
    onSend(text)
    setText('')
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleInput = (e) => {
    setText(e.target.value)
    // Auto-resize textarea
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Chat Header */}
      <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between gap-2 bg-slate-900/50">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="text-sm font-medium truncate">{chatName}</h2>
          {chatRole && (
            <span className="text-[11px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded truncate">
              {chatRole}
            </span>
          )}
        </div>

        {/* Action Controls (Queue & Away Mode) */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Queue Button */}
          <button
            onClick={onOpenQueue}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer border border-slate-700/60"
            title="View or Add Background Jobs"
          >
            <Layers size={13} className="text-indigo-400" />
            <span>Queue</span>
            {pendingJobsCount > 0 && (
              <span className="bg-indigo-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                {pendingJobsCount}
              </span>
            )}
          </button>

          {/* Away Mode Button */}
          {away?.isAway ? (
            <button
              onClick={() => onToggleAway?.(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition-all cursor-pointer shadow-sm animate-pulse"
              title="Click when you return to get your Resume Briefing"
            >
              <Sun size={14} className="text-amber-400" />
              <span>I'm Back (Resume)</span>
            </button>
          ) : (
            <button
              onClick={() => onToggleAway?.(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition-colors cursor-pointer"
              title="Step away and let agents run queued tasks autonomously"
            >
              <Moon size={13} className="text-indigo-400" />
              <span>Step Away</span>
            </button>
          )}
        </div>
      </div>

      {/* Away Mode Sticky Banner */}
      {away?.isAway && (
        <div className="bg-amber-950/30 border-b border-amber-500/20 px-5 py-2 flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
            <span>
              <strong>Away Mode Active:</strong> Agents are working on background tasks. Click <em>"I'm Back"</em> anytime for your Resume Briefing.
            </span>
          </div>
          <button
            onClick={() => onToggleAway?.(false)}
            className="text-[11px] underline hover:text-white cursor-pointer font-medium"
          >
            Resume Now
          </button>
        </div>
      )}

      {/* Message Feed */}
      <div ref={feedRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-slate-600">No messages yet. Start a conversation.</p>
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            onResolveApproval={onResolveApproval}
          />
        ))}
      </div>

      {/* Input Bar */}
      <div className="p-3 border-t border-slate-800">
        <div className="flex items-end gap-2 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Type a message or /queue <task>..."
            rows={1}
            className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 resize-none outline-none max-h-40"
          />
          <button
            onClick={handleSubmit}
            disabled={!text.trim() || sending}
            className="flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center bg-indigo-500 text-white disabled:opacity-30 hover:bg-indigo-400 transition-colors cursor-pointer"
          >
            <ArrowUp size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
