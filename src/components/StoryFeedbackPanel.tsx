import { useState, useEffect } from 'react'
import { storyFeedbackApi } from '../services/api'
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

const ELEMENT_LABELS = {
  character: '人物',
  location: '地点',
  object: '物品',
  emotion: '情绪',
  plot: '剧情'
}

export function StoryFeedbackPanel({ sessionId, refreshKey = 0 }: StoryFeedbackPanelProps) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    if (!isExpanded) return

    async function load() {
      setLoading(true)
      try {
        const result = await storyFeedbackApi.getAll(sessionId)
        setStats(result.data?.stats ?? null)
      } catch (err) {
        console.error('Failed to load feedback stats:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [sessionId, isExpanded, refreshKey])

  if (loading) {
    return <div className={styles.loading}>加载中...</div>
  }

  return (
    <div className={styles.container}>
      <button
        className={styles.toggleBtn}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span>查看反馈</span>
        <span className={`${styles.arrow} ${isExpanded ? styles.expanded : ''}`}>▼</span>
      </button>

      {isExpanded && (
        <div className={styles.content}>
          {!stats || stats.count === 0 ? (
            <p className={styles.empty}>暂无反馈</p>
          ) : (
            <>
              {/* Overall rating */}
              <div className={styles.overall}>
                <span className={styles.avgScore}>{stats.overallAvg}</span>
                <div className={styles.stars}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <span
                      key={star}
                      className={`${styles.star} ${star <= Math.round(stats.overallAvg) ? styles.filled : ''}`}
                    >
                      ★
                    </span>
                  ))}
                </div>
                <span className={styles.count}>{stats.count}条反馈</span>
              </div>

              {/* Dimension ratings */}
              <div className={styles.elements}>
                <h4 className={styles.elementsTitle}>各维度评分</h4>
                {Object.entries(stats.elementAvgs).map(([key, value]) => {
                  if (value === null || value === undefined) return null
                  return (
                    <div key={key} className={styles.elementRow}>
                      <span className={styles.elementLabel}>{ELEMENT_LABELS[key as keyof typeof ELEMENT_LABELS]}</span>
                      <div className={styles.elementBar}>
                        <div
                          className={styles.elementFill}
                          style={{ width: `${(value / 5) * 100}%` }}
                        />
                      </div>
                      <span className={styles.elementValue}>{value}</span>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}