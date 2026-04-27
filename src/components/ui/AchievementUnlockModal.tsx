import { useEffect, useState } from 'react'
import type { Achievement } from '../../hooks/useDreamStore'
import { AchievementShareCard } from '../AchievementShareCard'
import styles from './AchievementUnlockModal.module.css'

interface AchievementUnlockModalProps {
  achievement: Achievement | null
  isOpen: boolean
  onClose: () => void
}

export function AchievementUnlockModal({ achievement, isOpen, onClose }: AchievementUnlockModalProps) {
  const [showContent, setShowContent] = useState(false)
  const [showGlow, setShowGlow] = useState(false)
  const [showShareCard, setShowShareCard] = useState(false)

  useEffect(() => {
    if (isOpen && achievement) {
      // Haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100, 50, 200])
      }

      // Staggered animation sequence
      const glowTimer = setTimeout(() => setShowGlow(true), 100)
      const contentTimer = setTimeout(() => setShowContent(true), 400)

      return () => {
        clearTimeout(glowTimer)
        clearTimeout(contentTimer)
      }
    } else {
      setShowGlow(false)
      setShowContent(false)
    }
  }, [isOpen, achievement])

  // Auto-close after animation
  useEffect(() => {
    if (isOpen) {
      const closeTimer = setTimeout(() => {
        onClose()
      }, 3500)
      return () => clearTimeout(closeTimer)
    }
  }, [isOpen, onClose])

  if (!isOpen || !achievement) return null

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={`${styles.modal} ${showGlow ? styles.glowing : ''}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`成就解锁：${achievement.title}`}
      >
        {/* Glow effect */}
        <div className={styles.glow} />

        {/* Card */}
        <div className={`${styles.card} ${showContent ? styles.revealed : ''}`}>
          {/* Badge */}
          <div className={styles.badge}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={styles.badgeIcon}>
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </div>

          {/* Icon */}
          <div className={styles.iconWrapper}>
            <span className={styles.icon}>{achievement.icon}</span>
          </div>

          {/* Text */}
          <div className={styles.textContent}>
            <p className={styles.label}>成就解锁</p>
            <h3 className={styles.title}>{achievement.title}</h3>
            <p className={styles.description}>{achievement.description}</p>
          </div>

          {/* Decorative stars */}
          <div className={styles.stars}>
            {[...Array(6)].map((_, i) => (
              <span
                key={i}
                className={styles.star}
                style={{ animationDelay: `${0.5 + i * 0.1}s` }}
              />
            ))}
            {/* Confetti particles */}
            {[...Array(6)].map((_, i) => (
              <span
                key={`confetti-${i}`}
                className={styles.confetti}
              />
            ))}
          </div>
        </div>

        {/* Dismiss hint */}
        <button className={styles.dismissHint} onClick={onClose}>
          点击任意处关闭
        </button>

        {/* Share button */}
        <button className={styles.shareBtn} onClick={() => setShowShareCard(true)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          炫耀一下
        </button>

        {/* Achievement Share Card Modal */}
        {showShareCard && achievement && (
          <AchievementShareCard
            achievement={achievement}
            onClose={() => setShowShareCard(false)}
            onShare={onClose}
          />
        )}
      </div>
    </div>
  )
}
