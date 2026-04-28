import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { friendApi, FriendListItem, FriendRequestItem } from '../services/api'
import { Toast } from '../components/ui/Toast'
import styles from './Friends.module.css'

export function Friends() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'list' | 'requests'>('list')
  const [friends, setFriends] = useState<FriendListItem[]>([])
  const [requests, setRequests] = useState<FriendRequestItem[]>([])
  const [loading, setLoading] = useState(true)
  const [toastVisible, setToastVisible] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success')

  // Load data on mount
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [friendsRes, requestsRes] = await Promise.all([
        friendApi.getFriends(),
        friendApi.getFriendRequests()
      ])
      if (friendsRes.success) {
        setFriends(friendsRes.friends)
      }
      if (requestsRes.success) {
        setRequests(requestsRes.requests)
      }
    } catch (err) {
      console.error('Failed to load friends data:', err)
      showToast('加载失败，请重试', 'error')
    } finally {
      setLoading(false)
    }
  }

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage(message)
    setToastType(type)
    setToastVisible(true)
  }

  const handleAcceptRequest = async (requestId: string) => {
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
    }
  }

  const handleRejectRequest = async (requestId: string) => {
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
    }
  }

  const handleRemoveFriend = async (friendOpenid: string) => {
    try {
      const result = await friendApi.removeFriend(friendOpenid)
      if (result.success) {
        showToast('已删除好友', 'info')
        // Remove from local state
        setFriends(prev => prev.filter(f => f.openid !== friendOpenid))
      } else {
        showToast(result.message || '删除失败', 'error')
      }
    } catch (err) {
      console.error('Failed to remove friend:', err)
      showToast('网络错误', 'error')
    }
  }

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
            {requests.length > 0 && (
              <span className={styles.badge}>{requests.length}</span>
            )}
          </button>
        </div>

        {/* Tab Content */}
        <div className={styles.content}>
          {loading ? (
            <div className={styles.loading}>
              <div className={styles.spinner} />
              <span>加载中...</span>
            </div>
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
                            handleRemoveFriend(friend.openid)
                          }}
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
                          >
                            接受
                          </button>
                          <button
                            className={styles.rejectButton}
                            onClick={() => handleRejectRequest(request.id)}
                          >
                            拒绝
                          </button>
                        </div>
                      </div>
                    ))
                  )}
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
    </div>
  )
}
