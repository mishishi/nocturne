import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminApi, AdminStats, PendingPost, AdminComment } from '../services/api'
import { Toast } from '../components/ui/Toast'
import styles from './Admin.module.css'

type TabType = 'pending' | 'comments' | 'stats'

const REJECT_REASONS = [
  '内容违规',
  '与梦境无关',
  '包含敏感信息',
  '其他'
]

export function Admin() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabType>('pending')
  const [loading, setLoading] = useState(true)
  const [toastVisible, setToastVisible] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success')

  // Stats data
  const [stats, setStats] = useState<AdminStats | null>(null)

  // Pending posts
  const [pendingPosts, setPendingPosts] = useState<PendingPost[]>([])
  const [postsPage, setPostsPage] = useState(1)
  const [postsHasMore, setPostsHasMore] = useState(true)

  // Comments
  const [comments, setComments] = useState<AdminComment[]>([])
  const [commentsPage, setCommentsPage] = useState(1)
  const [commentsHasMore, setCommentsHasMore] = useState(true)

  // Reject modal
  const [rejectModalPost, setRejectModalPost] = useState<PendingPost | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [otherReason, setOtherReason] = useState('')

  useEffect(() => {
    loadStats()
  }, [])

  useEffect(() => {
    if (activeTab === 'pending') {
      loadPendingPosts(1, true)
    } else if (activeTab === 'comments') {
      loadComments(1, true)
    }
  }, [activeTab])

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage(message)
    setToastType(type)
    setToastVisible(true)
  }

  const loadStats = async () => {
    try {
      const result = await adminApi.getStats()
      if (result.success) {
        setStats(result.data)
      }
    } catch (err) {
      console.error('Failed to load stats:', err)
    }
  }

  const loadPendingPosts = async (page: number, reset = false) => {
    if (page === 1) setLoading(true)
    try {
      const result = await adminApi.getPendingPosts(page, 20)
      if (result.success) {
        if (reset) {
          setPendingPosts(result.data.posts)
        } else {
          setPendingPosts(prev => [...prev, ...result.data.posts])
        }
        setPostsHasMore(result.data.pagination.hasMore)
        setPostsPage(page)
      }
    } catch (err) {
      console.error('Failed to load pending posts:', err)
      showToast('加载失败', 'error')
    } finally {
      if (page === 1) setLoading(false)
    }
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

  const handleApprove = async (post: PendingPost) => {
    try {
      const result = await adminApi.approvePost(post.id)
      if (result.success) {
        showToast('已通过审核', 'success')
        setPendingPosts(prev => prev.filter(p => p.id !== post.id))
        loadStats()
      }
    } catch (err) {
      console.error('Failed to approve:', err)
      showToast('操作失败', 'error')
    }
  }

  const handleOpenReject = (post: PendingPost) => {
    setRejectModalPost(post)
    setRejectReason('')
    setOtherReason('')
  }

  const handleReject = async () => {
    if (!rejectModalPost) return
    const reason = rejectReason === '其他' ? otherReason : rejectReason
    if (!reason) {
      showToast('请选择或输入拒绝原因', 'error')
      return
    }

    try {
      const result = await adminApi.rejectPost(rejectModalPost.id, reason)
      if (result.success) {
        showToast('已拒绝并通知用户', 'success')
        setPendingPosts(prev => prev.filter(p => p.id !== rejectModalPost.id))
        setRejectModalPost(null)
        loadStats()
      }
    } catch (err) {
      console.error('Failed to reject:', err)
      showToast('操作失败', 'error')
    }
  }

  const handleDeleteComment = async (comment: AdminComment) => {
    if (!confirm(`确定删除该评论？\n\n"${comment.content.slice(0, 50)}..."`)) return

    try {
      const result = await adminApi.deleteComment(comment.id)
      if (result.success) {
        showToast('已删除评论', 'success')
        setComments(prev => prev.filter(c => c.id !== comment.id))
        loadStats()
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
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Header */}
        <header className={styles.header}>
          <button
            className={styles.backButton}
            onClick={() => navigate(-1)}
            aria-label="返回"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className={styles.title}>管理后台</h1>
          <div style={{ width: 60 }} />
        </header>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'pending' ? styles.active : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            待审核
            {stats && stats.pendingPosts > 0 && (
              <span className={styles.badge}>{stats.pendingPosts}</span>
            )}
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'comments' ? styles.active : ''}`}
            onClick={() => setActiveTab('comments')}
          >
            评论管理
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'stats' ? styles.active : ''}`}
            onClick={() => setActiveTab('stats')}
          >
            数据统计
          </button>
        </div>

        {/* Content */}
        {activeTab === 'stats' && (
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{stats?.pendingPosts ?? '-'}</div>
              <div className={styles.statLabel}>待审核帖子</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{stats?.totalPosts ?? '-'}</div>
              <div className={styles.statLabel}>总帖子数</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{stats?.totalComments ?? '-'}</div>
              <div className={styles.statLabel}>总评论数</div>
            </div>
          </div>
        )}

        {activeTab === 'pending' && (
          <div className={styles.list}>
            {loading ? (
              <div className={styles.loading}>
                <div className={styles.spinner} />
                <span>加载中...</span>
              </div>
            ) : pendingPosts.length === 0 ? (
              <div className={styles.empty}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className={styles.emptyIcon}>
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className={styles.emptyText}>暂无待审核内容</p>
              </div>
            ) : (
              pendingPosts.map(post => (
                <div key={post.id} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <div className={styles.cardMeta}>
                      <span className={styles.nickname}>
                        {post.isAnonymous ? '匿名用户' : (post.nickname || '匿名用户')}
                      </span>
                      <span className={styles.date}>{formatDate(post.createdAt)}</span>
                    </div>
                  </div>
                  <h3 className={styles.cardTitle}>{post.storyTitle}</h3>
                  <p className={styles.cardSnippet}>{post.storySnippet}</p>
                  <div className={styles.cardActions}>
                    <button
                      className={styles.approveBtn}
                      onClick={() => handleApprove(post)}
                    >
                      通过
                    </button>
                    <button
                      className={styles.rejectBtn}
                      onClick={() => handleOpenReject(post)}
                    >
                      拒绝
                    </button>
                  </div>
                </div>
              ))
            )}
            {postsHasMore && !loading && (
              <button
                className={styles.loadMore}
                onClick={() => loadPendingPosts(postsPage + 1, false)}
              >
                加载更多
              </button>
            )}
          </div>
        )}

        {activeTab === 'comments' && (
          <div className={styles.list}>
            {loading ? (
              <div className={styles.loading}>
                <div className={styles.spinner} />
                <span>加载中...</span>
              </div>
            ) : comments.length === 0 ? (
              <div className={styles.empty}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className={styles.emptyIcon}>
                  <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
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
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectModalPost && (
        <div className={styles.modalOverlay} onClick={() => setRejectModalPost(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>拒绝原因</h3>
            <p className={styles.modalSubtitle}>帖子: {rejectModalPost.storyTitle}</p>
            <div className={styles.reasonList}>
              {REJECT_REASONS.map(reason => (
                <label key={reason} className={styles.reasonItem}>
                  <input
                    type="radio"
                    name="rejectReason"
                    value={reason}
                    checked={rejectReason === reason}
                    onChange={e => setRejectReason(e.target.value)}
                  />
                  <span>{reason}</span>
                </label>
              ))}
            </div>
            {rejectReason === '其他' && (
              <textarea
                className={styles.otherReason}
                placeholder="请输入拒绝原因..."
                value={otherReason}
                onChange={e => setOtherReason(e.target.value)}
              />
            )}
            <div className={styles.modalActions}>
              <button
                className={styles.cancelBtn}
                onClick={() => setRejectModalPost(null)}
              >
                取消
              </button>
              <button
                className={styles.confirmRejectBtn}
                onClick={handleReject}
              >
                确认拒绝
              </button>
            </div>
          </div>
        </div>
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
