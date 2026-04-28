import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDreamStore } from '../hooks/useDreamStore'
import { wallApi, DreamWallPost } from '../services/api'
import { Button } from '../components/ui/Button'
import { Breadcrumb } from '../components/Breadcrumb'
import styles from './Favorites.module.css'

export function Favorites() {
  const navigate = useNavigate()
  const { user } = useDreamStore()
  const [posts, setPosts] = useState<DreamWallPost[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [unfavoritingId, setUnfavoritingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const fetchFavorites = useCallback(async (pageNum: number, append = false) => {
    if (!user?.openid) return

    try {
      const result = await wallApi.getFavorites({ page: pageNum, limit: 20 })
      if (append) {
        setPosts(prev => [...prev, ...result.posts])
      } else {
        setPosts(result.posts)
      }
      setHasMore(result.pagination.hasMore)
    } catch (err) {
      console.error('Failed to fetch favorites:', err)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [user?.openid])

  useEffect(() => {
    if (user?.openid) {
      setLoading(true)
      setPage(1)
      fetchFavorites(1)
    }
  }, [user?.openid, fetchFavorites])

  const handleLoadMore = () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    const nextPage = page + 1
    setPage(nextPage)
    fetchFavorites(nextPage, true)
  }

  const handleUnfavorite = async (postId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!user?.openid || unfavoritingId) return

    setUnfavoritingId(postId)

    // Optimistic update
    const previousPosts = [...posts]
    setPosts(posts.filter(p => p.id !== postId))

    try {
      await wallApi.toggleFavorite(postId, user.openid)
    } catch (err) {
      // Revert on error
      setPosts(previousPosts)
      console.error('Failed to unfavorite:', err)
    } finally {
      setUnfavoritingId(null)
    }
  }

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  const filteredPosts = searchQuery.trim()
    ? posts.filter(post =>
        post.storyTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.storySnippet.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : posts

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

  if (!user?.openid) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <Breadcrumb items={[{ label: '首页', href: '/' }, { label: '收藏' }]} />
          <div className={styles.emptyState}>
            <h2 className={styles.emptyTitle}>请先登录</h2>
            <p className={styles.emptyText}>登录后查看你收藏的梦境故事</p>
            <Link to="/wall"><Button size="lg">探索梦墙</Button></Link>
          </div>
        </div>
      </div>
    )
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
          <h1 className={styles.title}>收藏列表</h1>
          <p className={styles.subtitle}>
            {posts.length > 0
              ? `共 ${posts.length} 个收藏`
              : '收藏你喜欢的梦境故事'}
          </p>
        </header>

        {/* Loading */}
        {loading ? (
          <div className={styles.loading}>
            <div className={styles.loadingMoon}>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z"/>
              </svg>
            </div>
            <p>加载中...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="20" cy="25" r="1.5" fill="currentColor" opacity="0.3" />
                <circle cx="95" cy="20" r="1" fill="currentColor" opacity="0.4" />
                <circle cx="100" cy="80" r="1.5" fill="currentColor" opacity="0.3" />
                <circle cx="15" cy="90" r="1" fill="currentColor" opacity="0.4" />
                <circle cx="50" cy="10" r="1" fill="currentColor" opacity="0.3" />
                <circle cx="75" cy="105" r="1.5" fill="currentColor" opacity="0.3" />
                <circle cx="60" cy="55" r="30" fill="url(#starGlow)" opacity="0.15" />
                <path d="M60 25L66.18 43.82L86 43.82L70.09 55.64L76.27 74.36L60 62.73L43.73 74.36L49.91 55.64L34 43.82L53.82 43.82L60 25Z" fill="currentColor" opacity="0.8" />
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
            <p className={styles.emptyText}>去梦墙收藏你喜欢的故事吧</p>
            <Link to="/wall"><Button size="lg">探索梦墙</Button></Link>
          </div>
        ) : (
          <>
            {/* Search */}
            {posts.length > 0 && (
              <div className={styles.searchWrapper}>
                <svg className={styles.searchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="search"
                  id="search-favorites"
                  className={styles.searchInput}
                  placeholder="搜索收藏..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
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
            {searchQuery && filteredPosts.length === 0 && (
              <div className={styles.noResults}>
                <p>没有找到匹配的内容</p>
              </div>
            )}

            {/* List */}
            <div className={styles.favoritesList}>
              {filteredPosts.map((post) => {
                const isExpanded = expandedId === post.id
                const isUnfavoriting = unfavoritingId === post.id
                return (
                  <article
                    key={post.id}
                    className={`${styles.favoriteItem} ${isExpanded ? styles.expanded : ''}`}
                  >
                    <div className={styles.itemHeader}>
                      <div className={styles.itemMeta}>
                        <span className={styles.itemDate}>{formatDate(post.createdAt)}</span>
                        <h3 className={styles.itemTitle}>{post.storyTitle}</h3>
                      </div>
                      <div className={styles.itemActions}>
                        <button
                          className={`${styles.actionBtn} ${styles.favoriteActive}`}
                          onClick={(e) => handleUnfavorite(post.id, e)}
                          disabled={isUnfavoriting}
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
                    <p className={styles.itemPreview}>
                      {post.storySnippet || post.storyFull?.replace(/\n/g, ' ').slice(0, 150) || ''}...
                    </p>

                    {/* Expand button */}
                    <button
                      className={styles.expandBtn}
                      onClick={() => toggleExpand(post.id)}
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
                    {isExpanded && post.storyFull && (
                      <div className={styles.expandedContent}>
                        <div className={styles.storyContent}>
                          {post.storyFull.split('\n').map((paragraph, idx) => (
                            paragraph.trim() && <p key={idx}>{paragraph}</p>
                          ))}
                        </div>
                        <div className={styles.expandedActions}>
                          <Button variant="secondary" size="sm" onClick={() => navigate(`/story/${post.sessionId}`, { state: { sessionId: post.sessionId } })}>
                            在故事页查看
                          </Button>
                        </div>
                      </div>
                    )}
                  </article>
                )
              })}
            </div>

            {/* Load More */}
            {hasMore && !searchQuery && (
              <div className={styles.loadMore}>
                <button
                  className={styles.loadMoreBtn}
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? '加载中...' : '加载更多'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
