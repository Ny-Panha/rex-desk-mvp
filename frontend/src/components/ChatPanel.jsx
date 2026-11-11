import { useRef, useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'
import MessageBubble from './MessageBubble'

export default function ChatPanel({ chatName, chatRole, messages, onSend, sending }) {
  const [text, setText] = useState('')
  const feedRef = useRef(null)
  const textareaRef = useRef(null)

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
      <div className="px-5 py-3 border-b border-slate-800 flex items-center gap-2 bg-slate-900/50">
        <h2 className="text-sm font-medium">{chatName}</h2>
        {chatRole && (
          <span className="text-[11px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
            {chatRole}
          </span>
        )}
      </div>

      {/* Message Feed */}
      <div ref={feedRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-slate-600">No messages yet. Start a conversation.</p>
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
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
            placeholder="Type a message..."
            rows={1}
            className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 resize-none outline-none max-h-40"
          />
          <button
            onClick={handleSubmit}
            disabled={!text.trim() || sending}
            className="flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center bg-indigo-500 text-white disabled:opacity-30 hover:bg-indigo-400 transition-colors"
          >
            <ArrowUp size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
