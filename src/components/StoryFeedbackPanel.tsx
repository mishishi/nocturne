import { useState, useEffect } from 'react'
import { storyFeedbackApi } from '../services/api'
import { ExpandableCard } from './ExpandableCard'
import styles from './StoryFeedbackPanel.module.css'

interface StoryFeedbackPanelProps {
  sessionId: string
  refreshKey?: number
}

interface Stats {
  count: number
  overallAvg: number
  elementAvgs: {
    character?: number
    location?: number
    object?: number
    emotion?: number
    plot?: number
  }
}

const ELEMENT_LABELS: Record<string, string> = {
  character: '人物',
  location: '地点',
  object: '物品',
  emotion: '情绪',
  plot: '剧情'
}

export function StoryFeedbackPanel({ sessionId, refreshKey = 0 }: StoryFeedbackPanelProps) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    if (!isExpanded) return

    async function load() {
      setIsLoading(true)
      try {
        const result = await storyFeedbackApi.getAll(sessionId)
        setStats(result.data?.stats ?? null)
      } catch (err) {
        console.error('Failed to load feedback stats:', err)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [sessionId, isExpanded, refreshKey])

  const handleExpanded = () => {
    setIsExpanded(true)
  }

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p className={styles.loadingText}>加载反馈数据...</p>
        </div>
      )
    }

    if (!stats || stats.count === 0) {
      return (
        <div className={styles.empty}>
          <svg className={styles.emptyIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          <p className={styles.emptyText}>暂无反馈</p>
          <p className={styles.emptyHint}>成为第一个评价的用户</p>
        </div>
      )
    }

    return (
      <>
        {/* Overall Rating */}
        <div className={styles.overallSection}>
          <div className={styles.overallLeft}>
            <span className={styles.avgScore}>{stats.overallAvg}</span>
            <div className={styles.stars}>
              {[1, 2, 3, 4, 5].map(star => (
                <span
                  key={star}
                  className={`${styles.star} ${star <= Math.round(stats.overallAvg) ? styles.starFilled : ''}`}
                >
                  ★
                </span>
              ))}
            </div>
          </div>
          <div className={styles.overallRight}>
            <span className={styles.feedbackCount}>{stats.count} 条反馈</span>
          </div>
        </div>

        {/* Dimension Ratings */}
        <div className={styles.dimensionsSection}>
          <h4 className={styles.sectionTitle}>
            <svg className={styles.sectionIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
            各维度评分
          </h4>
          <div className={styles.dimensionsList}>
            {Object.entries(stats.elementAvgs).map(([key, value]) => {
              if (value === null || value === undefined) return null
              return (
                <div key={key} className={styles.dimensionRow}>
                  <span className={styles.dimensionLabel}>{ELEMENT_LABELS[key] || key}</span>
                  <div className={styles.dimensionBar}>
                    <div
                      className={styles.dimensionFill}
                      style={{ width: `${(value / 5) * 100}%` }}
                    />
                  </div>
                  <span className={styles.dimensionValue}>{value.toFixed(1)}</span>
                </div>
              )
            })}
          </div>
        </div>
      </>
    )
  }

  return (
    <ExpandableCard
      icon="★"
      title="故事反馈"
      onExpanded={handleExpanded}
    >
      {renderContent()}
    </ExpandableCard>
  )
}
