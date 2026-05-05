import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from './ui/Button'
import styles from './ReEngagementModal.module.css'

const LAST_ACTIVE_KEY = 'yeelin_last_active'
const INACTIVE_THRESHOLD_DAYS = 3

interface ReEngagementModalProps {
  onClose: () => void
}

export function ReEngagementModal({ onClose }: ReEngagementModalProps) {
  const [lastActiveDate, setLastActiveDate] = useState<string | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem(LAST_ACTIVE_KEY)
    setLastActiveDate(stored)
  }, [])

  const getDaysInactive = () => {
    if (!lastActiveDate) return 0
    const lastActive = new Date(lastActiveDate)
    const today = new Date()
    const diffTime = today.getTime() - lastActive.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const daysInactive = getDaysInactive()

  // Don't show if less than threshold
  if (daysInactive < INACTIVE_THRESHOLD_DAYS) {
    return null
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.icon}>
          <svg viewBox="0 0 80 80" fill="none">
            <circle cx="40" cy="40" r="35" fill="url(#moonGrad)" opacity="0.9" />
            <circle cx="32" cy="32" r="6" fill="rgba(255,255,255,0.3)" />
            <circle cx="48" cy="38" r="4" fill="rgba(255,255,255,0.2)" />
            <circle cx="35" cy="48" r="5" fill="rgba(255,255,255,0.25)" />
            <defs>
              <radialGradient id="moonGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#FFD666" />
                <stop offset="100%" stopColor="#F4D35E" />
              </radialGradient>
            </defs>
          </svg>
        </div>

        <h2 className={styles.title}>欢迎回来</h2>

        <p className={styles.message}>
          你已经离开 {daysInactive} 天了
          <br />
          昨晚有什么新的梦境吗？
        </p>

        <div className={styles.hint}>
          记录梦境，保存回忆
        </div>

        <div className={styles.actions}>
          <Link to="/dream" onClick={onClose}>
            <Button size="lg">开始记录</Button>
          </Link>
          <button className={styles.skipButton} onClick={onClose}>
            稍后再说
          </button>
        </div>

        {/* Decorative stars */}
        <div className={styles.star} style={{ top: '15%', left: '10%', animationDelay: '0s' }} />
        <div className={styles.star} style={{ top: '25%', right: '15%', animationDelay: '0.5s' }} />
        <div className={styles.star} style={{ bottom: '20%', left: '20%', animationDelay: '1s' }} />
        <div className={styles.star} style={{ bottom: '30%', right: '10%', animationDelay: '1.5s' }} />
      </div>
    </div>
  )
}

// Call this on app start to update last active date
export function updateLastActiveDate() {
  const today = new Date().toISOString()
  localStorage.setItem(LAST_ACTIVE_KEY, today)
}

// Check if should show re-engagement modal
export function shouldShowReEngagement(hasSeenModal: boolean): boolean {
  if (hasSeenModal) return false

  const lastActive = localStorage.getItem(LAST_ACTIVE_KEY)
  if (!lastActive) return false

  const lastActiveDate = new Date(lastActive)
  const today = new Date()
  const diffTime = today.getTime() - lastActiveDate.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  return diffDays >= INACTIVE_THRESHOLD_DAYS
}
