import { useRef, useEffect, useState } from 'react'
import { ArrowUp, Moon, Sun, Layers, Users, Bot, Sparkles, Send } from 'lucide-react'
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
  backendOnline = true,
  modelName = '',
}) {
  const [text, setText] = useState('')
  const [sendError, setSendError] = useState(null)
  const [isNearBottom, setIsNearBottom] = useState(true)
  const [hasUnreadBelow, setHasUnreadBelow] = useState(false)
  const feedRef = useRef(null)
  const textareaRef = useRef(null)
  const prevMessagesLengthRef = useRef(messages.length)

  const pendingJobsCount = jobs.filter(
    (j) => j.status === 'pending' || j.status === 'running'
  ).length

  const handleScroll = () => {
    if (!feedRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = feedRef.current
    const distanceFromBottom = scrollHeight - (scrollTop + clientHeight)
    const near = distanceFromBottom <= 120
    setIsNearBottom(near)
    if (near) {
      setHasUnreadBelow(false)
    }
  }

  const scrollToBottom = () => {
    if (feedRef.current) {
      feedRef.current.scrollTo({
        top: feedRef.current.scrollHeight,
        behavior: 'smooth',
      })
      setHasUnreadBelow(false)
      setIsNearBottom(true)
    }
  }

  // Auto-scroll on new messages ONLY when near bottom
  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current) {
      if (isNearBottom) {
        if (feedRef.current) {
          feedRef.current.scrollTop = feedRef.current.scrollHeight
        }
        setHasUnreadBelow(false)
      } else {
        setHasUnreadBelow(true)
      }
    }
    prevMessagesLengthRef.current = messages.length
  }, [messages, isNearBottom])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleSubmit = async () => {
    if (!text.trim() || sending) return
    setSendError(null)
    const success = await onSend(text)
    if (success) {
      setText('')
      setSendError(null)
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    } else {
      setSendError('Send failed — backend unreachable. Your message is still in the box.')
    }
  }

  const handleInput = (e) => {
    setText(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'
  }

  const handleQuickChip = (prompt) => {
    setText(prompt)
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }

  const isGroup = chatName === 'Group Chat'

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#0b0f17] h-screen">
      {/* Top Header */}
      <div className="px-6 py-3.5 border-b border-slate-800/80 flex items-center justify-between gap-3 bg-[#0d121d]/90 backdrop-blur-md z-10">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${
              isGroup
                ? 'bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white'
                : 'bg-slate-800 text-indigo-300'
            }`}
          >
            {isGroup ? <Users size={16} /> : <Bot size={16} />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-tight truncate">
                {chatName}
              </h2>
              {chatRole && (
                <span className="text-[10px] font-mono text-slate-400 bg-slate-800/80 border border-slate-700/60 px-1.5 py-0.5 rounded truncate">
                  {chatRole}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  backendOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                }`}
              ></span>
              <span>
                {backendOnline
                  ? isGroup
                    ? 'Multi-Agent Autonomous Session'
                    : 'Direct Agent Channel'
                  : 'Backend Offline'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Queue Button */}
          <button
            onClick={onOpenQueue}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-[#141d2d] hover:bg-slate-800 text-slate-200 border border-slate-700/80 transition-all cursor-pointer shadow-xs active:scale-95"
            title="View or Add Background Jobs"
          >
            <Layers size={13} className="text-indigo-400" />
            <span>Queue</span>
            {pendingJobsCount > 0 ? (
              <span className="bg-indigo-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold">
                {pendingJobsCount}
              </span>
            ) : (
              <span className="text-slate-500 text-[10px] font-mono">0</span>
            )}
          </button>

          {/* Away Mode Button */}
          {away?.isAway ? (
            <button
              onClick={() => onToggleAway?.(false)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-amber-500/25 to-amber-600/20 hover:from-amber-500/35 hover:to-amber-600/30 text-amber-200 border border-amber-500/40 transition-all cursor-pointer shadow-md shadow-amber-500/10 animate-pulse active:scale-95"
              title="Click when you return to receive your Morning / Resume Briefing"
            >
              <Sun size={14} className="text-amber-400 stroke-[2.2]" />
              <span>I'm Back (Resume)</span>
            </button>
          ) : (
            <button
              onClick={() => onToggleAway?.(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-[#141d2d] hover:bg-slate-800 text-slate-300 border border-slate-700/80 transition-all cursor-pointer active:scale-95"
              title="Step away and let agents execute queued tasks in the background"
            >
              <Moon size={13} className="text-indigo-400" />
              <span>Step Away</span>
            </button>
          )}
        </div>
      </div>

      {/* Offline Alert Banner */}
      {!backendOnline && (
        <div className="bg-rose-950/80 border-b border-rose-800/80 px-6 py-2 text-xs text-rose-300 font-mono flex items-center justify-between z-10">
          <span>Backend offline — start the backend: cd backend &amp;&amp; node server.js (port 5001)</span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-rose-900/60 text-rose-200 border border-rose-700/60">
            Offline
          </span>
        </div>
      )}

      {/* Sticky Away Banner */}
      {away?.isAway && (
        <div className="bg-gradient-to-r from-amber-950/40 via-amber-900/20 to-slate-900 border-b border-amber-500/30 px-6 py-2.5 flex items-center justify-between text-xs text-amber-200 backdrop-blur-sm z-10">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
            </span>
            <span>
              <strong>Away Mode Active:</strong> Agents are working on background tasks. Click{' '}
              <span className="underline font-semibold cursor-pointer" onClick={() => onToggleAway?.(false)}>
                "I'm Back"
              </span>{' '}
              whenever you return for your Resume Briefing.
            </span>
          </div>
          <button
            onClick={() => onToggleAway?.(false)}
            className="text-[11px] font-semibold text-amber-300 hover:text-white bg-amber-500/20 border border-amber-500/30 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
          >
            Resume Now
          </button>
        </div>
      )}

      {/* Message Feed Container (Constrained width for comfortable reading) */}
      <div ref={feedRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 sm:p-6 relative">
        <div className="max-w-4xl mx-auto space-y-3.5">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3 shadow-inner">
                <Sparkles size={22} />
              </div>
              <h3 className="text-sm font-semibold text-slate-200 mb-1">
                Rex Desk Autonomous Session
              </h3>
              <p className="text-xs text-slate-400 max-w-sm">
                Ask Rex to route tasks, let Dev code in the sandbox, or let QA Reviewer inspect the diffs.
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                onResolveApproval={onResolveApproval}
              />
            ))
          )}

          {/* Working Indicator Bubble */}
          {sending && (
            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#0f1623]/90 border border-indigo-500/30 text-xs text-slate-200 shadow-md">
              <div className="w-7 h-7 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 flex-shrink-0 animate-pulse">
                <Bot size={15} />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-indigo-300">
                  <span>Rex Desk is working…</span>
                  <span className="flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.4s]"></span>
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-mono">
                  (Group Chat Dev+QA can take 1-4 minutes)
                </p>
              </div>
            </div>
          )}

          {/* Floating New Messages Button */}
          {hasUnreadBelow && (
            <div className="sticky bottom-2 flex justify-center z-20 pointer-events-none">
              <button
                type="button"
                onClick={scrollToBottom}
                className="pointer-events-auto flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-600/40 border border-indigo-400/40 cursor-pointer transition-all active:scale-95 animate-bounce"
              >
                <span>↓ New messages</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Input Section (Constrained max-w-4xl) */}
      <div className="p-4 border-t border-slate-800/80 bg-[#0d121d]/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto space-y-2">
          {/* Send Error Notice */}
          {sendError && (
            <div className="text-[11px] text-rose-300 bg-rose-500/15 border border-rose-500/30 px-3 py-1.5 rounded-xl font-mono flex items-center justify-between">
              <span>{sendError}</span>
              <button
                type="button"
                onClick={() => setSendError(null)}
                className="text-rose-400 hover:text-white text-xs ml-2 cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>
          )}

          {/* Quick Action Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] text-slate-400 font-mono no-scrollbar">
            <span className="text-slate-500 mr-1 text-[10px]">Quick Prompts:</span>
            <button
              onClick={() => handleQuickChip('/queue ')}
              className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-slate-300 transition-colors cursor-pointer whitespace-nowrap"
            >
              📋 /queue &lt;task&gt;
            </button>
            <button
              onClick={() => handleQuickChip('សូមជួយ review code លើ file ')}
              className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-slate-300 transition-colors cursor-pointer whitespace-nowrap"
            >
              🔍 Review Code
            </button>
            <button
              onClick={() => handleQuickChip('សូមជួយ push code ទៅ GitHub')}
              className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-slate-300 transition-colors cursor-pointer whitespace-nowrap"
            >
              🔒 Push to GitHub
            </button>
          </div>

          {/* Text Input Container */}
          <div className="flex items-end gap-2 bg-[#0f1623] border border-slate-700/80 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 rounded-2xl p-2.5 shadow-lg transition-all">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Ask Rex Desk a task, or type /queue <task>..."
              rows={1}
              className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 resize-none outline-none max-h-40 px-1 py-0.5 leading-relaxed"
            />
            <button
              onClick={handleSubmit}
              disabled={!text.trim() || sending}
              className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed text-white shadow-md shadow-indigo-600/30 transition-all cursor-pointer active:scale-95"
            >
              <Send size={14} className="stroke-[2.2]" />
            </button>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono px-1">
            <span>Press Enter to send · Shift+Enter for new line</span>
            <span>Gemini 3.5 Flash-Lite</span>
          </div>
        </div>
      </div>
    </div>
  )
}
