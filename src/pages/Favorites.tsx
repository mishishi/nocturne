import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDreamStore, DreamSession, DREAM_TAGS } from '../hooks/useDreamStore'
import { Button } from '../components/ui/Button'
import { Breadcrumb } from '../components/Breadcrumb'
import styles from './Favorites.module.css'

export function Favorites() {
  const navigate = useNavigate()
  const { history, toggleFavorite } = useDreamStore()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchUpdating, setSearchUpdating] = useState(false)

  // Filter to only favorites
  const favoriteItems = history.filter(item => item.isFavorite === true)

  // Further filter by search query
  const filteredFavorites = favoriteItems.filter(item => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      return (
        item.storyTitle.toLowerCase().includes(query) ||
        item.story.toLowerCase().includes(query) ||
        (item.dreamSnippet && item.dreamSnippet.toLowerCase().includes(query))
      )
    }
    return true
  })

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return '今天'
    } else if (diffDays === 1) {
      return '昨天'
    } else if (diffDays < 7) {
      return `${diffDays} 天前`
    } else {
      return date.toLocaleDateString('zh-CN', {
        month: 'long',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      })
    }
  }

  const handleToggleFavorite = (id: string) => {
    toggleFavorite(id)
  }

  const handleReadStory = (item: DreamSession) => {
    navigate(`/story/${item.sessionId}`, { state: { fromHistory: item } })
  }

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  return (
    <div className={styles.page}>
      {/* Decorative stars */}
      <div className={styles.decorStars}>
        <svg width="100%" height="100%">
          <defs>
            <pattern id="stars" patternUnits="userSpaceOnUse" width="100" height="100">
              <circle cx="10" cy="10" r="0.5" fill="currentColor" opacity="0.3" />
              <circle cx="50" cy="30" r="0.8" fill="currentColor" opacity="0.5" />
              <circle cx="80" cy="60" r="0.5" fill="currentColor" opacity="0.4" />
              <circle cx="30" cy="70" r="0.6" fill="currentColor" opacity="0.3" />
              <circle cx="70" cy="90" r="0.7" fill="currentColor" opacity="0.4" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#stars)" />
        </svg>
      </div>

      <div className={styles.container}>
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { label: '首页', href: '/' },
            { label: '收藏' }
          ]}
        />

        {/* Header */}
        <header className={styles.header}>
          <span className={styles.badge}>我的收藏</span>
          <h1 className={styles.title}>收藏夹</h1>
          <p className={styles.subtitle}>
            {favoriteItems.length > 0
              ? `共 ${favoriteItems.length} 个收藏`
              : '收藏你喜欢的梦境故事'}
          </p>
        </header>

        {/* Search */}
        {favoriteItems.length > 0 && (
          <div className={styles.searchWrapper}>
            <svg className={styles.searchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="search"
              id="search-favorites"
              className={`${styles.searchInput} ${searchUpdating ? styles.updating : ''}`}
              placeholder="搜索收藏..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setSearchUpdating(true)
                setTimeout(() => setSearchUpdating(false), 300)
              }}
              aria-label="搜索收藏"
            />
            {searchQuery && (
              <button className={styles.searchClear} onClick={() => setSearchQuery('')} aria-label="清除搜索">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Search Results Info */}
        {searchQuery && filteredFavorites.length === 0 && (
          <div className={styles.noResults}>
            <p>没有找到匹配的收藏</p>
          </div>
        )}

        {/* Favorites List or Empty State */}
        {favoriteItems.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Background stars */}
                <circle cx="20" cy="25" r="1.5" fill="currentColor" opacity="0.3" />
                <circle cx="95" cy="20" r="1" fill="currentColor" opacity="0.4" />
                <circle cx="100" cy="80" r="1.5" fill="currentColor" opacity="0.3" />
                <circle cx="15" cy="90" r="1" fill="currentColor" opacity="0.4" />
                <circle cx="50" cy="10" r="1" fill="currentColor" opacity="0.3" />
                <circle cx="75" cy="105" r="1.5" fill="currentColor" opacity="0.3" />
                {/* Star glow */}
                <circle cx="60" cy="55" r="30" fill="url(#starGlow)" opacity="0.15" />
                {/* Star shape */}
                <path d="M60 25L66.18 43.82L86 43.82L70.09 55.64L76.27 74.36L60 62.73L43.73 74.36L49.91 55.64L34 43.82L53.82 43.82L60 25Z" fill="currentColor" opacity="0.8" />
                {/* Sparkles */}
                <path d="M30 35L32 40L37 42L32 44L30 49L28 44L23 42L28 40L30 35Z" fill="currentColor" opacity="0.3" />
                <path d="M85 70L86.5 73L89.5 74.5L86.5 76L85 79L83.5 76L80.5 74.5L83.5 73L85 70Z" fill="currentColor" opacity="0.3" />
                <defs>
                  <radialGradient id="starGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="currentColor" />
                    <stop offset="100%" stopColor="transparent" />
                  </radialGradient>
                </defs>
              </svg>
            </div>
            <h2 className={styles.emptyTitle}>还没有收藏</h2>
            <p className={styles.emptyText}>还没有收藏，去看看别人的梦吧</p>
            <Link to="/wall">
              <Button size="lg">探索梦墙</Button>
            </Link>
          </div>
        ) : (
          <div className={styles.favoritesList}>
            {filteredFavorites.map((item, index) => {
              const isExpanded = expandedId === item.id
              return (
                <article
                  key={item.id || index}
                  className={`${styles.favoriteItem} ${isExpanded ? styles.expanded : ''}`}
                >
                  <div className={styles.itemHeader}>
                    <div className={styles.itemMeta}>
                      <span className={styles.itemDate}>{formatDate(item.date)}</span>
                      <h3 className={styles.itemTitle}>{item.storyTitle}</h3>
                      {item.tags && item.tags.length > 0 && (
                        <div className={styles.itemTags}>
                          {item.tags.map(tagId => {
                            const tag = DREAM_TAGS.find(t => t.id === tagId)
                            return tag ? (
                              <span
                                key={tagId}
                                className={styles.itemTag}
                                style={{ '--tag-color': tag.color } as React.CSSProperties}
                              >
                                {tag.icon} {tag.label}
                              </span>
                            ) : null
                          })}
                        </div>
                      )}
                    </div>
                    <div className={styles.itemActions}>
                      <button
                        className={`${styles.actionBtn} ${styles.favoriteActive}`}
                        onClick={() => handleToggleFavorite(item.id!)}
                        aria-label="取消收藏"
                        title="取消收藏"
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Preview */}
                  <p className={styles.itemPreview}>{item.story.replace(/\n/g, ' ').slice(0, 150)}...</p>

                  {/* Expand button */}
                  <button
                    className={styles.expandBtn}
                    onClick={() => toggleExpand(item.id!)}
                    aria-expanded={isExpanded}
                    aria-label={isExpanded ? '收起全文' : '展开全文'}
                  >
                    <span>{isExpanded ? '收起' : '展开全文'}</span>
                    <svg
                      className={`${styles.expandIcon} ${isExpanded ? styles.expanded : ''}`}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className={styles.expandedContent}>
                      <div className={styles.storyContent}>
                        {item.story.split('\n').map((paragraph, idx) => (
                          paragraph.trim() && <p key={idx}>{paragraph}</p>
                        ))}
                      </div>

                      <div className={styles.expandedActions}>
                        <Button variant="secondary" size="sm" onClick={() => handleReadStory(item)}>
                          在故事页查看
                        </Button>
                      </div>
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
