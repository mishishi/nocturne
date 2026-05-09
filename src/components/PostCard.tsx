import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DreamWallPost } from '../services/api'
import { useDreamStore } from '../hooks/useDreamStore'
import { storeDreamWallContext } from '../hooks/useDreamWallContext'
import { FriendRequestButton } from './FriendRequestButton'
import { Toast } from './ui/Toast'
import styles from './PostCard.module.css'

interface PostCardProps {
  post: DreamWallPost
  activeTab: string
  onDelete?: (postId: string) => void
}

export function PostCard({ post, activeTab, onDelete }: PostCardProps) {
  const navigate = useNavigate()
  const { user } = useDreamStore()
  const [likingId, setLikingId] = useState<string | null>(null)
  const [favoritingId, setFavoritingId] = useState<string | null>(null)
  const [toastVisible, setToastVisible] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success')
  const [localLikeCount, setLocalLikeCount] = useState(post.likeCount)
  const [localHasLiked, setLocalHasLiked] = useState(post.hasLiked)
  const [localIsFavorite, setLocalIsFavorite] = useState(post.isFavorite || false)

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

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!user?.openid) {
      setToastType('info')
      setToastMessage('登录后可点赞收藏故事')
      setToastVisible(true)
      setTimeout(() => navigate('/login'), 1500)
      return
    }

    if (likingId) return
    setLikingId(post.id)

    // Optimistic update
    setLocalHasLiked(!localHasLiked)
    setLocalLikeCount(localHasLiked ? localLikeCount - 1 : localLikeCount + 1)

    try {
      const { wallApi } = await import('../services/api')
      const result = await wallApi.toggleLike(post.id, user.openid)
      if (!result.success) {
        setLocalHasLiked(!localHasLiked)
        setLocalLikeCount(localHasLiked ? localLikeCount + 1 : localLikeCount - 1)
        setToastType('error')
        setToastMessage('点赞失败，请重试')
        setToastVisible(true)
      }
    } catch (err) {
      setLocalHasLiked(!localHasLiked)
      setLocalLikeCount(localHasLiked ? localLikeCount + 1 : localLikeCount - 1)
      console.error('Failed to toggle like:', err)
      setToastType('error')
      setToastMessage('点赞失败，请重试')
      setToastVisible(true)
    } finally {
      setLikingId(null)
    }
  }

  const handleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!user?.openid) {
      setToastType('info')
      setToastMessage('登录后可点赞收藏故事')
      setToastVisible(true)
      setTimeout(() => navigate('/login'), 1500)
      return
    }

    if (favoritingId) return
    setFavoritingId(post.id)

    // Optimistic update
    setLocalIsFavorite(!localIsFavorite)

    try {
      const { wallApi } = await import('../services/api')
      const result = await wallApi.toggleFavorite(post.id, user.openid)
      if (!result.success) {
        setLocalIsFavorite(!localIsFavorite)
        setToastType('error')
        setToastMessage('收藏失败，请重试')
        setToastVisible(true)
      }
    } catch (err) {
      setLocalIsFavorite(!localIsFavorite)
      console.error('Failed to toggle favorite:', err)
      setToastType('error')
      setToastMessage('收藏失败，请重试')
      setToastVisible(true)
    } finally {
      setFavoritingId(null)
    }
  }

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(`${post.storyTitle}\n\n${post.storyFull || post.storySnippet}`)
    setToastType('success')
    setToastMessage('内容已复制')
    setToastVisible(true)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete?.(post.id)
  }

  const handlePostClick = () => {
    storeDreamWallContext({
      fromDreamWall: true,
      sessionId: post.sessionId,
      storyTitle: post.storyTitle,
      storyFull: post.storyFull || null,
      authorOpenid: post.openid,
      postId: post.id,
      dreamSnippet: post.storySnippet,
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
        dreamSnippet: post.dreamFragment,
      }
    })
  }

  return (
    <>
      <article
        className={styles.postCard}
        onClick={handlePostClick}
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
              <img src={post.avatar} alt={post.nickname} loading="lazy" />
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
        <div className={styles.postActions}>
          <button
            className={`${styles.actionBtn} ${localHasLiked ? styles.liked : ''}`}
            onClick={handleLike}
            disabled={likingId === post.id}
            aria-label={localHasLiked ? '取消点赞' : '点赞'}
          >
            <svg viewBox="0 0 24 24" fill={localHasLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            <span>{localLikeCount}</span>
          </button>
          <button className={styles.actionBtn} aria-label="评论">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span>{post.commentCount}</span>
          </button>
          <button
            className={styles.actionBtn}
            onClick={handleCopy}
            aria-label="复制"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          </button>
          {user?.openid && (
            <button
              className={`${styles.actionBtn} ${localIsFavorite ? styles.favorited : ''}`}
              onClick={handleFavorite}
              disabled={favoritingId === post.id}
              aria-label={localIsFavorite ? '取消收藏' : '收藏'}
            >
              <svg viewBox="0 0 24 24" fill={localIsFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </button>
          )}
          {user?.openid && post.openid !== user.openid && !post.isFriend && (
            <FriendRequestButton friendOpenid={post.openid} />
          )}
          {user?.openid && post.openid === user.openid && (
            <button
              className={`${styles.actionBtn} ${styles.deleteBtn}`}
              onClick={handleDelete}
              aria-label="删除"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            </button>
          )}
        </div>
      </article>

      <Toast
        message={toastMessage}
        visible={toastVisible}
        onClose={() => setToastVisible(false)}
        type={toastType}
      />
    </>
  )
}
