import { useState, useEffect, useCallback, useRef } from 'react'
import { activityApi } from '../../services/api'
import styles from './LiveNotification.module.css'

interface NotificationItem {
  message: string
  icon: string
}

// Fallback mock data when API fails
const FALLBACK_NOTIFICATIONS: NotificationItem[] = [
  { message: '北京的王同学刚开始探索', icon: '🌙' },
  { message: '广州的陈小姐记录了第3个梦', icon: '✨' },
  { message: '成都的李同学收到了故事', icon: '📖' },
  { message: '上海的周先生完成了签到', icon: '🔥' },
  { message: '深圳的吴同学解锁了新成就', icon: '🏆' },
  { message: '杭州的赵同学刚开始探索', icon: '🌙' },
  { message: '南京的孙同学记录了第7个梦', icon: '📝' },
  { message: '武汉的周先生收到了故事', icon: '✨' },
  { message: '西安的李同学完成了签到', icon: '🔥' },
  { message: '重庆的吴小姐刚开始探索', icon: '🌙' },
  { message: '苏州的陈先生解锁了新成就', icon: '🏆' },
  { message: '天津的赵同学记录了第12个梦', icon: '📖' },
]

export function LiveNotification() {
  const [notification, setNotification] = useState<NotificationItem>(FALLBACK_NOTIFICATIONS[0])
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)
  const [index, setIndex] = useState(0)
  const activitiesRef = useRef<NotificationItem[]>([])
  const isLoadingRef = useRef(false)

  const showNext = useCallback(() => {
    const activities = activitiesRef.current
    if (activities.length === 0) {
      activitiesRef.current = FALLBACK_NOTIFICATIONS
    }
    const currentActivities = activitiesRef.current
    const nextIndex = (index + 1) % currentActivities.length
    setIndex(nextIndex)
    setNotification(currentActivities[nextIndex])
    setIsExiting(false)
    setIsVisible(true)

    // Start exit after 3.5s
    setTimeout(() => {
      setIsExiting(true)
    }, 3500)

    // Hide after 4s
    setTimeout(() => {
      setIsVisible(false)
    }, 4000)

    // Show next after 5-9s random delay
    const delay = 5000 + Math.random() * 4000
    setTimeout(showNext, delay)
  }, [index])

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
        // Use fallback data on error
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

    return () => clearTimeout(initialTimer)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!isVisible) return null

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
