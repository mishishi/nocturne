import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { libraryApi, LibraryCollectionDetail, LibraryEpisode } from '../services/api'
import { Breadcrumb } from '../components/Breadcrumb'
import styles from './Collection.module.css'

// 主题 emoji 映射
const THEME_EMOJI: Record<string, string> = {
  adventure: 'compass',
  romance: 'sparkles',
  nightmare: 'newmoon',
  mystery: 'gem',
  fantasy: 'moon',
  scifi: 'rocket',
}

const COLLECTION_ICONS: Record<string, { d: string; viewBox?: string; fill?: string; stroke?: string; strokeWidth?: string }> = {
  compass: { d: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z', fill: 'none', stroke: 'currentColor', strokeWidth: '1.5', viewBox: '0 0 24 24' },
  sparkles: { d: 'M9.649 14.15c-.19 0-.38-.07-.53-.22l-3.5-3.5a.752.752 0 0 1 0-1.06l3.5-3.5c.29-.29.77-.29 1.06 0s.29.77 0 1.06L6.28 9.92l2.97 2.97c.29.29.29.77 0 1.06-.15.15-.34.22-.53.22zM21.54 1.06l-3.5 3.5c-.29.29-.77.29-1.06 0s-.29-.77 0-1.06l2.97-2.97-2.97-2.97c-.29-.29-.29-.77 0-1.06s.77-.29 1.06 0l3.5 3.5c.29.29.29.77 0 1.06zM15.54 8.46l-3.5 3.5c-.29.29-.77.29-1.06 0s-.29-.77 0-1.06l2.97-2.97-2.97-2.97c-.29-.29-.29-.77 0-1.06s.77-.29 1.06 0l3.5 3.5c.29.29.29.77 0 1.06z', fill: 'none', stroke: 'currentColor', strokeWidth: '1.5', viewBox: '0 0 24 24' },
  newmoon: { d: 'M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z', fill: 'none', stroke: 'currentColor', strokeWidth: '1.5', viewBox: '0 0 24 24' },
  gem: { d: 'M12 2L2 9l10 13 10-13L12 2zM12 5.5l6 4.5v7L12 20 6 17v-7l6-4.5z', fill: 'none', stroke: 'currentColor', strokeWidth: '1.5', viewBox: '0 0 24 24' },
  moon: { d: 'M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z', fill: 'none', stroke: 'currentColor', strokeWidth: '1.5', viewBox: '0 0 24 24' },
  rocket: { d: 'M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119 8.54a6 6 0 1 0 7.63 7.63', fill: 'none', stroke: 'currentColor', strokeWidth: '1.5', viewBox: '0 0 24 24' }
}

function CollectionIcon({ iconKey, className }: { iconKey: string; className?: string }) {
  const icon = COLLECTION_ICONS[iconKey]
  if (!icon) return null
  return (
    <svg viewBox={icon.viewBox || '0 0 24 24'} fill={icon.fill || 'none'} stroke={icon.stroke || 'currentColor'} strokeWidth={icon.strokeWidth || '1.5'} className={className}>
      <path d={icon.d} />
    </svg>
  )
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

  const themeIcon = THEME_EMOJI[collection.theme || 'mystery'] || 'sparkles'

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { label: '首页', href: '/' },
            { label: '图书馆', href: '/library' },
            { label: collection.title }
          ]}
        />

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
              <CollectionIcon iconKey={themeIcon} className={styles.emoji} />
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
