import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { wallApi } from '../services/api'
import styles from './DailyHighlights.module.css'

interface Highlight {
  id: string
  sessionId: string
  storyTitle: string
  storySnippet: string
  nickname: string
  avatar: string | null
  likeCount: number
  commentCount: number
  createdAt: string
}

export function DailyHighlights() {
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchHighlights = async () => {
      try {
        const res = await wallApi.getDailyHighlights()
        if (res.success && res.data?.highlights) {
          setHighlights(res.data.highlights)
        }
      } catch (err) {
        console.error('Failed to fetch highlights:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchHighlights()
  }, [])

  if (loading) {
    return (
      <section className={styles.section}>
        <div className={styles.header}>
          <span className={styles.headerIcon}>✨</span>
          <h2 className={styles.headerTitle}>今日精选</h2>
        </div>
        <div className={styles.skeleton}>
          {[1, 2, 3].map(i => (
            <div key={i} className={styles.skeletonCard} />
          ))}
        </div>
      </section>
    )
  }

  if (highlights.length === 0) {
    return null
  }

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <span className={styles.headerIcon}>✨</span>
        <h2 className={styles.headerTitle}>今日精选</h2>
        <span className={styles.badge}>每日更新</span>
      </div>

      <div className={styles.scrollContainer}>
        <div className={styles.scrollTrack}>
          {highlights.map((highlight, index) => (
            <button
              key={highlight.id}
              className={styles.card}
              onClick={() => navigate(`/wall?post=${highlight.id}`)}
              style={{ animationDelay: `${index * 80}ms` }}
            >
              {/* Featured badge */}
              <div className={styles.featuredBadge}>
                <svg viewBox="0 0 24 24" fill="currentColor" width="10" height="10">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                精选
              </div>

              {/* Content */}
              <h3 className={styles.cardTitle}>{highlight.storyTitle}</h3>
              <p className={styles.cardSnippet}>{highlight.storySnippet}</p>

              {/* Footer */}
              <div className={styles.cardFooter}>
                <div className={styles.author}>
                  <div className={styles.avatar}>
                    {highlight.avatar ? (
                      <img src={highlight.avatar} alt="" loading="lazy" />
                    ) : (
                      <span>{highlight.nickname?.charAt(0) || '梦'}</span>
                    )}
                  </div>
                  <span className={styles.nickname}>
                    {highlight.nickname || '匿名用户'}
                  </span>
                </div>
                <div className={styles.stats}>
                  <span className={styles.stat}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                    {highlight.likeCount}
                  </span>
                  <span className={styles.stat}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    {highlight.commentCount}
                  </span>
                </div>
              </div>

              {/* Decorative glow */}
              <div className={styles.glow} />
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
