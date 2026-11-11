import { useState, useEffect, useCallback } from 'react'
import Sidebar from './components/Sidebar'
import ChatPanel from './components/ChatPanel'
import AddAgentModal from './components/AddAgentModal'

export default function App() {
  const [agents, setAgents] = useState([])
  const [activeChat, setActiveChat] = useState('group')
  const [messages, setMessages] = useState([])
  const [showAddModal, setShowAddModal] = useState(false)
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

  useEffect(() => {
    fetchAgents()
  }, [fetchAgents])

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

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
      />
      {showAddModal && (
        <AddAgentModal
          onClose={() => setShowAddModal(false)}
          onCreate={handleCreateAgent}
        />
      )}
    </div>
  )
}
