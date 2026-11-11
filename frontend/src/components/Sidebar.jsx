import { Hash, Plus } from 'lucide-react'

export default function Sidebar({ agents, activeChat, onSelectChat, onAddAgent }) {
  return (
    <aside className="w-72 flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col h-screen">
      {/* Header */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold tracking-tight">Rex Desk</span>
          <span className="text-[10px] font-medium bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded">
            Active
          </span>
        </div>
      </div>

      {/* Group Chat */}
      <div className="p-2">
        <button
          onClick={() => onSelectChat('group')}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors ${
            activeChat === 'group'
              ? 'bg-indigo-500/15 text-indigo-300'
              : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          <Hash size={16} className="flex-shrink-0" />
          <span>Group Chat</span>
        </button>
      </div>

      {/* Agents Section */}
      <div className="px-4 pt-3 pb-1">
        <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
          Agents
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
        {agents.map((agent) => (
          <button
            key={agent.id}
            onClick={() => onSelectChat(agent.id)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-colors ${
              activeChat === agent.id
                ? 'bg-indigo-500/15 text-indigo-300'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium text-white flex-shrink-0"
              style={{ backgroundColor: agent.avatarColor || '#6366f1' }}
            >
              {agent.name?.[0]?.toUpperCase()}
            </div>
            <div className="flex flex-col items-start min-w-0">
              <span className="truncate w-full text-left">{agent.name}</span>
              <span className="text-[11px] text-slate-500 truncate w-full text-left">
                {agent.role}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Add Agent Button */}
      <div className="p-3 border-t border-slate-800">
        <button
          onClick={onAddAgent}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors border border-slate-700 border-dashed"
        >
          <Plus size={14} />
          <span>Add Agent</span>
        </button>
      </div>
    </aside>
  )
}
