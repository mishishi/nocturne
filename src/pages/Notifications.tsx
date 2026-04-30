import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { notificationApi, Notification as ApiNotification } from '../services/api'
import { Toast } from '../components/ui/Toast'
import styles from './Notifications.module.css'

export function Notifications() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<ApiNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [toastVisible, setToastVisible] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success')

  // Load notifications on mount
  useEffect(() => {
    loadNotifications()
  }, [])

  const loadNotifications = async () => {
    setLoading(true)
    try {
      const result = await notificationApi.getNotifications()
      if (result.success && result.data?.notifications) {
        setNotifications(result.data.notifications)
      }
    } catch (err) {
      console.error('Failed to load notifications:', err)
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

  const handleMarkAllRead = async () => {
    try {
      const result = await notificationApi.markAllRead()
      if (result.success) {
        showToast('已全部已读', 'success')
        // Update local state
        setNotifications(prev =>
          prev.map(n => ({ ...n, isRead: true }))
        )
      }
    } catch (err) {
      console.error('Failed to mark all read:', err)
      showToast('操作失败', 'error')
    }
  }

  const handleNotificationClick = async (notification: ApiNotification) => {
    // Navigate based on type
    let path = '/'
    switch (notification.type) {
      case 'LIKE':
      case 'COMMENT':
        // Navigate to story page using targetId (sessionId)
        if (notification.targetId) {
          path = `/story/${notification.targetId}`
        }
        break
      case 'FRIEND_REQUEST':
      case 'FRIEND_ACCEPTED':
        // Navigate to friends page
        path = '/friends'
        break
    }

    // Mark as read if not already
    if (!notification.isRead) {
      try {
        await notificationApi.markOneRead(notification.id)
        setNotifications(prev =>
          prev.map(n =>
            n.id === notification.id ? { ...n, isRead: true } : n
          )
        )
      } catch (err) {
        console.error('Failed to mark as read:', err)
      }
    }

    navigate(path)
  }

  // Format relative time
  const formatRelativeTime = (dateStr: string): string => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSecs = Math.floor(diffMs / 1000)
    const diffMins = Math.floor(diffSecs / 60)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffSecs < 60) return '刚刚'
    if (diffMins < 60) return `${diffMins}分钟前`
    if (diffHours < 24) return `${diffHours}小时前`
    if (diffDays < 30) return `${diffDays}天前`
    return date.toLocaleDateString('zh-CN')
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Header */}
        <header className={styles.header}>
          <button
            className={styles.backButton}
            onClick={() => navigate(-1)}
            aria-label="返回"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className={styles.title}>通知</h1>
          <div style={{ width: 60 }} /> {/* Spacer to balance the header */}
        </header>

        {/* Notification List */}
        <div className={styles.list}>
          {loading ? (
            <div className={styles.loading}>
              <div className={styles.spinner} />
              <span>加载中...</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className={styles.empty}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className={styles.emptyIcon}>
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <p className={styles.emptyText}>暂无通知</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`${styles.card} ${notification.isRead ? styles.read : styles.unread}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className={styles.avatar}>
                  {notification.fromNickname ? (
                    <div className={styles.avatarImage}>
                      {notification.fromNickname.charAt(0).toUpperCase()}
                    </div>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  )}
                </div>
                <div className={styles.content}>
                  <div className={styles.header}>
                    <span className={`${styles.typeBadge} ${styles[`type${notification.type.charAt(0) + notification.type.slice(1).toLowerCase()}`]}`}>
                      {notification.type === 'LIKE' && (
                        <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
                          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                        </svg>
                      )}
                      {notification.type === 'COMMENT' && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        </svg>
                      )}
                      {notification.type === 'FRIEND_REQUEST' && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                          <circle cx="8.5" cy="7" r="4"/>
                          <line x1="20" y1="8" x2="20" y2="14"/>
                          <line x1="23" y1="11" x2="17" y2="11"/>
                        </svg>
                      )}
                      {notification.type === 'FRIEND_ACCEPTED' && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                          <polyline points="22 4 12 14.01 9 11.01"/>
                        </svg>
                      )}
                      <span>
                        {notification.type === 'LIKE' && '赞'}
                        {notification.type === 'COMMENT' && '评论'}
                        {notification.type === 'FRIEND_REQUEST' && '好友请求'}
                        {notification.type === 'FRIEND_ACCEPTED' && '已互关'}
                      </span>
                    </span>
                    <span className={styles.time}>{formatRelativeTime(notification.createdAt)}</span>
                  </div>
                  <p className={styles.message}>{notification.message}</p>
                </div>
                {!notification.isRead && <div className={styles.unreadDot} />}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Floating Mark All Read Button */}
      {notifications.some(n => !n.isRead) && (
        <button
          className={styles.floatingMarkRead}
          onClick={handleMarkAllRead}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          全部已读
        </button>
      )}

      <Toast
        message={toastMessage}
        visible={toastVisible}
        onClose={() => setToastVisible(false)}
        type={toastType}
      />
    </div>
  )
}
