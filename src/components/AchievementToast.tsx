import { useEffect, useState } from 'react'
import type { Achievement } from '../hooks/useDreamStore'
import styles from './AchievementToast.module.css'

interface AchievementToastProps {
  achievement: Achievement | null
  onDismiss: () => void
}

export function AchievementToast({ achievement, onDismiss }: AchievementToastProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    if (achievement) {
      // Small delay before showing for smooth entrance
      const showTimer = setTimeout(() => {
        setIsVisible(true)
      }, 100)

      // Auto-dismiss after 3 seconds
      const dismissTimer = setTimeout(() => {
        handleDismiss()
      }, 3200)

      return () => {
        clearTimeout(showTimer)
        clearTimeout(dismissTimer)
      }
    }
  }, [achievement])

  const handleDismiss = () => {
    setIsExiting(true)
    setTimeout(() => {
      setIsVisible(false)
      setIsExiting(false)
      onDismiss()
    }, 300)
  }

  if (!achievement || (!isVisible && !isExiting)) return null

  return (
    <div
      className={`${styles.toast} ${isVisible ? styles.visible : ''} ${isExiting ? styles.exiting : ''}`}
      role="alert"
      aria-label={`成就解锁：${achievement.title}`}
    >
      <div className={styles.content} onClick={handleDismiss}>
        <div className={styles.iconWrapper}>
          <span className={styles.icon}>{achievement.icon}</span>
        </div>
        <div className={styles.textContent}>
          <span className={styles.label}>成就解锁</span>
          <span className={styles.title}>{achievement.title}</span>
        </div>
      </div>
      <button className={styles.closeBtn} onClick={handleDismiss} aria-label="关闭">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
      <div className={styles.progressBar} />
    </div>
  )
}
