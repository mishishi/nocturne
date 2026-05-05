import { useState, useEffect } from 'react'
import { adminApi, AdminComment } from '../../services/api'
import { Toast } from '../../components/ui/Toast'
import styles from './Admin.module.css'

// SVG Icons
const EmptyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
    <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
)

export function CommentManagement() {
  const [loading, setLoading] = useState(true)
  const [toastVisible, setToastVisible] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success')

  const [comments, setComments] = useState<AdminComment[]>([])
  const [commentsPage, setCommentsPage] = useState(1)
  const [commentsHasMore, setCommentsHasMore] = useState(true)

  useEffect(() => {
    loadComments(1, true)
  }, [])

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage(message)
    setToastType(type)
    setToastVisible(true)
  }

  const loadComments = async (page: number, reset = false) => {
    if (page === 1) setLoading(true)
    try {
      const result = await adminApi.getComments({ page, limit: 50 })
      if (result.success) {
        if (reset) {
          setComments(result.data.comments)
        } else {
          setComments(prev => [...prev, ...result.data.comments])
        }
        setCommentsHasMore(result.data.pagination.hasMore)
        setCommentsPage(page)
      }
    } catch (err) {
      console.error('Failed to load comments:', err)
      showToast('加载失败', 'error')
    } finally {
      if (page === 1) setLoading(false)
    }
  }

  const handleDeleteComment = async (comment: AdminComment) => {
    if (!confirm(`确定删除该评论？\n\n"${comment.content.slice(0, 50)}..."`)) return

    try {
      const result = await adminApi.deleteComment(comment.id)
      if (result.success) {
        showToast('已删除评论', 'success')
        setComments(prev => prev.filter(c => c.id !== comment.id))
      }
    } catch (err) {
      console.error('Failed to delete comment:', err)
      showToast('操作失败', 'error')
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className={styles.list}>
      {loading ? (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span>加载中...</span>
        </div>
      ) : comments.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>
            <EmptyIcon />
          </div>
          <p className={styles.emptyText}>暂无评论</p>
        </div>
      ) : (
        comments.map(comment => (
          <div key={comment.id} className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardMeta}>
                <span className={styles.nickname}>{comment.nickname}</span>
                <span className={styles.date}>{formatDate(comment.createdAt)}</span>
              </div>
              <span className={styles.relatedPost}>帖子: {comment.wallTitle}</span>
            </div>
            <p className={styles.cardSnippet}>{comment.content}</p>
            <div className={styles.cardActions}>
              <button
                className={styles.deleteBtn}
                onClick={() => handleDeleteComment(comment)}
              >
                删除
              </button>
            </div>
          </div>
        ))
      )}
      {commentsHasMore && !loading && (
        <button
          className={styles.loadMore}
          onClick={() => loadComments(commentsPage + 1, false)}
        >
          加载更多
        </button>
      )}

      <Toast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onClose={() => setToastVisible(false)}
      />
    </div>
  )
}
