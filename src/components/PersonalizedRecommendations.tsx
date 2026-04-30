import { useState, useEffect } from 'react'
import { storyFeedbackApi } from '../services/api'
import styles from './PersonalizedRecommendations.module.css'

interface Recommendation {
  id: string
  sessionId: string
  storyTitle: string
  storySnippet: string
  nickname: string
  likeCount: number
  commentCount: number
  createdAt: string
  score: number
  reason: string
}

export function PersonalizedRecommendations() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const openid = localStorage.getItem('yeelin_openid')

  useEffect(() => {
    if (!openid) {
      setLoading(false)
      return
    }

    async function load() {
      try {
        const result = await storyFeedbackApi.getRecommendations(openid!)
        if (result.success && result.data?.recommendations) {
          setRecommendations(result.data.recommendations)
        }
      } catch (err) {
        setError('加载推荐失败')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [openid])

  if (!openid) {
    return null
  }

  if (loading) {
    return <div className={styles.loading}>为你加载推荐...</div>
  }

  if (error || recommendations.length === 0) {
    return null
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>为你推荐</h2>
      <div className={styles.list}>
        {recommendations.slice(0, 5).map((rec) => (
          <div key={rec.id} className={styles.item}>
            <div className={styles.itemHeader}>
              <span className={styles.itemTitle}>{rec.storyTitle}</span>
              <span className={styles.itemReason}>{rec.reason}</span>
            </div>
            <p className={styles.itemSnippet}>{rec.storySnippet.slice(0, 60)}...</p>
            <div className={styles.itemMeta}>
              <span>{rec.nickname}</span>
              <span>👍 {rec.likeCount}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
