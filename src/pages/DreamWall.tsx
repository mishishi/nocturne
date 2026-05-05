import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { wallApi, DreamWallPost } from '../services/api'
import { useDreamStore } from '../hooks/useDreamStore'
import { storeDreamWallContext } from '../hooks/useDreamWallContext'
import { Button } from '../components/ui/Button'
import { Toast } from '../components/ui/Toast'
import { Breadcrumb } from '../components/Breadcrumb'
import { FriendRequestButton } from '../components/FriendRequestButton'
import { DreamWallSkeleton } from '../components/ui/Skeleton'
import styles from './DreamWall.module.css'

type TabType = 'all' | 'featured' | 'my' | 'friends'

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
  const [favoritingId, setFavoritingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchHint, setSearchHint] = useState<{
    show: boolean
    message: string
    action?: () => void
  }>({ show: false, message: '' })
  const loadMoreRef = useRef<HTMLDivElement>(null)
  // Use ref to track page value and avoid stale closure in IntersectionObserver
  const pageRef = useRef(page)
  pageRef.current = page

  const loadPosts = useCallback(async (tab: TabType, pageNum: number, reset = false, keyword?: string) => {
    if (pageNum !== 1) {
      setLoadingMore(true)
    }

    try {
      const result = await wallApi.getPosts({
        tab: (tab === 'my' ? 'all' : tab) as 'all' | 'featured',
        page: pageNum,
        limit: 20,
        keyword,
        openid: user?.openid
      })

      // Defensive check for response structure
      if (!result) {
        console.warn('Empty response from wall API')
        setPosts([])
        setHasMore(false)
        return
      }

      const posts = result.data?.posts || []
      if (reset) {
        setPosts(posts)
      } else {
        setPosts(prev => [...prev, ...posts])
      }
      setHasMore(result.data?.pagination?.hasMore ?? false)
    } catch (err) {
      console.error('Failed to load posts:', err)
      setPosts([])
      setHasMore(false)
      setToastType('error')
      setToastMessage('加载失败，请重试')
      setToastVisible(true)
    } finally {
      if (pageNum === 1) {
        setLoading(false)
      }
      setLoadingMore(false)
    }
  }, [])

  const loadMyPosts = useCallback(async (openid: string) => {
    try {
      const result = await wallApi.getMyPosts(openid)
      if (result.success) {
        // Transform my posts to match DreamWallPost format
        const transformed: DreamWallPost[] = (result.data?.posts || []).map(p => ({
          id: p.id,
          sessionId: p.sessionId || '',
          storyTitle: p.storyTitle,
          storySnippet: p.storySnippet,
          storyFull: p.storyFull,
          isAnonymous: p.isAnonymous,
          isOwnStory: p.isOwnStory,
          nickname: p.nickname || user?.nickname,
          avatar: p.isAnonymous ? undefined : user?.avatar,
          openid: openid,
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
  }, [user?.nickname, user?.avatar])

  const loadFriendPosts = useCallback(async (pageNum: number, reset = false) => {
    if (pageNum !== 1) {
      setLoadingMore(true)
    }

    try {
      const result = await wallApi.getFriendFeed({ page: pageNum, limit: 20 })

      if (!result) {
        console.warn('Empty response from wall friends API')
        setPosts([])
        setHasMore(false)
        return
      }

      const newPosts = result.data?.posts || []
      if (reset) {
        setPosts(newPosts)
      } else {
        setPosts(prev => [...prev, ...newPosts])
      }
      setHasMore(result.data?.pagination?.hasMore ?? false)
    } catch (err) {
      console.error('Failed to load friend posts:', err)
      setPosts([])
      setHasMore(false)
      setToastType('error')
      setToastMessage('加载失败，请重试')
      setToastVisible(true)
    } finally {
      if (pageNum === 1) {
        setLoading(false)
      }
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
      } else {
        // Not logged in, no loading needed
        setLoading(false)
      }
    } else if (activeTab === 'friends') {
      // Load friends posts (requires auth)
      if (user?.openid) {
        loadFriendPosts(1, true)
      } else {
        setLoading(false)
      }
    } else {
      loadPosts(activeTab, 1, true, searchKeyword)
    }
  }, [activeTab, user?.openid, loadPosts, loadMyPosts, loadFriendPosts, searchKeyword])

  // Infinite scroll with IntersectionObserver
  useEffect(() => {
    if (!loadMoreRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && activeTab !== 'my') {
          const nextPage = pageRef.current + 1
          setPage(nextPage)
          if (activeTab === 'friends') {
            loadFriendPosts(nextPage, false)
          } else {
            loadPosts(activeTab, nextPage, false, searchKeyword)
          }
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(loadMoreRef.current)
    return () => observer.disconnect()
  }, [hasMore, loadingMore, activeTab, loadPosts, loadFriendPosts, searchKeyword])

  // Debounced search effect
  useEffect(() => {
    setIsSearching(true)
    const timer = setTimeout(() => {
      setSearchKeyword(searchQuery)
      setIsSearching(false)
      // Show hint when searching in weekly tab with no results
      if (activeTab === 'featured' && searchQuery && posts.length === 0) {
        setSearchHint({
          show: true,
          message: '本周精选暂不支持搜索，看看全部内容吧',
          action: () => handleTabChange('all')
        })
      } else {
        setSearchHint({ show: false, message: '' })
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, activeTab, posts.length])

  const handleTabChange = (tab: TabType) => {
    if (tab === activeTab) return // Don't reset if same tab
    setPage(1)
    setActiveTab(tab)
    // Don't clear posts immediately - keep old posts visible until new data arrives
  }

  const handleLike = async (postId: string) => {
    if (!user?.openid) {
      setToastType('info')
      setToastMessage('登录后可点赞收藏故事')
      setToastVisible(true)
      setTimeout(() => navigate('/login'), 1500)
      return
    }

    if (likingId) return
    setLikingId(postId)

    // Optimistic update - immediately update UI
    const previousPosts = posts
    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          likeCount: post.hasLiked ? post.likeCount - 1 : post.likeCount + 1,
          hasLiked: !post.hasLiked
        }
      }
      return post
    }))

    try {
      const result = await wallApi.toggleLike(postId, user.openid)
      if (!result.success) {
        // Revert on failure
        setPosts(previousPosts)
        setToastType('error')
        setToastMessage('点赞失败，请重试')
        setToastVisible(true)
      }
    } catch (err) {
      // Revert on error
      setPosts(previousPosts)
      console.error('Failed to toggle like:', err)
      setToastType('error')
      setToastMessage('点赞失败，请重试')
      setToastVisible(true)
    } finally {
      setLikingId(null)
    }
  }

  const handleFavorite = async (postId: string) => {
    if (!user?.openid) {
      setToastType('info')
      setToastMessage('登录后可点赞收藏故事')
      setToastVisible(true)
      setTimeout(() => navigate('/login'), 1500)
      return
    }

    if (favoritingId) return
    setFavoritingId(postId)

    // Optimistic update - immediately update UI
    const previousPosts = posts
    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          isFavorite: !post.isFavorite
        }
      }
      return post
    }))

    try {
      const result = await wallApi.toggleFavorite(postId, user.openid)
      if (!result.success) {
        // Revert on failure
        setPosts(previousPosts)
        setToastType('error')
        setToastMessage('收藏失败，请重试')
        setToastVisible(true)
      }
    } catch (err) {
      // Revert on error
      setPosts(previousPosts)
      console.error('Failed to toggle favorite:', err)
      setToastType('error')
      setToastMessage('收藏失败，请重试')
      setToastVisible(true)
    } finally {
      setFavoritingId(null)
    }
  }

  const handlePostClick = (post: DreamWallPost) => {
    console.log('[DreamWall] Post clicked:', {
      id: post.id,
      sessionId: post.sessionId,
      storyTitle: post.storyTitle,
      hasStoryFull: !!post.storyFull
    })
    storeDreamWallContext({
      fromDreamWall: true,
      sessionId: post.sessionId,
      storyTitle: post.storyTitle,
      storyFull: post.storyFull || null,
      authorOpenid: post.openid,
      postId: post.id,
    })

    navigate(`/story/${post.sessionId}`, {
      state: {
        fromDreamWall: true,
        sessionId: post.sessionId,
        storyTitle: post.storyTitle,
        storyFull: post.storyFull || null,
        authorOpenid: post.openid,
        postId: post.id,
        isFriend: post.isFriend,
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
              {/* Central crescent moon - the dream */}
              <path d="M35 10c-8 0-15 6-17 14s2 16 10 18c-3-5-2-12 2-16s11-5 17-2c-6-7-14-11-22-10-4-7-3-15 4-20 4-3 9-3 14 1 5-4 12-4 17 1 4 5 5 12 1 17 5 2 9 6 10 12 2 7-1 14-6 19 6 0 11 5 13 11 3 7 0 15-6 19-7 4-16 3-22-3-6 4-14 4-20 0s-8-14-5-21c-6 1-12-1-16-6 5 1 10-1 13-5s3-11 0-16c-5 5-13 6-18 2s-6-11-3-17c4-6 12-8 18-5-2-5-1-11 4-14s11-2 15 2c5-5 13-6 18-2s6 12 3 18c5-2 11-1 15 3s4 11 1 16c6-2 13 0 17 5-4-1-8 1-10 4z" fill="url(#wallMoonGrad)" opacity="0.15"/>
              <path d="M30 8c-10 0-18 7-20 16s3 18 12 20c-4-5-3-12 1-17 4-4 11-5 17-2-5-7-12-10-20-9-4-7-3-15 3-19 4-3 9-3 14 1 5-4 12-4 17 1 4 5 5 12 1 17 5 2 9 6 10 12 2 7-1 14-6 19 6 0 11 5 13 11 3 7 0 15-6 19-7 4-16 3-22-3-6 4-14 4-20 0s-8-14-5-21c-6 1-12-1-16-6 5 1 10-1 13-5s3-11 0-16c-5 5-13 6-18 2s-6-11-3-17c4-6 12-8 18-5-2-5-1-11 4-14s11-2 15 2z" fill="url(#wallMoonGrad)" />
              {/* Dream bubbles floating outward */}
              <circle cx="12" cy="18" r="4" fill="url(#wallBubbleGrad)" opacity="0.8" />
              <circle cx="48" cy="15" r="3" fill="url(#wallBubbleGrad)" opacity="0.7" />
              <circle cx="10" cy="42" r="3.5" fill="url(#wallBubbleGrad)" opacity="0.75" />
              <circle cx="50" cy="40" r="4" fill="url(#wallBubbleGrad)" opacity="0.8" />
              <circle cx="20" cy="52" r="3" fill="url(#wallBubbleGrad)" opacity="0.65" />
              <circle cx="40" cy="50" r="3.5" fill="url(#wallBubbleGrad)" opacity="0.7" />
              {/* Tiny sparkle dots */}
              <circle cx="25" cy="10" r="1.5" fill="#F4D35E" opacity="0.6" />
              <circle cx="8" cy="30" r="1" fill="#F4D35E" opacity="0.5" />
              <circle cx="52" cy="28" r="1.5" fill="#F4D35E" opacity="0.5" />
              <defs>
                <linearGradient id="wallMoonGrad" x1="10" y1="8" x2="50" y2="52">
                  <stop offset="0%" stopColor="#FFD666" />
                  <stop offset="100%" stopColor="#F4D35E" />
                </linearGradient>
                <radialGradient id="wallBubbleGrad" cx="30%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="#7EB8DA" />
                  <stop offset="100%" stopColor="#5A9BC7" />
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
          {user?.openid && (
            <button
              className={`${styles.tab} ${activeTab === 'friends' ? styles.active : ''}`}
              onClick={() => handleTabChange('friends')}
              role="tab"
              aria-selected={activeTab === 'friends'}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              关注的人
            </button>
          )}
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

        {/* Search */}
        {activeTab !== 'my' && activeTab !== 'friends' && (
          <div className={styles.searchWrapper}>
            <svg className={styles.searchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="search"
              id="search-dream-wall"
              className={styles.searchInput}
              placeholder="搜索梦墙故事..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="搜索梦墙故事"
            />
            {searchQuery && (
              <button className={styles.searchClear} onClick={() => setSearchQuery('')} aria-label="清除搜索">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
            {isSearching && <span className={styles.searching}>搜索中...</span>}
          </div>
        )}

        {/* Content */}
        <div className={styles.content}>
          {loading && !(activeTab === 'friends' && !user?.openid) ? (
            <DreamWallSkeleton />
          ) : searchHint.show ? (
            <div className={styles.searchHint}>
              <span>{searchHint.message}</span>
              {searchHint.action && (
                <button onClick={searchHint.action} className={styles.searchHintAction}>
                  切换到全部
                </button>
              )}
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
                {searchQuery ? '没有找到匹配的梦境' : activeTab === 'my' ? '还没有发布' : activeTab === 'friends' && !user?.openid ? '登录后查看' : activeTab === 'friends' ? '关注的人还没有发布故事' : '暂无内容'}
              </h2>
              <p className={styles.emptyText}>
                {searchQuery
                  ? '换个关键词试试吧'
                  : activeTab === 'my'
                  ? '记录梦境后可以发布到这里'
                  : activeTab === 'friends' && !user?.openid
                  ? '登录后可查看关注好友的梦境'
                  : activeTab === 'friends'
                  ? '快去关注一些好友吧'
                  : '成为第一个分享梦境的人'}
              </p>
              {activeTab === 'my' && (
                <Button onClick={() => navigate('/dream')}>
                  记录梦境
                </Button>
              )}
              {activeTab === 'friends' && !user?.openid && (
                <Button onClick={() => navigate('/login')}>
                  登录
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

                  {/* Engagement score for featured posts */}
                  {activeTab === 'featured' && post.engagementScore !== undefined && (
                    <div className={styles.engagementDisplay}>
                      <span className={styles.engagementScore}>热度 {post.engagementScore}</span>
                    </div>
                  )}

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
                        navigator.clipboard.writeText(`${post.storyTitle}\n\n${post.storyFull || post.storySnippet}`)
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
                    {user?.openid && (
                      <button
                        className={`${styles.actionBtn} ${post.isFavorite ? styles.favorited : ''}`}
                        onClick={() => handleFavorite(post.id)}
                        disabled={favoritingId === post.id}
                        aria-label={post.isFavorite ? '取消收藏' : '收藏'}
                      >
                        <svg viewBox="0 0 24 24" fill={post.isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                      </button>
                    )}
                    {user?.openid && post.openid !== user.openid && !post.isFriend && (
                      <FriendRequestButton friendOpenid={post.openid} />
                    )}
                  </div>
                </article>
              ))}

              {/* Infinite scroll sentinel */}
              {hasMore && activeTab !== 'my' && activeTab !== 'friends' && (
                <div
                  ref={loadMoreRef}
                  className={styles.loadMore}
                  aria-hidden="true"
                >
                  {loadingMore && (
                    <div className={styles.loadingDots}>
                      <span />
                      <span />
                      <span />
                    </div>
                  )}
                </div>
              )}

              {/* End of results */}
              {!hasMore && posts.length > 0 && activeTab !== 'my' && activeTab !== 'friends' && (
                <p className={styles.endMessage}>— 已加载全部 —</p>
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
