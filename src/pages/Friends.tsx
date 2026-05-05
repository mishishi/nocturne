import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { friendApi, FriendListItem, FriendRequestItem } from '../services/api'
import { useDreamStore } from '../hooks/useDreamStore'
import { Toast } from '../components/ui/Toast'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import { Breadcrumb } from '../components/Breadcrumb'
import { FriendsSkeleton } from '../components/ui/Skeleton'
import styles from './Friends.module.css'

export function Friends() {
  const navigate = useNavigate()
  const { user } = useDreamStore()
  const [activeTab, setActiveTab] = useState<'list' | 'requests' | 'sent' | 'search'>('list')
  const [friends, setFriends] = useState<FriendListItem[]>([])
  const [requests, setRequests] = useState<FriendRequestItem[]>([])
  const [sentRequests, setSentRequests] = useState<FriendRequestItem[]>([])
  const [loading, setLoading] = useState(true)
  const [toastVisible, setToastVisible] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Array<{ id: string; nickname?: string; avatar?: string; isMember: boolean }>>([])
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
        setFriends(friendsRes.data.friends)
      }
      if (requestsRes.success) {
        setRequests(requestsRes.data.requests)
      }
      if (sentRes.success) {
        setSentRequests(sentRes.data.sentRequests)
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

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage(message)
    setToastType(type)
    setToastVisible(true)
  }

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
        showToast(result.message || '接受失败', 'error')
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
        showToast(result.message || '拒绝失败', 'error')
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
        try {
          const result = await friendApi.removeFriend(friendOpenid)
          if (result.success) {
            showToast('已删除好友', 'info')
            setFriends(prev => prev.filter(f => f.openid !== friendOpenid))
          } else {
            showToast(result.message || '删除失败', 'error')
          }
        } catch (err) {
          console.error('Failed to remove friend:', err)
          showToast('网络错误', 'error')
        } finally {
          setRemovingFriendId(null)
        }
      }
    })
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    saveLastSearchQuery(searchQuery.trim())
    setIsSearching(true)
    try {
      const result = await friendApi.searchUsers(searchQuery.trim(), user?.openid)
      if (result.success) {
        setSearchResults(result.users)
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
            setSearchResults(result.users)
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
                    <div className={styles.empty}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className={styles.emptyIcon}>
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                      </svg>
                      <p className={styles.emptyText}>还没有好友</p>
                    </div>
                  ) : (
                    friends.map((friend) => (
                      <div
                        key={friend.id}
                        className={styles.friendCard}
                        onClick={() => navigate(`/friends/${friend.openid}`)}
                      >
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
                    <p className={styles.noRequests}>暂无好友请求</p>
                  ) : (
                    requests.map((request) => (
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
                    <div className={styles.empty}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className={styles.emptyIcon}>
                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                        <circle cx="8.5" cy="7" r="4"/>
                        <line x1="20" y1="8" x2="20" y2="14"/>
                        <line x1="23" y1="11" x2="17" y2="11"/>
                      </svg>
                      <p className={styles.emptyText}>暂无发出的请求</p>
                    </div>
                  ) : (
                    sentRequests.map((request) => (
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
                          onClick={() => navigate(`/friends/${result.id}`)}
                        >
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
                          <div className={styles.friendInfo}>
                            <span className={styles.friendName}>
                              {result.nickname || '匿名旅人'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : searchQuery && !isSearching ? (
                    <p className={styles.noRequests}>没有找到匹配的用户</p>
                  ) : null}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <Toast
        message={toastMessage}
        visible={toastVisible}
        onClose={() => setToastVisible(false)}
        type={toastType}
      />

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
