import { useState, useEffect } from 'react'
import { storyFeedbackApi } from '../services/api'
import styles from './AIQualityAnalytics.module.css'

interface Analytics {
  totalFeedbacks: number
  overallAvg: number
  dimensionAvgs: {
    character: number | null
    location: number | null
    object: number | null
    emotion: number | null
    plot: number | null
  }
  ratingDistribution: { 1: number; 2: number; 3: number; 4: number; 5: number }
  weakestDimension: string | null
  weakestValue: number | null
  suggestions: string[]
}

const DIMENSION_NAMES = {
  character: '角色塑造',
  location: '场景描写',
  object: '物品细节',
  emotion: '情感表达',
  plot: '情节设计'
}

export function AIQualityAnalytics() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const result = await storyFeedbackApi.getAnalytics()
        if (result.success) {
          setAnalytics(result.analytics)
        }
      } catch (err) {
        setError('加载分析数据失败')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return <div className={styles.loading}>加载中...</div>
  }

  if (error || !analytics) {
    return <div className={styles.error}>{error || '数据加载失败'}</div>
  }

  if (analytics.totalFeedbacks === 0) {
    return (
      <div className={styles.container}>
        <h2 className={styles.title}>AI质量分析</h2>
        <div className={styles.empty}>暂无反馈数据</div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>AI质量分析</h2>

      {/* Overall score */}
      <div className={styles.overallSection}>
        <div className={styles.overallScore}>
          <span className={styles.scoreValue}>{analytics.overallAvg}</span>
          <span className={styles.scoreLabel}>/ 5.0</span>
        </div>
        <div className={styles.totalCount}>共 {analytics.totalFeedbacks} 条反馈</div>
      </div>

      {/* Dimension breakdown */}
      <div className={styles.dimensions}>
        <h3 className={styles.sectionTitle}>各维度评分</h3>
        {Object.entries(analytics.dimensionAvgs).map(([key, value]) => {
          if (value === null) return null
          const isWeak = key === analytics.weakestDimension
          return (
            <div key={key} className={`${styles.dimRow} ${isWeak ? styles.weak : ''}`}>
              <span className={styles.dimName}>{DIMENSION_NAMES[key as keyof typeof DIMENSION_NAMES]}</span>
              <div className={styles.dimBar}>
                <div className={styles.dimFill} style={{ width: `${(value / 5) * 100}%` }} />
              </div>
              <span className={styles.dimValue}>{value}</span>
            </div>
          )
        })}
      </div>

      {/* Rating distribution */}
      <div className={styles.distribution}>
        <h3 className={styles.sectionTitle}>评分分布</h3>
        <div className={styles.distBars}>
          {[5, 4, 3, 2, 1].map(rating => (
            <div key={rating} className={styles.distRow}>
              <span className={styles.distLabel}>{rating}星</span>
              <div className={styles.distBar}>
                <div
                  className={styles.distFill}
                  style={{ width: `${(analytics.ratingDistribution[rating as keyof typeof analytics.ratingDistribution] / analytics.totalFeedbacks) * 100}%` }}
                />
              </div>
              <span className={styles.distCount}>
                {analytics.ratingDistribution[rating as keyof typeof analytics.ratingDistribution]}条
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Suggestions */}
      <div className={styles.suggestions}>
        <h3 className={styles.sectionTitle}>改进建议</h3>
        <ul className={styles.suggestionList}>
          {analytics.suggestions.map((s, i) => (
            <li key={i} className={styles.suggestionItem}>{s}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
