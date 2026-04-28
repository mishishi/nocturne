import { useState, useEffect, useCallback } from 'react'
import { wallApi } from '../services/api'
import { useDreamStore } from '../hooks/useDreamStore'
import { Button } from './ui/Button'
import { Toast } from './ui/Toast'
import styles from './CommentThread.module.css'

interface CommentThreadProps {
  postId: string
  wallOwnerOpenid: string
}

interface Comment {
  id: string
  content: string
  isAnonymous: boolean
  nickname: string | null
  avatar: string | null
  isAuthor: boolean
  createdAt: string
  parentId: string | null
  replies: Comment[]
}

export function CommentThread({ postId, wallOwnerOpenid }: CommentThreadProps) {
  const { user } = useDreamStore()
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' })

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ visible: true, message, type })
  }, [])

  const loadComments = useCallback(async () => {
    try {
      const res = await wallApi.getComments(postId)
      if (res.success) {
        setComments(res.comments)
      }
    } catch (err) {
      console.error('Failed to load comments:', err)
    } finally {
      setLoading(false)
    }
  }, [postId])

  useEffect(() => {
    loadComments()
  }, [loadComments])

  // Format relative time
  const formatRelativeTime = (dateStr: string): string => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSecs = Math.floor(diffMs / 1000)
    const diffMins = Math.floor(diffSecs / 60)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffSecs < 60) return '刚刚'
    if (diffMins < 60) return `${diffMins}分钟前`
    if (diffHours < 24) return `${diffHours}小时前`
    if (diffDays < 30) return `${diffDays}天前`
    return date.toLocaleDateString('zh-CN')
  }

  const handleReply = (commentId: string) => {
    setReplyingTo(commentId)
    setReplyContent('')
  }

  const cancelReply = () => {
    setReplyingTo(null)
    setReplyContent('')
  }

  const submitReply = async (parentId: string) => {
    if (!replyContent.trim()) {
      showToast('请输入回复内容', 'error')
      return
    }
    if (!user?.openid) {
      showToast('请先登录后再回复', 'error')
      return
    }

    setSubmitting(true)
    try {
      const res = await wallApi.postComment(postId, {
        openid: user.openid,
        content: replyContent.trim(),
        parentId
      })
      if (res.success) {
        setReplyContent('')
        setReplyingTo(null)
        showToast('回复成功')
        await loadComments()
      }
    } catch (err) {
      console.error('Failed to post reply:', err)
      showToast('回复失败，请稍后重试', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // Sort comments by createdAt descending (newest first)
  const sortedComments = [...comments].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  // Get top-level comments (parentId === null)
  const topLevelComments = sortedComments.filter(c => c.parentId === null)

  // Render a single comment
  const renderComment = (comment: Comment, isReply = false) => {
    const isOwner = comment.isAuthor || (wallOwnerOpenid && comment.nickname?.includes('作者'))
    const displayNickname = comment.isAnonymous ? '匿名用户' : (comment.nickname || '未知用户')
    const isReplyingToThis = replyingTo === comment.id

    return (
      <div key={comment.id} className={`${styles.commentItem} ${isReply ? styles.replyItem : ''}`}>
        <div className={styles.commentHeader}>
          <div className={styles.avatar}>
            {comment.avatar ? (
              <img src={comment.avatar} alt="" />
            ) : (
              <div className={styles.avatarPlaceholder}>
                {displayNickname.charAt(0)}
              </div>
            )}
          </div>
          <div className={styles.commentMain}>
            <div className={styles.commentMeta}>
              <span className={styles.nickname}>{displayNickname}</span>
              {isOwner && <span className={styles.authorBadge}>作者</span>}
            </div>
            <p className={styles.commentContent}>{comment.content}</p>
            <div className={styles.commentFooter}>
              <span className={styles.time}>{formatRelativeTime(comment.createdAt)}</span>
              {!isReply && (
                <button
                  className={styles.replyBtn}
                  onClick={() => handleReply(comment.id)}
                >
                  回复
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Reply input */}
        {isReplyingToThis && (
          <div className={styles.replyInputContainer}>
            <textarea
              className={styles.replyInput}
              placeholder={`回复 ${displayNickname}...`}
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              rows={2}
            />
            <div className={styles.replyActions}>
              <Button size="sm" variant="ghost" onClick={cancelReply}>
                取消
              </Button>
              <Button
                size="sm"
                variant="primary"
                loading={submitting}
                onClick={() => submitReply(comment.id)}
              >
                发送
              </Button>
            </div>
          </div>
        )}

        {/* Render replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className={styles.repliesContainer}>
            {comment.replies.map((reply) => renderComment(reply, true))}
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <span>加载中...</span>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.commentsList}>
        {topLevelComments.length === 0 ? (
          <div className={styles.empty}>
            <span>暂无评论，来抢沙发吧~</span>
          </div>
        ) : (
          topLevelComments.map((comment) => renderComment(comment))
        )}
      </div>

      <Toast
        message={toast.message}
        visible={toast.visible}
        type={toast.type}
        onClose={() => setToast(prev => ({ ...prev, visible: false }))}
      />
    </div>
  )
}
