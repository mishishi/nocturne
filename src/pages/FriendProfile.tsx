import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { friendApi, authApi, DreamWallPost } from '../services/api'
import { Toast } from '../components/ui/Toast'
import { Breadcrumb } from '../components/Breadcrumb'
import styles from './FriendProfile.module.css'

export function FriendProfile() {
  const { openid } = useParams<{ openid: string }>()
  const navigate = useNavigate()
  const [friend, setFriend] = useState<{ nickname?: string; avatar?: string; isMember: boolean; memberSince?: string } | null>(null)
  const [posts, setPosts] = useState<DreamWallPost[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [toastVisible, setToastVisible] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success')

  const loadFriendPosts = useCallback(async (pageNum: number, reset = false) => {
    if (!openid) return

    try {
      const result = await friendApi.getFriendPosts(openid, pageNum, 20)
      if (result.success) {
        if (reset) {
          setPosts(result.posts)
        } else {
          setPosts(prev => [...prev, ...result.posts])
        }
        setHasMore(result.posts.length === 20)
      }
    } catch (err) {
      console.error('Failed to load friend posts:', err)
      setToastType('error')
      setToastMessage('加载失败，请重试')
      setToastVisible(true)
    } finally {
      setLoading(false)
    }
  }, [openid])

  // Load friend info
  useEffect(() => {
    if (!openid) return

    const loadFriendInfo = async () => {
      try {
        const result = await authApi.getUser(openid)
        if (result.success && result.data?.user) {
          const user = result.data.user
          setFriend({
            nickname: user.nickname,
            avatar: user.avatar,
            isMember: user.isMember,
            memberSince: user.memberSince
          })
        } else {
          console.error('Failed to load friend info:', result)
          setToastType('error')
          setToastMessage('加载好友信息失败')
          setToastVisible(true)
        }
      } catch (err) {
        console.error('Failed to load friend info:', err)
        setToastType('error')
        setToastMessage('加载好友信息失败')
        setToastVisible(true)
      }
    }

    loadFriendInfo()
  }, [openid])

  useEffect(() => {
    if (!openid) {
      navigate('/friends')
      return
    }
    loadFriendPosts(1, true)
  }, [openid])

  const handlePostClick = (post: DreamWallPost) => {
    navigate(`/story/${post.sessionId}`, {
      state: {
        fromDreamWall: true,
        sessionId: post.sessionId,
        storyTitle: post.storyTitle,
        storyFull: post.storyFull || null,
        authorOpenid: post.openid,
        postId: post.id,
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
        <Breadcrumb
          items={[
            { label: '首页', href: '/' },
            { label: '好友', href: '/friends' },
            { label: '好友主页' }
          ]}
        />

        {/* Header */}
        <header className={styles.header}>
          <button className={styles.backButton} onClick={() => navigate('/friends')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <div className={styles.friendProfile}>
            <div className={styles.avatar}>
              {friend?.avatar ? (
                <img src={friend.avatar} alt={friend.nickname} />
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              )}
            </div>
            <div className={styles.friendInfo}>
              <h1 className={styles.nickname}>
                {friend?.nickname || '匿名旅人'}
                {friend?.isMember && <span className={styles.memberBadge}>会员</span>}
              </h1>
              {friend?.memberSince && (
                <span className={styles.memberSince}>
                  加入于 {new Date(friend.memberSince).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' })}
                </span>
              )}
            </div>
          </div>
          <button
            className={styles.messageButton}
            onClick={() => navigate(`/chat?openid=${openid}`)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </button>
        </header>

        {/* Posts Section */}
        <section className={styles.postsSection}>
          <h2 className={styles.sectionTitle}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={styles.sectionIcon}>
              <path d="M12 3v18M3 12h18"/>
            </svg>
            发布的梦境
          </h2>

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
              <h3 className={styles.emptyTitle}>暂无发布</h3>
              <p className={styles.emptyText}>这位好友还没有发布任何梦境</p>
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
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                          <circle cx="12" cy="7" r="4"/>
                        </svg>
                      )}
                    </div>
                    <div className={styles.authorInfo}>
                      <span className={styles.authorName}>{post.nickname}</span>
                      <span className={styles.postDate}>{formatDate(post.createdAt)}</span>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className={styles.postTitle}>{post.storyTitle}</h3>

                  {/* Snippet */}
                  <p className={styles.postSnippet}>{post.storySnippet}</p>

                  {/* Actions */}
                  <div className={styles.postActions}>
                    <div className={styles.actionBtn}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                      </svg>
                      <span>{post.likeCount}</span>
                    </div>
                    <div className={styles.actionBtn}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                      </svg>
                      <span>{post.commentCount}</span>
                    </div>
                  </div>
                </article>
              ))}

              {/* Load more */}
              {hasMore && (
                <button
                  className={styles.loadMore}
                  onClick={() => {
                    const nextPage = page + 1
                    setPage(nextPage)
                    loadFriendPosts(nextPage)
                  }}
                >
                  加载更多
                </button>
              )}

              {!hasMore && posts.length > 0 && (
                <p className={styles.endMessage}>— 已加载全部 —</p>
              )}
            </div>
          )}
        </section>
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
