import { useState, useEffect, useCallback, useRef } from 'react'
import { activityApi } from '../../services/api'
import styles from './LiveNotification.module.css'

interface NotificationItem {
  message: string
  icon: string
}

export function LiveNotification() {
  const [notification, setNotification] = useState<NotificationItem | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)
  const indexRef = useRef(0)
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const activitiesRef = useRef<NotificationItem[]>([])
  const isLoadingRef = useRef(false)

  // 清理所有定时器
  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach(t => clearTimeout(t))
    timersRef.current = []
  }, [])

  const showNext = useCallback(() => {
    const activities = activitiesRef.current
    // 没有真实数据时不显示
    if (activities.length === 0) return

    const nextIndex = (indexRef.current + 1) % activities.length
    indexRef.current = nextIndex
    setNotification(activities[nextIndex])
    setIsExiting(false)
    setIsVisible(true)

    // 清理之前的定时器
    clearAllTimers()

    // Start exit after 3.5s
    timersRef.current.push(setTimeout(() => {
      setIsExiting(true)
    }, 3500))

    // Hide after 4s
    timersRef.current.push(setTimeout(() => {
      setIsVisible(false)
    }, 4000))

    // Show next after 5-9s random delay
    const delay = 5000 + Math.random() * 4000
    timersRef.current.push(setTimeout(showNext, delay))
  }, [clearAllTimers])

  // Fetch activities from API
  useEffect(() => {
    if (isLoadingRef.current) return
    isLoadingRef.current = true

    activityApi.getRecentActivities(20)
      .then(res => {
        if (res.success && res.data?.activities && res.data.activities.length > 0) {
          activitiesRef.current = res.data.activities
        }
      })
      .catch(() => {
        // API 失败时静默忽略，不生成假数据
        activitiesRef.current = []
      })
      .finally(() => {
        isLoadingRef.current = false
      })
  }, [])

  useEffect(() => {
    // First show after 3s
    const initialTimer = setTimeout(() => {
      showNext()
    }, 3000)
    timersRef.current.push(initialTimer)

    return () => {
      clearAllTimers()
    }
  }, [showNext, clearAllTimers])

  if (!isVisible || !notification) return null

  return (
    <div
      className={`${styles.notification} ${isExiting ? styles.exiting : ''}`}
      role="status"
      aria-live="polite"
    >
      <span className={styles.icon}>{notification.icon}</span>
      <span className={styles.message}>{notification.message}</span>
      <span className={styles.dot} />
    </div>
  )
}
