import { useState } from 'react'
import { createPortal } from 'react-dom'
import { api } from '../services/api'
import styles from './DreamInterpretationPanel.module.css'

interface RecurringSymbol {
  symbol: string
  meaning: string
  frequency: number
}

interface DreamInterpretationPanelProps {
  dreamerPersonality: string
  dreamerPersonalityDesc: string
  emotionalTrend?: {
    current: string
    insight: string
  }
  recurringSymbols: RecurringSymbol[]
  sleepQualityScore: number
  dreamActivityLevel: string
  tips: string[]
  sessionId: string
  onClose?: () => void
}

export function DreamInterpretationPanel({
  dreamerPersonality,
  dreamerPersonalityDesc,
  emotionalTrend,
  recurringSymbols,
  sleepQualityScore,
  dreamActivityLevel,
  tips,
  sessionId,
  onClose
}: DreamInterpretationPanelProps) {
  const [feedbackState, setFeedbackState] = useState<'idle' | 'submitting' | 'submitted'>('idle')
  const [selectedRating, setSelectedRating] = useState<boolean | null>(null)
  const [showShareTip, setShowShareTip] = useState(false)

  // Generate star particles
  const stars = Array.from({ length: 15 }, (_, i) => ({
    id: i,
    delay: Math.random() * 4,
    duration: 3 + Math.random() * 3,
    x: `${Math.random() * 100}%`,
    y: `${Math.random() * 100}%`,
    size: 1 + Math.random() * 1.5
  }))

  // Get emoji for personality - use symbol if it's short (likely emoji), skip if it's Chinese text
  const firstSymbol = recurringSymbols[0]?.symbol || ''
  const isChineseText = /[\u4e00-\u9fa5]/.test(firstSymbol) // contains Chinese characters
  const personalityEmoji = !isChineseText && firstSymbol.length <= 4 ? firstSymbol : '✨'

  const handleFeedback = async (isAccurate: boolean) => {
    if (feedbackState === 'submitted') return
    setSelectedRating(isAccurate)
    setFeedbackState('submitting')

    try {
      await api.submitInterpretationFeedback(sessionId, isAccurate)
      setFeedbackState('submitted')
    } catch {
      setFeedbackState('idle')
    }
  }

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        <button className={styles.closeBtn} onClick={onClose} aria-label="关闭">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        {/* Star background */}
        <div className={styles.starField}>
          {stars.map(star => (
            <div
              key={star.id}
              className={styles.star}
              style={{
                left: star.x,
                top: star.y,
                width: `${star.size}px`,
                height: `${star.size}px`,
                animationDelay: `${star.delay}s`,
                animationDuration: `${star.duration}s`,
                ['--duration' as string]: `${star.duration}s`
              }}
            />
          ))}
        </div>

        {/* Header */}
        <header className={styles.header}>
          <h2 className={styles.headerTitle}>
            <span className={styles.headerEmoji}>✨</span>
            你的梦境人格
          </h2>
        </header>

        {/* Personality Card */}
        <section className={styles.personalityCard}>
          <div className={styles.personalityHeader}>
            <span className={styles.personalityEmoji}>{personalityEmoji}</span>
            <h3 className={styles.personalityName}>{dreamerPersonality}</h3>
          </div>
          <p className={styles.personalityDesc}>{dreamerPersonalityDesc}</p>
          {emotionalTrend?.insight && (
            <p className={styles.emotionalInsight}>{emotionalTrend.insight}</p>
          )}
        </section>

        {/* Recurring Symbols Tags */}
        {recurringSymbols.length > 0 && (
          <div className={styles.symbolsTags}>
            <span className={styles.symbolsLabel}>反复出现：</span>
            <div className={styles.tagsScroll}>
              {recurringSymbols.map((item, index) => (
                <span key={index} className={styles.symbolTag}>
                  {item.symbol}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Stats Section */}
        <section className={styles.statsSection}>
          <h4 className={styles.sectionTitle}>
            <span className={styles.sectionEmoji}>📊</span>
            本周梦境数据
          </h4>
          <div className={styles.statsList}>
            <div className={styles.statItem}>
              <span className={styles.statBullet}>├</span>
              <span className={styles.statLabel}>记录次数：</span>
              <span className={styles.statValue}>3次</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statBullet}>├</span>
              <span className={styles.statLabel}>睡眠质量：</span>
              <span className={styles.statValue}>{sleepQualityScore * 10}分</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statBullet}>└</span>
              <span className={styles.statLabel}>梦境类型：</span>
              <span className={styles.statValue}>{dreamActivityLevel}</span>
            </div>
          </div>
        </section>

        {/* Tips Section */}
        {tips.length > 0 && (
          <section className={styles.tipsSection}>
            <h4 className={styles.sectionTitle}>
              <span className={styles.sectionEmoji}>💡</span>
              小建议
            </h4>
            <div className={styles.tipsList}>
              {tips.slice(0, 2).map((tip, index) => (
                <div key={index} className={styles.tipCard}>
                  <span className={styles.tipQuote}>"</span>
                  <p className={styles.tipText}>{tip}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Share Button */}
        <div className={styles.shareSection}>
          <button className={styles.shareButton} onClick={() => setShowShareTip(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            生成专属分享图
          </button>
          {showShareTip && (
            <p className={styles.shareTip}>分享图生成功能即将上线</p>
          )}
        </div>

        {/* Feedback Section */}
        <section className={styles.feedbackSection}>
          {feedbackState === 'idle' && (
            <>
              <p className={styles.feedbackPrompt}>这份解读对你有帮助吗？</p>
              <div className={styles.feedbackButtons}>
                <button
                  className={`${styles.feedbackBtn} ${styles.feedbackBtnGood}`}
                  onClick={() => handleFeedback(true)}
                >
                  <span>👍</span>
                  <span>有帮助</span>
                </button>
                <button
                  className={`${styles.feedbackBtn} ${styles.feedbackBtnBad}`}
                  onClick={() => handleFeedback(false)}
                >
                  <span>👎</span>
                  <span>不太准</span>
                </button>
              </div>
            </>
          )}

          {feedbackState === 'submitting' && (
            <div className={styles.feedbackLoading}>
              <div className={styles.miniSpinner} />
              <span>提交中...</span>
            </div>
          )}

          {feedbackState === 'submitted' && (
            <div className={styles.feedbackThanks}>
              {selectedRating ? '感谢你的反馈！🙏' : '感谢你的反馈，我们会继续改进'}
            </div>
          )}
        </section>

        {/* Footer */}
        <footer className={styles.footer}>
          <div className={styles.footerLine} />
          <span className={styles.footerText}>解读仅供参考，请结合自己的实际情况理解</span>
        </footer>
      </div>
    </div>,
    document.body
  )
}
