import { useState, useEffect, useCallback } from 'react'
import Sidebar from './components/Sidebar'
import ChatPanel from './components/ChatPanel'
import AddAgentModal from './components/AddAgentModal'
import QueueModal from './components/QueueModal'

export default function App() {
  const [agents, setAgents] = useState([])
  const [activeChat, setActiveChat] = useState('group')
  const [messages, setMessages] = useState([])
  const [jobs, setJobs] = useState([])
  const [away, setAway] = useState({ isAway: false, awaySince: null, completedWhileAway: [] })
  const [showAddModal, setShowAddModal] = useState(false)
  const [showQueueModal, setShowQueueModal] = useState(false)
  const [sending, setSending] = useState(false)

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch('/api/agents')
      const data = await res.json()
      setAgents(data)
    } catch (err) {
      console.error('Failed to fetch agents:', err)
    }
  }, [])

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/messages?chatId=${activeChat}`)
      const data = await res.json()
      setMessages(data)
    } catch (err) {
      console.error('Failed to fetch messages:', err)
    }
  }, [activeChat])

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/jobs')
      const data = await res.json()
      setJobs(data)
    } catch (err) {
      console.error('Failed to fetch jobs:', err)
    }
  }, [])

  const fetchAwayState = useCallback(async () => {
    try {
      const res = await fetch('/api/away')
      const data = await res.json()
      setAway(data)
    } catch (err) {
      console.error('Failed to fetch away state:', err)
    }
  }, [])

  useEffect(() => {
    fetchAgents()
    fetchJobs()
    fetchAwayState()
  }, [fetchAgents, fetchJobs, fetchAwayState])

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  // Periodic poll for background jobs, messages, and away state (every 3.5s)
  useEffect(() => {
    const timer = setInterval(() => {
      fetchMessages()
      fetchJobs()
      fetchAwayState()
    }, 3500)
    return () => clearInterval(timer)
  }, [fetchMessages, fetchJobs, fetchAwayState])

  const handleSend = async (text) => {
    if (!text.trim() || sending) return
    setSending(true)
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: activeChat,
          text: text.trim(),
          senderName: 'You',
        }),
      })
      const newMessages = await res.json()
      setMessages((prev) => [...prev, ...newMessages])
      fetchJobs()
      fetchAwayState()
    } catch (err) {
      console.error('Failed to send message:', err)
    } finally {
      setSending(false)
    }
  }

  const handleCreateAgent = async (name, role) => {
    try {
      await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, role }),
      })
      await fetchAgents()
      setShowAddModal(false)
    } catch (err) {
      console.error('Failed to create agent:', err)
    }
  }

  const handleResolveApproval = async (approvalId, decision) => {
    try {
      const res = await fetch(`/api/approvals/${approvalId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
      })
      const data = await res.json()
      if (data.success) {
        await fetchMessages()
      }
    } catch (err) {
      console.error('Failed to resolve approval:', err)
    }
  }

  const handleToggleAway = async (newIsAway) => {
    try {
      const res = await fetch('/api/away/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAway: newIsAway }),
      })
      const data = await res.json()
      if (data.success) {
        setAway(data.away)
        await fetchMessages()
      }
    } catch (err) {
      console.error('Failed to toggle away mode:', err)
    }
  }

  const handleEnqueueJob = async (task) => {
    try {
      await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task, targetAgent: 'Dev' }),
      })
      await fetchJobs()
      await fetchMessages()
    } catch (err) {
      console.error('Failed to enqueue job:', err)
    }
  }

  const activeChatName =
    activeChat === 'group'
      ? 'Group Chat'
      : agents.find((a) => a.id === activeChat)?.name ?? 'Chat'

  const activeChatRole =
    activeChat !== 'group'
      ? agents.find((a) => a.id === activeChat)?.role
      : null

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans">
      <Sidebar
        agents={agents}
        activeChat={activeChat}
        onSelectChat={setActiveChat}
        onAddAgent={() => setShowAddModal(true)}
      />
      <ChatPanel
        chatName={activeChatName}
        chatRole={activeChatRole}
        messages={messages}
        onSend={handleSend}
        sending={sending}
        onResolveApproval={handleResolveApproval}
        away={away}
        jobs={jobs}
        onToggleAway={handleToggleAway}
        onOpenQueue={() => setShowQueueModal(true)}
      />
      {showAddModal && (
        <AddAgentModal
          onClose={() => setShowAddModal(false)}
          onCreate={handleCreateAgent}
        />
      )}
      {showQueueModal && (
        <QueueModal
          onClose={() => setShowQueueModal(false)}
          jobs={jobs}
          onEnqueue={handleEnqueueJob}
        />
      )}
    </div>
  )
}
