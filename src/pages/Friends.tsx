import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { friendApi, FriendListItem, FriendRequestItem } from '../services/api'
import { useDreamStore } from '../hooks/useDreamStore'
import { showToast } from '../hooks/useDreamStore'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import { Breadcrumb } from '../components/Breadcrumb'
import { FriendsSkeleton } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/EmptyState'
import styles from './Friends.module.css'

export function Friends() {
  const navigate = useNavigate()
  const { user } = useDreamStore()
  const [activeTab, setActiveTab] = useState<'list' | 'requests' | 'sent' | 'search'>('list')
  const [friends, setFriends] = useState<FriendListItem[]>([])
  const [requests, setRequests] = useState<FriendRequestItem[]>([])
  const [sentRequests, setSentRequests] = useState<FriendRequestItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Array<{ id: string; openid: string; nickname?: string; avatar?: string; isMember: boolean }>>([])
  const [isSearching, setIsSearching] = useState(false)
  const [lastSearchQuery, setLastSearchQuery] = useState(() => {
    // 从 localStorage 恢复上次搜索词
    return localStorage.getItem('friends_last_search') || ''
  })

  // 保存搜索词到 localStorage
  const saveLastSearchQuery = (query: string) => {
    setLastSearchQuery(query)
    if (query) {
      localStorage.setItem('friends_last_search', query)
    } else {
      localStorage.removeItem('friends_last_search')
    }
  }
  const [isAccepting, setIsAccepting] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [removingFriendId, setRemovingFriendId] = useState<string | null>(null)
  const [sendingRequestId, setSendingRequestId] = useState<string | null>(null)
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean
    friendOpenid: string | null
    friendNickname: string
    onConfirm: () => void
  }>({
    open: false,
    friendOpenid: null,
    friendNickname: '',
    onConfirm: () => {}
  })

  // Load data function (extracted for reuse)
  const loadData = async () => {
    setLoading(true)
    try {
      const [friendsRes, requestsRes, sentRes] = await Promise.all([
        friendApi.getFriends(),
        friendApi.getFriendRequests(),
        friendApi.getSentRequests()
      ])
      if (friendsRes.success) {
        setFriends(friendsRes.data?.friends ?? [])
      }
      if (requestsRes.success) {
        setRequests(requestsRes.data?.requests ?? [])
      }
      if (sentRes.success) {
        setSentRequests(sentRes.data?.sentRequests ?? [])
      }
    } catch (err) {
      console.error('Failed to load friends data:', err)
      showToast('加载失败，请重试', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Load data on mount
  useEffect(() => {
    if (!user?.openid) {
      navigate('/login')
      return
    }
    let cancelled = false
    const doLoad = async () => {
      if (cancelled) return
      await loadData()
    }
    doLoad()
    return () => {
      cancelled = true
    }
  }, [user, navigate])

  const handleAcceptRequest = async (requestId: string) => {
    if (isAccepting) return
    setIsAccepting(true)
    try {
      const result = await friendApi.acceptFriendRequest(requestId)
      if (result.success) {
        showToast('已接受好友请求', 'success')
        // Reload data
        await loadData()
      } else {
        showToast(result.error?.message || '接受失败', 'error')
      }
    } catch (err) {
      console.error('Failed to accept request:', err)
      showToast('网络错误', 'error')
    } finally {
      setIsAccepting(false)
    }
  }

  const handleRejectRequest = async (requestId: string) => {
    if (isRejecting) return
    setIsRejecting(true)
    try {
      const result = await friendApi.rejectFriendRequest(requestId)
      if (result.success) {
        showToast('已拒绝请求', 'info')
        // Reload data
        await loadData()
      } else {
        showToast(result.error?.message || '拒绝失败', 'error')
      }
    } catch (err) {
      console.error('Failed to reject request:', err)
      showToast('网络错误', 'error')
    } finally {
      setIsRejecting(false)
    }
  }

  const handleRemoveFriend = (friendOpenid: string, friendNickname: string) => {
    setConfirmModal({
      open: true,
      friendOpenid,
      friendNickname,
      onConfirm: async () => {
        if (removingFriendId) return
        setRemovingFriendId(friendOpenid)
        setConfirmModal(prev => ({ ...prev, open: false }))

        // Optimistic remove
        let removedFriend: FriendListItem | null = null
        setFriends(prev => {
          removedFriend = prev.find(f => f.openid === friendOpenid) || null
          return prev.filter(f => f.openid !== friendOpenid)
        })

        try {
          const result = await friendApi.removeFriend(friendOpenid)
          if (result.success) {
            showToast('已删除好友', 'info')
          } else {
            // Rollback on failure
            if (removedFriend) {
              setFriends(prev => [...prev, removedFriend!])
            }
            showToast(result.error?.message || '删除失败', 'error')
          }
        } catch (err) {
          console.error('Failed to remove friend:', err)
          // Rollback on error
          if (removedFriend) {
            setFriends(prev => [...prev, removedFriend!])
          }
          showToast('网络错误', 'error')
        } finally {
          setRemovingFriendId(null)
        }
      }
    })
  }

  const handleSendFriendRequest = async (friendOpenid: string) => {
    if (sendingRequestId) return
    setSendingRequestId(friendOpenid)
    try {
      const result = await friendApi.sendFriendRequest(friendOpenid)
      if (result.success) {
        showToast('已发送好友请求', 'success')
        // Remove from search results
        setSearchResults(prev => prev.filter(r => r.openid !== friendOpenid))
        // Reload sent requests
        await loadData()
      } else {
        showToast(result.error?.message || '发送失败', 'error')
      }
    } catch (err) {
      console.error('Failed to send friend request:', err)
      showToast('网络错误', 'error')
    } finally {
      setSendingRequestId(null)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    saveLastSearchQuery(searchQuery.trim())
    setIsSearching(true)
    try {
      const result = await friendApi.searchUsers(searchQuery.trim(), user?.openid)
      if (result.success) {
        setSearchResults(result.data?.users ?? [])
      } else {
        showToast('搜索失败', 'error')
        setSearchResults([])
      }
    } catch (err) {
      console.error('Failed to search users:', err)
      showToast('网络错误', 'error')
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  // 切换到搜索tab时，如果之前有搜索词但没有结果，则恢复搜索
  useEffect(() => {
    if (activeTab === 'search' && lastSearchQuery && searchResults.length === 0 && searchQuery === lastSearchQuery) {
      // 恢复搜索结果
      const restoreSearch = async () => {
        setIsSearching(true)
        try {
          const result = await friendApi.searchUsers(lastSearchQuery, user?.openid)
          if (result.success) {
            setSearchResults(result.data?.users ?? [])
          }
        } catch (err) {
          console.error('Failed to restore search:', err)
        } finally {
          setIsSearching(false)
        }
      }
      restoreSearch()
    }
  }, [activeTab, lastSearchQuery, searchResults.length, searchQuery, user?.openid])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { label: '首页', href: '/' },
            { label: '好友' }
          ]}
        />

        {/* Header */}
        <header className={styles.header}>
          <div className={styles.moonIcon}>
            <svg viewBox="0 0 60 60" fill="none">
              {/* Two people silhouettes representing friendship */}
              <circle cx="20" cy="18" r="8" fill="url(#friendPersonGrad)" />
              <path d="M8 42c0-8 5.5-14 12-14s12 6 12 14" fill="url(#friendPersonGrad)" />
              <circle cx="40" cy="18" r="8" fill="url(#friendPersonGrad)" />
              <path d="M28 42c0-8 5.5-14 12-14s12 6 12 14" fill="url(#friendPersonGrad)" />
              {/* Connection heart */}
              <path d="M30 28c-2-3-6-3-6 2s6 6 6 6 6 0 6-6-4-5-6-2" fill="url(#friendHeartGrad)" />
              <defs>
                <radialGradient id="friendPersonGrad" cx="50%" cy="30%" r="60%">
                  <stop offset="0%" stopColor="#FFD666" />
                  <stop offset="100%" stopColor="#F4D35E" />
                </radialGradient>
                <radialGradient id="friendHeartGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#FF6B8A" />
                  <stop offset="100%" stopColor="#FF8FA3" />
                </radialGradient>
              </defs>
            </svg>
          </div>
          <h1 className={styles.title}>好友</h1>
          <p className={styles.subtitle}>管理您的好友关系</p>
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
            收到的请求
            {requests.length > 0 && (
              <span className={styles.badge}>{requests.length}</span>
            )}
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'sent' ? styles.active : ''}`}
            onClick={() => setActiveTab('sent')}
            role="tab"
            aria-selected={activeTab === 'sent'}
          >
            发出的请求
            {sentRequests.length > 0 && (
              <span className={styles.badge}>{sentRequests.length}</span>
            )}
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'search' ? styles.active : ''}`}
            onClick={() => setActiveTab('search')}
            role="tab"
            aria-selected={activeTab === 'search'}
          >
            搜索用户
          </button>
        </div>

        {/* Tab Content */}
        <div className={styles.content}>
          {loading ? (
            <FriendsSkeleton />
          ) : (
            <>
              {/* Friends List */}
              {activeTab === 'list' && (
                <div className={styles.friendList}>
                  {friends.length === 0 ? (
                    <EmptyState
                      icon="friends"
                      title="还没有好友"
                      description="搜索用户来添加好友吧"
                      action={{
                        label: '搜索用户',
                        onClick: () => setActiveTab('search')
                      }}
                    />
                  ) : (
                    friends.map((friend) => (
                      <div
                        key={friend.id}
                        className={styles.friendCard}
                        onClick={() => navigate(`/friends/${friend.openid}`)}
                      >
                        <div className={styles.friendAvatar}>
                          {friend.avatar ? (
                            <img src={friend.avatar} alt={friend.nickname} loading="lazy" />
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
                          </span>
                          <span className={styles.friendMeta}>
                            好友 since {formatDate(friend.friendSince)}
                          </span>
                        </div>
                        <button
                          className={styles.removeButton}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemoveFriend(friend.openid, friend.nickname || '该好友')
                          }}
                          disabled={removingFriendId === friend.openid}
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
                  {requests.length === 0 ? (
                    <EmptyState
                      icon="friends"
                      title="暂无好友请求"
                      description="收到的好友请求将显示在这里"
                    />
                  ) : (
                    requests.map((request) => (
                      <div key={request.id} className={styles.requestCard}>
                        <div className={styles.friendAvatar}>
                          {request.avatar ? (
                            <img src={request.avatar} alt={request.nickname} loading="lazy" />
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
                            {formatDate(request.createdAt)} 发送
                          </span>
                        </div>
                        <div className={styles.requestActions}>
                          <button
                            className={styles.acceptButton}
                            onClick={() => handleAcceptRequest(request.id)}
                            disabled={isAccepting}
                          >
                            {isAccepting ? '接受中...' : '接受'}
                          </button>
                          <button
                            className={styles.rejectButton}
                            onClick={() => handleRejectRequest(request.id)}
                            disabled={isRejecting}
                          >
                            {isRejecting ? '拒绝中...' : '拒绝'}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Sent Requests */}
              {activeTab === 'sent' && (
                <div className={styles.requestSection}>
                  {sentRequests.length === 0 ? (
                    <EmptyState
                      icon="friends"
                      title="暂无发出的请求"
                      description="发出的好友请求将显示在这里"
                    />
                  ) : (
                    sentRequests.map((request) => (
                      <div key={request.id} className={styles.requestCard}>
                        <div className={styles.friendAvatar}>
                          {request.avatar ? (
                            <img src={request.avatar} alt={request.nickname} loading="lazy" />
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
                            {formatDate(request.createdAt)} 发送
                          </span>
                        </div>
                        <span className={styles.waitingLabel}>等待对方确认</span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Search Users */}
              {activeTab === 'search' && (
                <div className={styles.searchSection}>
                  <div className={styles.searchWrapper}>
                    <svg className={styles.searchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8"/>
                      <path d="m21 21-4.35-4.35"/>
                    </svg>
                    <input
                      type="text"
                      className={styles.searchInput}
                      placeholder="输入昵称搜索用户..."
                      value={searchQuery}
                      onChange={(e) => {
                        const value = e.target.value
                        setSearchQuery(value)
                        if (!value) {
                          saveLastSearchQuery('')
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && searchQuery.trim()) {
                          handleSearch()
                        }
                      }}
                    />
                  </div>

                  {isSearching ? (
                    <div className={styles.searching}>
                      <div className={styles.spinner} />
                      <span>搜索中...</span>
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className={styles.searchResults}>
                      {searchResults.map((result) => (
                        <div
                          key={result.id}
                          className={styles.searchResultCard}
                        >
                          <div className={styles.friendAvatar} onClick={() => navigate(`/friends/${result.openid}`)}>
                            {result.avatar ? (
                              <img src={result.avatar} alt={result.nickname} loading="lazy" />
                            ) : (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                <circle cx="12" cy="7" r="4"/>
                              </svg>
                            )}
                          </div>
                          <div className={styles.friendInfo} onClick={() => navigate(`/friends/${result.openid}`)}>
                            <span className={styles.friendName}>
                              {result.nickname || '匿名旅人'}
                            </span>
                          </div>
                          <button
                            className={styles.addButton}
                            onClick={() => handleSendFriendRequest(result.openid)}
                            disabled={sendingRequestId === result.openid}
                          >
                            {sendingRequestId === result.openid ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <div className={styles.spinner} />
                                发送中...
                              </span>
                            ) : (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M12 5v14M5 12h14"/>
                                </svg>
                                添加
                              </span>
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : searchQuery && !isSearching ? (
                    <EmptyState
                      icon="search"
                      title="没有找到匹配的用户"
                      description="试试其他关键词"
                    />
                  ) : null}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmModal.open}
        title="删除好友"
        message={`确定要删除好友「${confirmModal.friendNickname}」吗？删除后将不再显示在好友列表中。`}
        confirmText="删除"
        cancelText="取消"
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, open: false }))}
        danger
      />
    </div>
  )
}
