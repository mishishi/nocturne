import { useState, useEffect, useRef } from 'react'
import { useDreamStore } from '../hooks/useDreamStore'
import { friendApi } from '../services/api'
import { Toast } from '../components/ui/Toast'
import styles from './Friends.module.css'

export function Friends() {
  const { user, friends, pendingRequests, setFriends, setPendingRequests, removeFriend } = useDreamStore()
  const [activeTab, setActiveTab] = useState<'list' | 'requests' | 'search'>('list')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Array<{ id: string; nickname?: string; avatar?: string; isMember: boolean }>>([])
  const [isSearching, setIsSearching] = useState(false)
  const [toastVisible, setToastVisible] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success')
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>()

  // Load friends on mount
  useEffect(() => {
    if (user?.openid) {
      loadFriends()
      loadPendingRequests()
    }
  }, [user?.openid])

  const loadFriends = async () => {
    if (!user?.openid) return
    try {
      const result = await friendApi.getFriends(user.openid)
      if (result.success) {
        setFriends(result.friends)
      }
    } catch (err) {
      console.error('Failed to load friends:', err)
    }
  }

  const loadPendingRequests = async () => {
    if (!user?.openid) return
    try {
      const result = await friendApi.getPendingRequests(user.openid)
      if (result.success) {
        setPendingRequests(result.received, result.sent)
      }
    } catch (err) {
      console.error('Failed to load pending requests:', err)
    }
  }

  const handleSearch = async (query: string) => {
    setSearchQuery(query)

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (query.length < 2) {
      setSearchResults([])
      return
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true)
      try {
        const result = await friendApi.searchUsers(query, user?.openid)
        if (result.success) {
          setSearchResults(result.users)
        }
      } catch (err) {
        console.error('Search failed:', err)
      } finally {
        setIsSearching(false)
      }
    }, 300)
  }

  const handleAddFriend = async (friendId: string) => {
    if (!user?.openid) return

    try {
      const result = await friendApi.addFriend(user.openid, friendId)
      if (result.success) {
        setToastType('success')
        setToastMessage('好友请求已发送')
        setToastVisible(true)
        // Remove from search results
        setSearchResults(prev => prev.filter(u => u.id !== friendId))
      } else {
        setToastType('error')
        setToastMessage(result.reason || '添加失败')
        setToastVisible(true)
      }
    } catch (err) {
      setToastType('error')
      setToastMessage('网络错误')
      setToastVisible(true)
    }
  }

  const handleAcceptRequest = async (fromId: string) => {
    if (!user?.openid) return

    try {
      const result = await friendApi.acceptFriend(user.openid, fromId)
      if (result.success) {
        setToastType('success')
        setToastMessage('已成为好友')
        setToastVisible(true)
        loadFriends()
        loadPendingRequests()
      } else {
        setToastType('error')
        setToastMessage(result.reason || '接受失败')
        setToastVisible(true)
      }
    } catch (err) {
      setToastType('error')
      setToastMessage('网络错误')
      setToastVisible(true)
    }
  }

  const handleRejectRequest = async (fromId: string) => {
    if (!user?.openid) return

    try {
      const result = await friendApi.rejectFriend(user.openid, fromId)
      if (result.success) {
        setToastType('info')
        setToastMessage('已拒绝')
        setToastVisible(true)
        loadPendingRequests()
      }
    } catch (err) {
      setToastType('error')
      setToastMessage('网络错误')
      setToastVisible(true)
    }
  }

  const handleRemoveFriend = async (friendId: string) => {
    if (!user?.openid) return

    try {
      const result = await friendApi.removeFriend(user.openid, friendId)
      if (result.success) {
        removeFriend(friendId)
        setToastType('info')
        setToastMessage('已删除好友')
        setToastVisible(true)
      }
    } catch (err) {
      setToastType('error')
      setToastMessage('删除失败')
      setToastVisible(true)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Header */}
        <header className={styles.header}>
          <h1 className={styles.title}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={styles.titleIcon}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            好友
          </h1>
          <span className={styles.friendCount}>{friends.length} 位好友</span>
        </header>

        {/* Tabs */}
        <div className={styles.tabs} role="tablist">
          <button
            className={`${styles.tab} ${activeTab === 'list' ? styles.active : ''}`}
            onClick={() => setActiveTab('list')}
            role="tab"
            aria-selected={activeTab === 'list'}
          >
            好友列表
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'requests' ? styles.active : ''}`}
            onClick={() => setActiveTab('requests')}
            role="tab"
            aria-selected={activeTab === 'requests'}
          >
            好友请求
            {pendingRequests.received.length > 0 && (
              <span className={styles.badge}>{pendingRequests.received.length}</span>
            )}
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'search' ? styles.active : ''}`}
            onClick={() => setActiveTab('search')}
            role="tab"
            aria-selected={activeTab === 'search'}
          >
            添加好友
          </button>
        </div>

        {/* Tab Content */}
        <div className={styles.content}>
          {/* Friends List */}
          {activeTab === 'list' && (
            <div className={styles.friendList}>
              {friends.length === 0 ? (
                <div className={styles.empty}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className={styles.emptyIcon}>
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                  <p className={styles.emptyText}>还没有好友，快去添加吧</p>
                  <button className={styles.emptyButton} onClick={() => setActiveTab('search')}>
                    搜索好友
                  </button>
                </div>
              ) : (
                friends.map((friend) => (
                  <div key={friend.id} className={styles.friendCard}>
                    <div className={styles.friendAvatar}>
                      {friend.avatar ? (
                        <img src={friend.avatar} alt={friend.nickname} />
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                          <circle cx="12" cy="7" r="4"/>
                        </svg>
                      )}
                    </div>
                    <div className={styles.friendInfo}>
                      <span className={styles.friendName}>
                        {friend.nickname || '匿名旅人'}
                        {friend.isMember && <span className={styles.memberBadge}>会员</span>}
                      </span>
                      <span className={styles.friendMeta}>
                        好友 منذ {new Date(friend.friendsSince).toLocaleDateString('zh-CN')}
                      </span>
                    </div>
                    <button
                      className={styles.removeButton}
                      onClick={() => handleRemoveFriend(friend.friendId)}
                      aria-label="删除好友"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12"/>
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Friend Requests */}
          {activeTab === 'requests' && (
            <div className={styles.requestSection}>
              {/* Received Requests */}
              <div className={styles.requestGroup}>
                <h2 className={styles.requestTitle}>收到的请求</h2>
                {pendingRequests.received.length === 0 ? (
                  <p className={styles.noRequests}>暂无好友请求</p>
                ) : (
                  pendingRequests.received.map((request) => (
                    <div key={request.id} className={styles.requestCard}>
                      <div className={styles.friendAvatar}>
                        {request.avatar ? (
                          <img src={request.avatar} alt={request.nickname} />
                        ) : (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                            <circle cx="12" cy="7" r="4"/>
                          </svg>
                        )}
                      </div>
                      <div className={styles.requestInfo}>
                        <span className={styles.friendName}>{request.nickname || '匿名旅人'}</span>
                        <span className={styles.requestMeta}>
                          {new Date(request.createdAt).toLocaleDateString('zh-CN')} 发送
                        </span>
                      </div>
                      <div className={styles.requestActions}>
                        <button
                          className={styles.acceptButton}
                          onClick={() => handleAcceptRequest(request.fromId!)}
                        >
                          接受
                        </button>
                        <button
                          className={styles.rejectButton}
                          onClick={() => handleRejectRequest(request.fromId!)}
                        >
                          拒绝
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Sent Requests */}
              {pendingRequests.sent.length > 0 && (
                <div className={styles.requestGroup}>
                  <h2 className={styles.requestTitle}>发出的请求</h2>
                  {pendingRequests.sent.map((request) => (
                    <div key={request.id} className={styles.requestCard}>
                      <div className={styles.friendAvatar}>
                        {request.avatar ? (
                          <img src={request.avatar} alt={request.nickname} />
                        ) : (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                            <circle cx="12" cy="7" r="4"/>
                          </svg>
                        )}
                      </div>
                      <div className={styles.requestInfo}>
                        <span className={styles.friendName}>{request.nickname || '匿名旅人'}</span>
                        <span className={styles.requestMeta}>等待对方确认</span>
                      </div>
                      <button
                        className={styles.cancelButton}
                        onClick={() => handleRejectRequest(request.toId!)}
                      >
                        取消
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Search */}
          {activeTab === 'search' && (
            <div className={styles.searchSection}>
              <div className={styles.searchWrapper}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.searchIcon}>
                  <circle cx="11" cy="11" r="8"/>
                  <path d="M21 21l-4.35-4.35"/>
                </svg>
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="搜索昵称或手机号..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className={styles.searchInput}
                />
                {searchQuery && (
                  <button
                    className={styles.clearButton}
                    onClick={() => {
                      setSearchQuery('')
                      setSearchResults([])
                      searchInputRef.current?.focus()
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                  </button>
                )}
              </div>

              <div className={styles.searchResults}>
                {isSearching && (
                  <div className={styles.searching}>
                    <span className={styles.spinner} />
                    搜索中...
                  </div>
                )}

                {!isSearching && searchQuery.length >= 2 && searchResults.length === 0 && (
                  <div className={styles.noResults}>
                    未找到用户 "{searchQuery}"
                  </div>
                )}

                {!isSearching && searchResults.map((result) => (
                  <div key={result.id} className={styles.searchResultCard}>
                    <div className={styles.friendAvatar}>
                      {result.avatar ? (
                        <img src={result.avatar} alt={result.nickname} />
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                          <circle cx="12" cy="7" r="4"/>
                        </svg>
                      )}
                    </div>
                    <div className={styles.resultInfo}>
                      <span className={styles.friendName}>
                        {result.nickname || '匿名旅人'}
                        {result.isMember && <span className={styles.memberBadge}>会员</span>}
                      </span>
                    </div>
                    <button
                      className={styles.addButton}
                      onClick={() => handleAddFriend(result.id)}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 5v14M5 12h14"/>
                      </svg>
                      添加
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
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
