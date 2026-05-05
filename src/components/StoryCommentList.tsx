import { useState, useEffect } from 'react'
import { storyFeedbackApi } from '../services/api'
import styles from './StoryCommentList.module.css'

interface StoryCommentListProps {
  sessionId: string
}

interface Comment {
  id: string
  overallRating: number
  comment?: string
  createdAt: string
}

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className={styles.stars}>
      {[1, 2, 3, 4, 5].map(star => (
        <span key={star} className={`${styles.star} ${star <= rating ? styles.filled : ''}`}>
          ★
        </span>
      ))}
    </div>
  )
}

function formatDate(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return '今天'
  if (diffDays === 1) return '昨天'
  if (diffDays < 7) return `${diffDays}天前`
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

export function StoryCommentList({ sessionId }: StoryCommentListProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!sessionId) return

      try {
        const result = await storyFeedbackApi.getAll(sessionId)
        if (cancelled) return

        const feedbacks = result.data?.feedbacks ?? []
        const filtered = feedbacks.filter((f: any) => f.comment)
        setComments(filtered)
      } catch (err) {
        console.error('[StoryCommentList] Failed to load comments:', err)
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [sessionId])

  if (loading) {
    return <div className={styles.loading}>加载中...</div>
  }

  if (comments.length === 0) {
    return <div className={styles.empty}>暂无评论</div>
  }

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>评论 ({comments.length})</h3>
      <div className={styles.list}>
        {comments.map(comment => (
          <div key={comment.id} className={styles.item}>
            <div className={styles.header}>
              <StarDisplay rating={comment.overallRating} />
              <span className={styles.date}>{formatDate(comment.createdAt)}</span>
            </div>
            <p className={styles.content}>{comment.comment}</p>
          </div>
        ))}
      </div>
    </div>
  )
}