import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useDreamStore, ACHIEVEMENTS, type Achievement } from '../hooks/useDreamStore'
import { AchievementShareCard } from './AchievementShareCard'
import styles from './AchievementCenter.module.css'

interface AchievementCenterProps {
  isOpen: boolean
  onClose: () => void
}

export function AchievementCenter({ isOpen, onClose }: AchievementCenterProps) {
  const { achievements, history } = useDreamStore()
  const [activeTab, setActiveTab] = useState<'all' | 'locked'>('all')
  const [sharingAchievement, setSharingAchievement] = useState<Achievement | null>(null)

  if (!isOpen) return null

  const unlockedAchievements = ACHIEVEMENTS.filter(a => achievements.includes(a.id))
  const lockedAchievements = ACHIEVEMENTS.filter(a => !achievements.includes(a.id))

  // Calculate next achievement progress
  const getProgress = (achievementId: string) => {
    switch (achievementId) {
      case 'week_streak': {
        // Check consecutive days
        if (history.length < 7) {
          return { current: history.length, target: 7, text: `已连续记录 ${history.length} 天` }
        }
        return null
      }
      case 'story_collector': {
        const count = history.length
        if (count < 10) {
          return { current: count, target: 10, text: `已收藏 ${count}/10 个故事` }
        }
        return null
      }
      default:
        return null
    }
  }

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={styles.titleIcon}>
              <circle cx="12" cy="8" r="6" />
              <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
            </svg>
            成就殿堂
          </h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="关闭">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className={styles.stats}>
          <div className={styles.statItem}>
            <span className={styles.statValue}>{unlockedAchievements.length}</span>
            <span className={styles.statLabel}>已解锁</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.statItem}>
            <span className={styles.statValue}>{lockedAchievements.length}</span>
            <span className={styles.statLabel}>待解锁</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.statItem}>
            <span className={styles.statValue}>{history.length}</span>
            <span className={styles.statLabel}>梦境故事</span>
          </div>
        </div>

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'all' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('all')}
          >
            全部成就
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'locked' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('locked')}
          >
            进行中
          </button>
        </div>

        <div className={styles.list}>
          {activeTab === 'all' && ACHIEVEMENTS.map(achievement => {
            const isUnlocked = achievements.includes(achievement.id)
            const progress = isUnlocked ? null : getProgress(achievement.id)

            return (
              <div
                key={achievement.id}
                className={`${styles.achievementCard} ${isUnlocked ? styles.unlocked : styles.locked}`}
              >
                <div className={styles.achievementIcon}>
                  {isUnlocked ? (
                    <span className={styles.iconEmoji}>{achievement.icon}</span>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={styles.iconLock}>
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0110 0v4" />
                    </svg>
                  )}
                </div>
                <div className={styles.achievementInfo}>
                  <div className={styles.achievementName}>{achievement.title}</div>
                  <div className={styles.achievementDesc}>{achievement.description}</div>
                  {progress && (
                    <div className={styles.progressBar}>
                      <div
                        className={styles.progressFill}
                        style={{ width: `${(progress.current / progress.target) * 100}%` }}
                      />
                    </div>
                  )}
                  {progress && (
                    <div className={styles.progressText}>{progress.text}</div>
                  )}
                </div>
                {isUnlocked && (
                  <div className={styles.unlockedActions}>
                    <button
                      className={styles.shareBtn}
                      onClick={() => setSharingAchievement(achievement)}
                      title="分享成就"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="18" cy="5" r="3" />
                        <circle cx="6" cy="12" r="3" />
                        <circle cx="18" cy="19" r="3" />
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                      </svg>
                    </button>
                    <div className={styles.unlockedBadge}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {activeTab === 'locked' && lockedAchievements.length === 0 && (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>🎉</span>
              <p>太棒了！所有成就都已解锁！</p>
            </div>
          )}

          {activeTab === 'locked' && lockedAchievements.map(achievement => {
            const progress = getProgress(achievement.id)

            return (
              <div key={achievement.id} className={`${styles.achievementCard} ${styles.locked}`}>
                <div className={styles.achievementIcon}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={styles.iconLock}>
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0110 0v4" />
                  </svg>
                </div>
                <div className={styles.achievementInfo}>
                  <div className={styles.achievementName}>{achievement.title}</div>
                  <div className={styles.achievementDesc}>{achievement.description}</div>
                  {progress && (
                    <>
                      <div className={styles.progressBar}>
                        <div
                          className={styles.progressFill}
                          style={{ width: `${(progress.current / progress.target) * 100}%` }}
                        />
                      </div>
                      <div className={styles.progressText}>{progress.text}</div>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className={styles.footer}>
          <p className={styles.footerText}>继续记录梦境，解锁更多成就</p>
        </div>

        {sharingAchievement && (
          <AchievementShareCard
            achievement={sharingAchievement}
            onClose={() => setSharingAchievement(null)}
          />
        )}
      </div>
    </div>,
    document.body
  )
}
