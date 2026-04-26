import { useState } from 'react'
import { Button } from '../components/ui/Button'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import { Toast } from '../components/ui/Toast'
import { Statistics } from '../components/Statistics'
import { AmbientPlayer } from '../components/AmbientPlayer'
import { useDreamStore, ACHIEVEMENTS } from '../hooks/useDreamStore'
import styles from './Profile.module.css'

const FONT_SIZE_OPTIONS = [
  { value: 'small' as const, label: '小', size: '12px' },
  { value: 'medium' as const, label: '中', size: '14px' },
  { value: 'large' as const, label: '大', size: '16px' }
]

const THEME_OPTIONS = [
  { value: 'starry' as const, label: '星夜', icon: '🌙', desc: '深邃星空' },
  { value: 'aurora' as const, label: '极光', icon: '🌌', desc: '神秘极光' },
  { value: 'highcontrast' as const, label: '高对比', icon: '☀️', desc: '清晰高对比' }
]

export function Profile() {
  const { history, achievements, clearHistory, fontSize, setFontSize, theme, setTheme } = useDreamStore()
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [toastVisible, setToastVisible] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  const totalDreams = history.length
  const totalWords = history.reduce((acc, item) => acc + item.story.length, 0)

  const handleClearHistory = () => {
    clearHistory()
    setShowClearConfirm(false)
    setToastMessage('历史记录已清除')
    setToastVisible(true)
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <span className={styles.badge}>个人中心</span>
          <h1 className={styles.title}>梦境档案</h1>
        </header>

        {/* Stats */}
        <div className={styles.stats}>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{totalDreams}</span>
            <span className={styles.statLabel}>记录梦境</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{totalWords.toLocaleString()}</span>
            <span className={styles.statLabel}>累计文字</span>
          </div>
        </div>

        {/* Statistics Visualization */}
        {history.length > 0 && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>记录统计</h2>
            <Statistics history={history} />
          </div>
        )}

        {/* Ambient Player */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>氛围音乐</h2>
          <AmbientPlayer />
        </div>

        {/* Achievements */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>成就</h2>
          <div className={styles.achievementsGrid}>
            {ACHIEVEMENTS.map((achievement) => {
              const isUnlocked = achievements.includes(achievement.id)
              return (
                <div
                  key={achievement.id}
                  className={`${styles.achievementCard} ${isUnlocked ? styles.unlocked : ''}`}
                >
                  <span className={styles.achievementIcon}>{achievement.icon}</span>
                  <div className={styles.achievementInfo}>
                    <span className={styles.achievementTitle}>{achievement.title}</span>
                    <span className={styles.achievementDesc}>{achievement.description}</span>
                  </div>
                  {isUnlocked && (
                    <svg className={styles.achievementCheck} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Display Settings */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>显示</h2>
          <div className={styles.settingsList}>
            <div className={styles.settingItem}>
              <div className={styles.settingInfo}>
                <span className={styles.settingLabel}>字体大小</span>
                <span className={styles.settingDesc}>调整应用内文字大小</span>
              </div>
              <div className={styles.fontSizeSelector}>
                {FONT_SIZE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    className={`${styles.fontSizeBtn} ${fontSize === option.value ? styles.fontSizeActive : ''}`}
                    onClick={() => setFontSize(option.value)}
                    aria-pressed={fontSize === option.value}
                    title={`字体大小: ${option.label}`}
                  >
                    <span style={{ fontSize: option.size }}>{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.settingItem}>
              <div className={styles.settingInfo}>
                <span className={styles.settingLabel}>主题皮肤</span>
                <span className={styles.settingDesc}>选择界面配色方案</span>
              </div>
              <div className={styles.themeSelector}>
                {THEME_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    className={`${styles.themeBtn} ${theme === option.value ? styles.themeActive : ''}`}
                    onClick={() => setTheme(option.value)}
                    aria-pressed={theme === option.value}
                    title={option.desc}
                  >
                    <span className={styles.themeIcon}>{option.icon}</span>
                    <span className={styles.themeLabel}>{option.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Settings */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>数据管理</h2>
          <div className={styles.settingsList}>
            <div className={styles.settingItem}>
              <div className={styles.settingInfo}>
                <span className={styles.settingLabel}>清除所有历史记录</span>
                <span className={styles.settingDesc}>此操作不可恢复</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowClearConfirm(true)}
                disabled={totalDreams === 0}
              >
                清除
              </Button>
            </div>
          </div>
        </div>

        {/* About */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>关于</h2>
          <div className={styles.aboutText}>
            <p>夜棂 v1.0.0</p>
            <p>记录你的每一个梦境</p>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showClearConfirm}
        title="确认清除"
        message="确定要清除所有历史记录吗？此操作不可恢复。"
        confirmText="清除"
        cancelText="取消"
        onConfirm={handleClearHistory}
        onCancel={() => setShowClearConfirm(false)}
        danger
      />

      <Toast
        message={toastMessage}
        visible={toastVisible}
        onClose={() => setToastVisible(false)}
      />
    </div>
  )
}
