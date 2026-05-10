import { createPortal } from 'react-dom'
import { useState } from 'react'
import { Button } from './ui/Button'
import { useDreamStore, AchievementIcon } from '../hooks/useDreamStore'
import styles from './DeepInterpretationModal.module.css'

interface DeepInterpretationModalProps {
  sessionId: string
  dreamSnippet?: string
  story?: string
  onClose: () => void
}

interface DeepInterpretationData {
  deepAnalysis: string
  patterns: Array<{
    title: string
    description: string
  }>
  growthInsight: string
}

const DEEP_INTERPRETATION_POINTS = 20

export function DeepInterpretationModal({ sessionId: _sessionId, dreamSnippet: _dreamSnippet, story: _story, onClose }: DeepInterpretationModalProps) {
  const { points } = useDreamStore()
  const [isLoading, setIsLoading] = useState(false)
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [data, setData] = useState<DeepInterpretationData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const canUnlock = points >= DEEP_INTERPRETATION_POINTS

  const handleUnlock = async () => {
    if (!canUnlock || isLoading) return

    setIsLoading(true)
    setError(null)

    try {
      // Simulate API call for deep interpretation
      // In production, this would call a backend endpoint
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Mock data for demonstration
      setData({
        deepAnalysis: `根据你描述的梦境内容，我进行了深入的心理分析。你的梦境中出现的场景和元素可能反映了你潜意识中的某些需求或未解决的情感问题。\n\n从心理学的角度来看，梦是潜意识的窗口。通过分析梦中的象征元素，我们可以更好地理解内心的真实想法和感受。`,
        patterns: [
          {
            title: '情感模式识别',
            description: '你近期的梦境中频繁出现与"追逐"相关的场景，这可能暗示你在现实生活中正在追求某个目标或逃避某种压力。'
          },
          {
            title: '潜意识关联',
            description: '梦境中的水元素往往与情感紧密相关。你梦见的水体状态（平静/汹涌）可能反映了你当前的情绪状态。'
          },
          {
            title: '象征意义解析',
            description: '梦中出现的人物可能代表你性格中的不同侧面，或是你生活中重要人物的投影。'
          }
        ],
        growthInsight: '通过持续的梦境记录和反思，你正在培养对内心世界的觉察力。这种自我探索的习惯将帮助你更好地理解自己，促进个人成长。'
      })
      setIsUnlocked(true)
    } catch {
      setError('获取深度解读失败，请稍后重试')
    } finally {
      setIsLoading(false)
    }
  }

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose} aria-label="关闭">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <header className={styles.header}>
          <AchievementIcon iconKey="crown" className={styles.crownIcon} />
          <h2 className={styles.headerTitle}>深度解读</h2>
          <p className={styles.headerSubtitle}>探索潜意识，发现更深层的自己</p>
          <div className={styles.premiumBadge}>
            <AchievementIcon iconKey="sparkle" className={styles.premiumBadgeIcon} />
            <span className={styles.premiumBadgeText}>Premium</span>
          </div>
        </header>

        <div className={styles.content}>
          {isLoading ? (
            <div className={styles.loading}>
              <div className={styles.spinner} />
              <span className={styles.loadingText}>正在生成深度解读...</span>
            </div>
          ) : isUnlocked && data ? (
            <>
              {/* Deep Analysis Section */}
              <section className={`${styles.section} ${styles.deepAnalysis}`}>
                <div className={styles.sectionHeader}>
                  <AchievementIcon iconKey="gem" className={styles.sectionIcon} />
                  <h3 className={styles.sectionTitle}>深度心理分析</h3>
                </div>
                <p className={styles.analysisText}>{data.deepAnalysis}</p>
              </section>

              {/* Pattern Analysis */}
              <section className={styles.section}>
                <div className={styles.sectionHeader}>
                  <AchievementIcon iconKey="chart" className={styles.sectionIcon} />
                  <h3 className={styles.sectionTitle}>模式分析</h3>
                </div>
                <div className={styles.patternList}>
                  {data.patterns.map((pattern, index) => (
                    <div key={index} className={styles.patternItem}>
                      <span className={styles.patternBullet}>{index + 1}</span>
                      <div className={styles.patternContent}>
                        <h4 className={styles.patternTitle}>{pattern.title}</h4>
                        <p className={styles.patternDesc}>{pattern.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Growth Insight */}
              <section className={styles.section}>
                <div className={styles.sectionHeader}>
                  <AchievementIcon iconKey="seedling" className={styles.sectionIcon} />
                  <h3 className={styles.sectionTitle}>成长洞察</h3>
                </div>
                <div className={styles.growthCard}>
                  <h4 className={styles.growthTitle}>
                    <AchievementIcon iconKey="lightbulb" className={styles.growthIcon} />
                    自我成长建议
                  </h4>
                  <p className={styles.growthText}>{data.growthInsight}</p>
                </div>
              </section>
            </>
          ) : (
            <div className={styles.lockedOverlay}>
              <AchievementIcon iconKey="lock" className={styles.lockIcon} />
              <h3 className={styles.lockedTitle}>解锁深度解读</h3>
              <p className={styles.lockedDesc}>
                深度解读将为你提供更全面的心理分析、潜意识模式识别和个人成长建议。
              </p>

              {error && (
                <p style={{ color: '#EF4444', fontSize: '0.875rem', marginBottom: 'var(--space-4)' }}>{error}</p>
              )}

              <Button
                onClick={handleUnlock}
                disabled={!canUnlock}
                size="lg"
              >
                {canUnlock ? (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 20, height: 20 }}>
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    解锁深度解读
                  </>
                ) : (
                  '积分不足'
                )}
              </Button>

              <p className={styles.pointsCost}>
                需要 <strong>{DEEP_INTERPRETATION_POINTS}</strong> 积分，你当前有 <strong>{points}</strong> 积分
              </p>
            </div>
          )}
        </div>

        {isUnlocked && data && (
          <div className={styles.actionSection}>
            <button className={styles.unlockBtn} disabled>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              已解锁
            </button>
          </div>
        )}

        <footer className={styles.footer}>
          <p className={styles.footerText}>深度解读仅供参考，请结合自己的实际情况理解</p>
        </footer>
      </div>
    </div>,
    document.body
  )
}
