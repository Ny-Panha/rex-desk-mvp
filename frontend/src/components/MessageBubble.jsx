export default function MessageBubble({ message }) {
  const isAgent = message.isAgent
  const time = message.createdAt
    ? new Date(message.createdAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : ''

  if (isAgent) {
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
