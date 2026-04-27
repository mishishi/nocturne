import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { wallApi, DreamWallPost } from '../services/api'
import { useDreamStore } from '../hooks/useDreamStore'
import { Button } from '../components/ui/Button'
import { Toast } from '../components/ui/Toast'
import { Breadcrumb } from '../components/Breadcrumb'
import styles from './DreamWall.module.css'

type TabType = 'all' | 'featured' | 'my'

export function DreamWall() {
  const navigate = useNavigate()
  const { user } = useDreamStore()
  const [activeTab, setActiveTab] = useState<TabType>('all')
  const [posts, setPosts] = useState<DreamWallPost[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [toastVisible, setToastVisible] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success')
  const [likingId, setLikingId] = useState<string | null>(null)

  const loadPosts = useCallback(async (tab: TabType, pageNum: number, reset = false) => {
    if (pageNum === 1) setLoading(true)
    else setLoadingMore(true)

    try {
      const result = await wallApi.getPosts({
        tab: tab === 'my' ? 'all' : tab,
        page: pageNum,
        limit: 20
      })

      // Defensive check for response structure
      if (!result) {
        console.warn('Empty response from wall API')
        setPosts([])
        setHasMore(false)
        return
      }

      const posts = result.posts || []
      if (reset) {
        setPosts(posts)
      } else {
        setPosts(prev => [...prev, ...posts])
      }
      setHasMore(result.pagination?.hasMore ?? false)
    } catch (err) {
      console.error('Failed to load posts:', err)
      setPosts([])
      setHasMore(false)
      setToastType('error')
      setToastMessage('加载失败，请重试')
      setToastVisible(true)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  // Load posts when tab changes
  useEffect(() => {
    setPage(1)
    if (activeTab === 'my') {
      // Load my posts
      if (user?.openid) {
        loadMyPosts(user.openid)
      }
    } else {
      loadPosts(activeTab, 1, true)
    }
  }, [activeTab, user?.openid, loadPosts])

  const loadMyPosts = async (openid: string) => {
    setLoading(true)
    try {
      const result = await wallApi.getMyPosts(openid)
      if (result.success) {
        // Transform my posts to match DreamWallPost format
        const transformed: DreamWallPost[] = result.posts.map(p => ({
          id: p.id,
          sessionId: '',
          storyTitle: p.storyTitle,
          storySnippet: p.storySnippet,
          isAnonymous: p.isAnonymous,
          nickname: p.isAnonymous ? '匿名用户' : user?.nickname,
          avatar: p.isAnonymous ? undefined : user?.avatar,
          likeCount: p.likeCount,
          commentCount: p.commentCount,
          isFeatured: p.isFeatured,
          hasLiked: false,
          createdAt: p.createdAt
        }))
        setPosts(transformed)
        setHasMore(false)
      }
    } catch (err) {
      console.error('Failed to load my posts:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab)
  }

  const handleLike = async (postId: string) => {
    if (!user?.openid) {
      setToastType('info')
      setToastMessage('请先登录')
      setToastVisible(true)
      return
    }

    if (likingId) return
    setLikingId(postId)

    try {
      const result = await wallApi.toggleLike(postId, user.openid)
      if (result.success) {
        setPosts(prev => prev.map(post => {
          if (post.id === postId) {
            return {
              ...post,
              likeCount: result.liked ? post.likeCount + 1 : post.likeCount - 1,
              hasLiked: result.liked
            }
          }
          return post
        }))
      }
    } catch (err) {
      console.error('Failed to toggle like:', err)
    } finally {
      setLikingId(null)
    }
  }

  const handleLoadMore = () => {
    if (loadingMore || !hasMore) return
    const nextPage = page + 1
    setPage(nextPage)
    loadPosts(activeTab, nextPage)
  }

  const handlePostClick = (post: DreamWallPost) => {
    navigate('/story', {
      state: {
        fromHistory: {
          id: post.sessionId,
          storyTitle: post.storyTitle,
          story: post.storySnippet,
          dreamSnippet: ''
        }
      }
    })
  }

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
        month: 'short',
        day: 'numeric'
      })
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { label: '首页', href: '/' },
            { label: '梦墙' }
          ]}
        />

        {/* Header */}
        <header className={styles.header}>
          <div className={styles.moonIcon}>
            <svg viewBox="0 0 60 60" fill="none">
              <circle cx="30" cy="30" r="25" fill="url(#wallMoonGrad)" />
              <circle cx="22" cy="22" r="4" fill="rgba(255,255,255,0.3)" />
              <circle cx="35" cy="28" r="3" fill="rgba(255,255,255,0.2)" />
              <circle cx="25" cy="35" r="3.5" fill="rgba(255,255,255,0.25)" />
              <defs>
                <radialGradient id="wallMoonGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#FFD666" />
                  <stop offset="100%" stopColor="#F4D35E" />
                </radialGradient>
              </defs>
            </svg>
          </div>
          <h1 className={styles.title}>梦墙</h1>
          <p className={styles.subtitle}>看看大家都在做什么梦</p>
        </header>

        {/* Tabs */}
        <div className={styles.tabs} role="tablist">
          <button
            className={`${styles.tab} ${activeTab === 'all' ? styles.active : ''}`}
            onClick={() => handleTabChange('all')}
            role="tab"
            aria-selected={activeTab === 'all'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2a7 7 0 0 1 0 14 7 7 0 0 1 0-14" />
            </svg>
            全部
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'featured' ? styles.active : ''}`}
            onClick={() => handleTabChange('featured')}
            role="tab"
            aria-selected={activeTab === 'featured'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            本周精选
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'my' ? styles.active : ''}`}
            onClick={() => handleTabChange('my')}
            role="tab"
            aria-selected={activeTab === 'my'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            我的发布
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {loading ? (
            <div className={styles.loading}>
              <div className={styles.loadingMoon}>
                <svg viewBox="0 0 60 60" fill="none">
                  <circle cx="30" cy="30" r="25" fill="url(#loadingMoonGrad)" />
                  <defs>
                    <radialGradient id="loadingMoonGrad" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#FFD666" />
                      <stop offset="100%" stopColor="#F4D35E" />
                    </radialGradient>
                  </defs>
                </svg>
              </div>
              <p>梦境加载中...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>
                <svg viewBox="0 0 120 120" fill="none">
                  <circle cx="60" cy="60" r="40" fill="url(#emptyMoonGrad)" opacity="0.3" />
                  <path d="M60 25C42 25 30 40 30 60C30 80 42 95 60 95C48 95 40 80 40 60C40 40 48 25 60 25Z" fill="currentColor" opacity="0.6" />
                  <defs>
                    <radialGradient id="emptyMoonGrad" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="currentColor" />
                      <stop offset="100%" stopColor="transparent" />
                    </radialGradient>
                  </defs>
                </svg>
              </div>
              <h2 className={styles.emptyTitle}>
                {activeTab === 'my' ? '还没有发布' : '暂无内容'}
              </h2>
              <p className={styles.emptyText}>
                {activeTab === 'my'
                  ? '记录梦境后可以发布到这里'
                  : '成为第一个分享梦境的人'}
              </p>
              {activeTab === 'my' && (
                <Button onClick={() => navigate('/dream')}>
                  记录梦境
                </Button>
              )}
            </div>
          ) : (
            <div className={styles.postList}>
              {posts.map((post, index) => (
                <article
                  key={post.id}
                  className={styles.postCard}
                  style={{ animationDelay: `${index * 0.05}s` }}
                  onClick={() => handlePostClick(post)}
                >
                  {/* Featured badge */}
                  {post.isFeatured && (
                    <div className={styles.featuredBadge}>
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                      本周精选
                    </div>
                  )}

                  {/* Author */}
                  <div className={styles.postAuthor}>
                    <div className={styles.authorAvatar}>
                      {post.avatar ? (
                        <img src={post.avatar} alt={post.nickname} />
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                      )}
                    </div>
                    <div className={styles.authorInfo}>
                      <span className={styles.authorName}>{post.nickname}</span>
                      <span className={styles.postDate}>{formatDate(post.createdAt)}</span>
                    </div>
                  </div>

                  {/* Title */}
                  <h2 className={styles.postTitle}>{post.storyTitle}</h2>

                  {/* Snippet */}
                  <p className={styles.postSnippet}>{post.storySnippet}</p>

                  {/* Actions */}
                  <div className={styles.postActions} onClick={e => e.stopPropagation()}>
                    <button
                      className={`${styles.actionBtn} ${post.hasLiked ? styles.liked : ''}`}
                      onClick={() => handleLike(post.id)}
                      disabled={likingId === post.id}
                      aria-label={post.hasLiked ? '取消点赞' : '点赞'}
                    >
                      <svg viewBox="0 0 24 24" fill={post.hasLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                      </svg>
                      <span>{post.likeCount}</span>
                    </button>
                    <button className={styles.actionBtn} aria-label="评论">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                      <span>{post.commentCount}</span>
                    </button>
                    <button
                      className={styles.actionBtn}
                      onClick={() => {
                        navigator.clipboard.writeText(`${post.storyTitle}\n\n${post.storySnippet}`)
                        setToastType('success')
                        setToastMessage('内容已复制')
                        setToastVisible(true)
                      }}
                      aria-label="复制"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    </button>
                  </div>
                </article>
              ))}

              {/* Load More */}
              {hasMore && (
                <div className={styles.loadMore}>
                  <Button
                    variant="secondary"
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                  >
                    {loadingMore ? '加载中...' : '加载更多'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <Toast
        message={toastMessage}
        visible={toastVisible}
        onClose={() => setToastVisible(false)}
        type={toastType}
      />
    </div>
  )
}
