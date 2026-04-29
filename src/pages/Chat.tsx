import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { messageApi, Conversation, Message, friendApi, FriendListItem } from '../services/api'
import { ChatBubble } from '../components/ChatBubble'
import { Breadcrumb } from '../components/Breadcrumb'
import { Toast } from '../components/ui/Toast'
import styles from './Chat.module.css'

export function Chat() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialFriendOpenid = searchParams.get('openid')

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [friends, setFriends] = useState<FriendListItem[]>([])
  const [selectedFriendOpenid, setSelectedFriendOpenid] = useState<string | null>(initialFriendOpenid)
  const [selectedFriend, setSelectedFriend] = useState<{ nickname?: string; avatar?: string } | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [toastVisible, setToastVisible] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success')
  const [mobileChatOpen, setMobileChatOpen] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Load conversation list
  const loadConversations = useCallback(async () => {
    try {
      const result = await messageApi.getConversations()
      if (result.success) {
        setConversations(result.conversations)
      }
    } catch (err) {
      console.error('Failed to load conversations:', err)
    }
  }, [])

  // Load friend list for sidebar (for friends not yet messaged)
  const loadFriends = useCallback(async () => {
    try {
      const result = await friendApi.getFriends()
      if (result.success) {
        setFriends(result.friends)
      }
    } catch (err) {
      console.error('Failed to load friends:', err)
    }
  }, [])

  // Load messages with selected friend
  const loadMessages = useCallback(async (friendOpenid: string, pageNum = 1, append = false) => {
    try {
      const result = await messageApi.getMessages(friendOpenid, pageNum)
      if (result.success) {
        if (append) {
          setMessages(prev => [...result.messages, ...prev])
        } else {
          setMessages(result.messages)
        }
        setHasMore(result.pagination.page < result.pagination.totalPages)
        setPage(pageNum)
      }
    } catch (err) {
      console.error('Failed to load messages:', err)
      setToastType('error')
      setToastMessage('加载消息失败')
      setToastVisible(true)
    }
  }, [])

  // Initial load
  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await Promise.all([loadConversations(), loadFriends()])

      if (initialFriendOpenid) {
        const friend = conversations.find(c => c.friendOpenid === initialFriendOpenid)?.friendNickname
          || friends.find(f => f.openid === initialFriendOpenid)?.nickname
        if (friend) {
          setSelectedFriend({ nickname: friend })
        }
        await loadMessages(initialFriendOpenid)
        setMobileChatOpen(true)
      }

      setLoading(false)
    }
    init()
  }, [])

  // Update selected friend info when conversations load
  useEffect(() => {
    if (selectedFriendOpenid && conversations.length > 0) {
      const conv = conversations.find(c => c.friendOpenid === selectedFriendOpenid)
      if (conv) {
        setSelectedFriend({
          nickname: conv.friendNickname ?? undefined,
          avatar: conv.friendAvatar ?? undefined
        })
      }
    }
  }, [conversations, selectedFriendOpenid])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Mark messages as read when viewing
  useEffect(() => {
    if (selectedFriendOpenid && messages.length > 0) {
      messages
        .filter(m => !m.isMine && !m.isRead)
        .forEach(m => {
          messageApi.markRead(m.id).catch(console.error)
        })
      setMessages(prev =>
        prev.map(m => (m.fromOpenid === selectedFriendOpenid ? { ...m, isRead: true } : m))
      )
      setConversations(prev =>
        prev.map(c =>
          c.friendOpenid === selectedFriendOpenid ? { ...c, unreadCount: 0 } : c
        )
      )
    }
  }, [selectedFriendOpenid, messages.length])

  const handleSelectConversation = (friendOpenid: string) => {
    setSelectedFriendOpenid(friendOpenid)
    setSearchParams({ openid: friendOpenid })
    setPage(1)
    setMessages([])
    loadMessages(friendOpenid, 1)
    setMobileChatOpen(true)
  }

  const handleBackToList = () => {
    setMobileChatOpen(false)
    setSelectedFriendOpenid(null)
    setSearchParams({})
  }

  const handleSend = async () => {
    if (!inputText.trim() || !selectedFriendOpenid || sending) return

    setSending(true)
    try {
      const result = await messageApi.sendMessage(selectedFriendOpenid, inputText.trim())
      if (result.success) {
        setMessages(prev => [...prev, result.message])
        setInputText('')
        inputRef.current?.focus()
        loadConversations()
      }
    } catch (err) {
      console.error('Failed to send message:', err)
      setToastType('error')
      setToastMessage('发送失败，请重试')
      setToastVisible(true)
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleLoadMore = () => {
    if (selectedFriendOpenid && hasMore && !loading) {
      loadMessages(selectedFriendOpenid, page + 1, true)
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return '今天'
    if (diffDays === 1) return '昨天'
    if (diffDays < 7) return `${diffDays}天前`
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
  }

  // Merge conversations with friends to get all possible contacts
  const allContacts = [...conversations]
  friends.forEach(friend => {
    if (!allContacts.find(c => c.friendOpenid === friend.openid)) {
      allContacts.push({
        friendOpenid: friend.openid,
        friendNickname: friend.nickname,
        friendAvatar: friend.avatar,
        lastMessage: null,
        unreadCount: 0
      })
    }
  })

  const breadcrumbItems = selectedFriend
    ? [
        { label: '首页', href: '/' },
        { label: '消息', href: '/chat' },
        { label: selectedFriend.nickname || '匿名旅人' }
      ]
    : [
        { label: '首页', href: '/' },
        { label: '消息' }
      ]

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <Breadcrumb items={breadcrumbItems} />

        {/* Chat Container - Two Column Layout */}
        <div className={styles.chatContainer}>
          {/* Conversation List (Left Column) */}
          <aside className={`${styles.sidebar} ${mobileChatOpen ? styles.hiddenOnMobile : ''}`}>
          <header className={styles.sidebarHeader}>
            <h1 className={styles.sidebarTitle}>消息</h1>
          </header>

          <div className={styles.contactList}>
            {loading ? (
              <div className={styles.loading}>
                <div className={styles.spinner} />
                <p>加载中...</p>
              </div>
            ) : allContacts.length === 0 ? (
              <div className={styles.empty}>
                <p>暂无消息</p>
                <p style={{ fontSize: '12px', marginTop: '8px' }}>去添加好友开始聊天吧</p>
              </div>
            ) : (
              allContacts.map(contact => (
                <button
                  key={contact.friendOpenid}
                  className={`${styles.contactItem} ${selectedFriendOpenid === contact.friendOpenid ? styles.active : ''}`}
                  onClick={() => handleSelectConversation(contact.friendOpenid)}
                >
                  <div className={styles.contactAvatar}>
                    {contact.friendAvatar ? (
                      <img src={contact.friendAvatar} alt={contact.friendNickname || ''} />
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    )}
                  </div>
                  <div className={styles.contactInfo}>
                    <span className={styles.contactName}>
                      {contact.friendNickname || '匿名旅人'}
                    </span>
                    {contact.lastMessage && (
                      <span className={styles.lastMessage}>
                        {contact.lastMessage.fromOpenid === contact.friendOpenid ? '' : '我: '}
                        {contact.lastMessage.content.length > 20
                          ? contact.lastMessage.content.slice(0, 20) + '...'
                          : contact.lastMessage.content}
                      </span>
                    )}
                  </div>
                  <div className={styles.contactMeta}>
                    {contact.lastMessage && (
                      <span className={styles.lastMessageTime}>
                        {formatDate(contact.lastMessage.createdAt)}
                      </span>
                    )}
                    {contact.unreadCount > 0 && (
                      <span className={styles.unreadBadge}>{contact.unreadCount}</span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* Chat Window (Right Column) */}
        <main className={`${styles.chatWindow} ${mobileChatOpen ? styles.mobileOpen : ''}`}>
          {selectedFriendOpenid ? (
            <>
              {/* Chat Header */}
              <header className={styles.chatHeader}>
                <button className={styles.backButton} onClick={handleBackToList}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
                <div className={styles.chatHeaderAvatar}>
                  {selectedFriend?.avatar ? (
                    <img src={selectedFriend.avatar} alt={selectedFriend.nickname || ''} />
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  )}
                </div>
                <div className={styles.chatHeaderInfo}>
                  <span className={styles.chatTitle}>
                    {selectedFriend?.nickname || '匿名旅人'}
                  </span>
                </div>
                {/* Mobile back button to return to conversation list */}
                <button
                  className={styles.mobileBackBtn}
                  onClick={handleBackToList}
                  aria-label="返回消息列表"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
                <button
                  className={styles.chatHeaderAction}
                  onClick={() => navigate(`/friend/${selectedFriendOpenid}`)}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </button>
              </header>

              {/* Messages */}
              <div className={styles.messagesContainer} ref={messagesContainerRef}>
                {hasMore && (
                  <button className={styles.loadMoreBtn} onClick={handleLoadMore}>
                    加载更多
                  </button>
                )}
                {messages.map(message => (
                  <ChatBubble
                    key={message.id}
                    message={message.content}
                    isMine={message.isMine}
                    timestamp={formatTime(message.createdAt)}
                  />
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className={styles.inputContainer}>
                <textarea
                  ref={inputRef}
                  className={styles.input}
                  placeholder="输入消息..."
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                />
                <button
                  className={styles.sendButton}
                  onClick={handleSend}
                  disabled={!inputText.trim() || sending}
                >
                  {sending ? (
                    <div className={styles.spinner} />
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </>
          ) : (
            <div className={styles.noChat}>
              <div className={styles.noChatIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <h2>选择会话开始聊天</h2>
              <p>从左侧选择一个好友或开始新对话</p>
            </div>
          )}
        </main>
        </div>
      </div>

      <Toast
        message={toastMessage}
        visible={toastVisible}
        onClose={() => setToastVisible(false)}
        type={toastType}
      />
    </div>
  )
}
