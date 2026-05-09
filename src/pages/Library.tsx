import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { libraryApi, LibraryCollection } from '../services/api'
import { showToast } from '../hooks/useDreamStore'
import { EmptyState } from '../components/ui/EmptyState'
import styles from './Library.module.css'

// 主题配置
const THEMES = [
  { id: 'all', label: '全部', emoji: '✨' },
  { id: 'adventure', label: '冒险', emoji: '⚔️' },
  { id: 'romance', label: '浪漫', emoji: '💫' },
  { id: 'nightmare', label: '噩梦', emoji: '🌑' },
  { id: 'mystery', label: '悬疑', emoji: '🔮' },
  { id: 'fantasy', label: '奇幻', emoji: '🌙' },
  { id: 'scifi', label: '科幻', emoji: '🚀' },
]

// 主题 emoji 映射
const THEME_EMOJI: Record<string, string> = {
  adventure: '⚔️',
  romance: '💫',
  nightmare: '🌑',
  mystery: '🔮',
  fantasy: '🌙',
  scifi: '🚀',
}

interface Collection {
  id: string
  title: string
  theme: string
  emoji: string
  storyCount: number
  isNew?: boolean
  coverGradient?: string
}

interface ReadingProgress {
  collectionId: string
  title: string
  emoji: string
  currentEpisode: number
  totalEpisodes: number
  percent: number
}

export function Library() {
  const navigate = useNavigate()
  const [activeTheme, setActiveTheme] = useState('all')
  const [loading, setLoading] = useState(true)
  const [collections, setCollections] = useState<Collection[]>([])
  const [readingProgress] = useState<ReadingProgress | null>(null)

  useEffect(() => {
    async function fetchCollections() {
      setLoading(true)
      try {
        const response = await libraryApi.getCollections({
          theme: activeTheme === 'all' ? undefined : activeTheme,
          limit: 50
        })
        if (response.success && response.data) {
          // 映射 API 数据到组件格式
          const mappedCollections: Collection[] = response.data.collections.map((c: LibraryCollection) => ({
            id: c.id,
            title: c.title,
            theme: c.theme || 'mystery',
            emoji: THEME_EMOJI[c.theme || 'mystery'] || '✨',
            storyCount: c.storyCount,
            isNew: isNewCollection(c.createdAt),
          }))
          setCollections(mappedCollections)
        }
      } catch (error) {
        console.error('获取合集列表失败:', error)
        setCollections([])
        showToast('加载失败，请检查网络连接', 'error')
      } finally {
        setLoading(false)
      }
    }
    fetchCollections()
  }, [activeTheme])

  // 判断是否为新合集（7天内创建）
  function isNewCollection(createdAt: string): boolean {
    const created = new Date(createdAt)
    const now = new Date()
    const diffDays = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
    return diffDays <= 7
  }

  const filteredCollections = activeTheme === 'all'
    ? collections
    : collections.filter(c => c.theme === activeTheme)

  const handleContinueReading = () => {
    navigate(`/collection/${readingProgress?.collectionId}`)
  }

  const handleCollectionClick = (collection: Collection) => {
    navigate(`/collection/${collection.id}`)
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Header */}
        <header className={styles.header}>
          <span className={styles.headerIcon}>📚</span>
          <h1 className={styles.headerTitle}>梦境图书馆</h1>
          <p className={styles.headerSubtitle}>珍藏每一段奇幻旅程</p>
        </header>

        {/* Category Filters */}
        <div className={styles.filterScroll}>
          <div className={styles.filterTrack}>
            {THEMES.map(theme => (
              <button
                key={theme.id}
                className={`${styles.filterBtn} ${activeTheme === theme.id ? styles.active : ''}`}
                onClick={() => setActiveTheme(theme.id)}
                aria-label={`筛选${theme.label}主题`}
                aria-pressed={activeTheme === theme.id}
              >
                <span>{theme.emoji}</span>
                <span>{theme.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Continue Reading */}
        {readingProgress && (
          <section className={styles.continueSection}>
            <h2 className={styles.sectionTitle}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              继续阅读
            </h2>
            <div className={styles.continueCard} onClick={handleContinueReading}>
              <div className={styles.continueThumb}>
                <span>{readingProgress.emoji}</span>
              </div>
              <div className={styles.continueInfo}>
                <span className={styles.continueMeta}>{readingProgress.currentEpisode} / {readingProgress.totalEpisodes} 章</span>
                <h3 className={styles.continueTitle}>{readingProgress.title}</h3>
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{ width: `${readingProgress.percent}%` }}
                  />
                </div>
                <span className={styles.progressText}>阅读至第 {readingProgress.currentEpisode} 章</span>
              </div>
            </div>
          </section>
        )}

        {/* Collection Grid */}
        {loading ? (
          <div className={styles.skeleton} role="status" aria-live="polite" aria-label="正在加载">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className={styles.skeletonCard} />
            ))}
          </div>
        ) : filteredCollections.length === 0 ? (
          <EmptyState
            icon="document"
            title="暂无相关合集"
            description="稍后再来看看有什么新内容吧"
          />
        ) : (
          <div className={styles.grid}>
            {filteredCollections.map(collection => (
              <div
                key={collection.id}
                className={styles.card}
                onClick={() => handleCollectionClick(collection)}
              >
                <div className={styles.cardCover}>
                  <div className={styles.cardCoverInner}>
                    <span className={styles.cardEmoji}>{collection.emoji}</span>
                    <h3 className={styles.cardTitle}>{collection.title}</h3>
                    <span className={styles.cardTheme}>
                      {THEMES.find(t => t.id === collection.theme)?.label || collection.theme}
                    </span>
                  </div>
                  <div className={styles.cardGlow} />
                </div>
                {collection.isNew && (
                  <span className={styles.cardNewBadge}>新增</span>
                )}
                <div className={styles.cardInfo}>
                  <div className={styles.cardStats}>
                    <span className={styles.cardStat}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      {collection.storyCount} 篇
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
