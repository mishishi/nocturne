import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { libraryApi, LibraryCollectionDetail, LibraryEpisode } from '../services/api'
import styles from './Collection.module.css'

// 主题 emoji 映射
const THEME_EMOJI: Record<string, string> = {
  adventure: '⚔️',
  romance: '💫',
  nightmare: '🌑',
  mystery: '🔮',
  fantasy: '🌙',
  scifi: '🚀',
}

export function Collection() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [collection, setCollection] = useState<LibraryCollectionDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchCollection() {
      if (!id) return
      setLoading(true)
      setError(null)
      try {
        const response = await libraryApi.getCollectionDetail(id)
        if (response.success && response.data) {
          setCollection(response.data.collection)
        } else {
          setError('合集不存在')
        }
      } catch (err) {
        console.error('获取合集详情失败:', err)
        setError('获取合集详情失败')
      } finally {
        setLoading(false)
      }
    }
    fetchCollection()
  }, [id])

  const handleEpisodeClick = (episode: LibraryEpisode) => {
    navigate(`/story/${episode.sessionId}`)
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.skeleton}>
            <div className={styles.skeletonHeader} />
            <div className={styles.skeletonCover} />
            <div className={styles.skeletonList}>
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className={styles.skeletonEpisode} />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !collection) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.error}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p>{error || '合集不存在'}</p>
            <button onClick={() => navigate('/library')} className={styles.backBtn}>
              返回图书馆
            </button>
          </div>
        </div>
      </div>
    )
  }

  const emoji = THEME_EMOJI[collection.theme || 'mystery'] || '✨'

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Back Button */}
        <button className={styles.back} onClick={() => navigate('/library')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 19l-7-7 7-7" />
          </svg>
          <span>返回</span>
        </button>

        {/* Header */}
        <header className={styles.header}>
          <div className={styles.cover}>
            <div className={styles.coverInner}>
              <span className={styles.emoji}>{emoji}</span>
              <div className={styles.coverGlow} />
            </div>
          </div>
          <div className={styles.headerInfo}>
            <span className={styles.theme}>{collection.theme}</span>
            <h1 className={styles.title}>{collection.title}</h1>
            {collection.description && (
              <p className={styles.description}>{collection.description}</p>
            )}
            <div className={styles.stats}>
              <span className={styles.stat}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                {collection.episodes?.length || 0} 篇故事
              </span>
            </div>
          </div>
        </header>

        {/* Episode List */}
        <section className={styles.episodes}>
          <h2 className={styles.sectionTitle}>目录</h2>
          {collection.episodes && collection.episodes.length > 0 ? (
            <div className={styles.episodeList}>
              {collection.episodes.map((episode, index) => (
                <div
                  key={episode.id}
                  className={styles.episodeCard}
                  onClick={() => handleEpisodeClick(episode)}
                >
                  <span className={styles.episodeNumber}>{index + 1}</span>
                  <div className={styles.episodeInfo}>
                    <h3 className={styles.episodeTitle}>{episode.title}</h3>
                    {episode.excerpt && (
                      <p className={styles.episodeExcerpt}>{episode.excerpt}</p>
                    )}
                    {episode.dreamFragment && (
                      <p className={styles.episodePreview}>
                        {episode.dreamFragment.slice(0, 60)}...
                      </p>
                    )}
                  </div>
                  <svg className={styles.episodeArrow} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.empty}>
              <p>暂无故事</p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
