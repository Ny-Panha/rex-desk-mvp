import { Users, Plus, Bot, Terminal, ShieldCheck, Sparkles } from 'lucide-react'

export default function Sidebar({
  agents,
  activeChat,
  onSelectChat,
  onAddAgent,
  backendOnline = true,
  modelName = '',
}) {
  const getAgentRoleBadge = (role = '') => {
    const r = role.toLowerCase()
    if (r.includes('lead') || r.includes('orchestrator')) {
      return {
        label: 'Lead',
        badge: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
        dot: 'bg-indigo-400',
      }
    }
    if (r.includes('dev') || r.includes('fullstack')) {
      return {
        label: 'Dev',
        badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
        dot: 'bg-emerald-400',
      }
    }
    if (r.includes('qa') || r.includes('security') || r.includes('quality')) {
      return {
        label: 'QA',
        badge: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
        dot: 'bg-sky-400',
      }
    }
    return {
      label: 'Agent',
      badge: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
      dot: 'bg-slate-400',
    }
  }

  return (
    <aside className="w-72 flex-shrink-0 bg-[#0d121d] border-r border-slate-800/80 flex flex-col h-screen select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Bot size={18} className="stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold tracking-tight text-white">Rex Desk</span>
                <span className="text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  MVP
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono">Autonomous Team</p>
            </div>
          </div>
          {backendOnline ? (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-[10px] font-medium text-emerald-400">Live</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
              <span className="text-[10px] font-medium text-rose-400">Offline</span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Workspace Channels */}
        <div>
          <div className="px-2 mb-1.5 flex items-center justify-between">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider font-mono">
              Workspaces
            </span>
          </div>
          <button
            onClick={() => onSelectChat('group')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              activeChat === 'group'
                ? 'bg-gradient-to-r from-indigo-600/20 to-indigo-500/10 text-indigo-200 border border-indigo-500/40 shadow-xs'
                : 'text-slate-300 hover:bg-slate-800/60 hover:text-slate-100 border border-transparent'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                  activeChat === 'group'
                    ? 'bg-indigo-500 text-white shadow-xs'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                <Users size={13} />
              </div>
              <span>Group Chat</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded">
              {agents.length} Agents
            </span>
          </button>
        </div>

        {/* Individual Agents */}
        <div>
          <div className="px-2 mb-1.5 flex items-center justify-between">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider font-mono">
              Autonomous Agents ({agents.length})
            </span>
          </div>
          <div className="space-y-1">
            {agents.map((agent) => {
              const meta = getAgentRoleBadge(agent.role)
              const isSelected = activeChat === agent.id

              return (
                <button
                  key={agent.id}
                  onClick={() => onSelectChat(agent.id)}
                  className={`w-full flex items-center justify-between p-2 rounded-xl text-xs transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-800/90 text-white border border-slate-700/80 shadow-xs'
                      : 'text-slate-300 hover:bg-slate-800/40 hover:text-slate-100 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative flex-shrink-0">
                      <div
                        className="w-7 h-7 rounded-xl flex items-center justify-center text-xs font-semibold text-white shadow-xs"
                        style={{ backgroundColor: agent.avatarColor || '#6366f1' }}
                      >
                        {agent.name?.[0]?.toUpperCase()}
                      </div>
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-slate-900 ${
                          backendOnline ? meta.dot : 'bg-slate-500'
                        }`}
                      ></span>
                    </div>
                    <div className="flex flex-col items-start min-w-0">
                      <span className="font-medium text-slate-200 truncate w-full text-left">
                        {agent.name}
                      </span>
                      <span className="text-[10px] text-slate-400 truncate w-full text-left">
                        {agent.role}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`text-[9px] font-mono font-medium px-1.5 py-0.5 rounded border uppercase flex-shrink-0 ${meta.badge}`}
                  >
                    {meta.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Footer Info & Actions */}
      <div className="p-3 border-t border-slate-800/80 space-y-2.5 bg-[#0a0e17]">
        {/* Workspace status badge */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-2 text-slate-400">
            <Terminal size={13} className={backendOnline ? 'text-emerald-400' : 'text-rose-400'} />
            <span className="font-mono text-slate-300">
              {backendOnline ? 'Sandbox: Active' : 'Sandbox: Offline'}
            </span>
          </div>
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Flash-Lite
          </span>
        </div>

        {/* Add Agent Button */}
        <button
          onClick={onAddAgent}
          className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800 transition-all border border-slate-700/60 border-dashed cursor-pointer"
        >
          <Plus size={13} />
          <span>Add Custom Agent</span>
        </button>
      </div>
    </aside>
  )
}
