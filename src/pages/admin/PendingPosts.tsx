import { useState, useEffect } from 'react'
import { adminApi, PendingPost } from '../../services/api'
import { Toast } from '../../components/ui/Toast'
import styles from './Admin.module.css'

// SVG Icons
const EmptyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const REJECT_REASONS = [
  '内容违规',
  '与梦境无关',
  '包含敏感信息',
  '其他'
]

export function PendingPosts() {
  const [loading, setLoading] = useState(true)
  const [toastVisible, setToastVisible] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success')

  const [pendingPosts, setPendingPosts] = useState<PendingPost[]>([])
  const [postsPage, setPostsPage] = useState(1)
  const [postsHasMore, setPostsHasMore] = useState(true)
  const [selectedPosts, setSelectedPosts] = useState<Set<string>>(new Set())
  const [batchLoading, setBatchLoading] = useState(false)

  const [rejectModalPost, setRejectModalPost] = useState<PendingPost | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [otherReason, setOtherReason] = useState('')

  useEffect(() => {
    loadPendingPosts(1, true)
  }, [])

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage(message)
    setToastType(type)
    setToastVisible(true)
  }

  const loadPendingPosts = async (page: number, reset = false) => {
    if (page === 1) setLoading(true)
    try {
      const result = await adminApi.getPendingPosts(page, 20)
      if (result.success) {
        if (reset) {
          setPendingPosts(result.data.posts)
          setSelectedPosts(new Set())
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

  const handleApprove = async (post: PendingPost) => {
    try {
      const result = await adminApi.approvePost(post.id)
      if (result.success) {
        showToast('已通过审核', 'success')
        setPendingPosts(prev => prev.filter(p => p.id !== post.id))
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
      }
    } catch (err) {
      console.error('Failed to reject:', err)
      showToast('操作失败', 'error')
    }
  }

  const handleSelectPost = (postId: string) => {
    setSelectedPosts(prev => {
      const next = new Set(prev)
      if (next.has(postId)) {
        next.delete(postId)
      } else {
        next.add(postId)
      }
      return next
    })
  }

  const handleSelectAll = () => {
    if (selectedPosts.size === pendingPosts.length) {
      setSelectedPosts(new Set())
    } else {
      setSelectedPosts(new Set(pendingPosts.map(p => p.id)))
    }
  }

  const handleBatchApprove = async () => {
    if (selectedPosts.size === 0) return
    setBatchLoading(true)
    try {
      const result = await adminApi.batchApprovePosts(Array.from(selectedPosts))
      if (result.success) {
        showToast(`已通过 ${result.data.count} 篇帖子`, 'success')
        setSelectedPosts(new Set())
        loadPendingPosts(1, true)
      }
    } catch (err) {
      console.error('Failed to batch approve:', err)
      showToast('批量操作失败', 'error')
    } finally {
      setBatchLoading(false)
    }
  }

  const handleBatchReject = async () => {
    if (selectedPosts.size === 0) return
    if (!confirm(`确定拒绝选中的 ${selectedPosts.size} 篇帖子？`)) return

    const reason = '内容违规'
    setBatchLoading(true)
    try {
      const result = await adminApi.batchRejectPosts(Array.from(selectedPosts), reason)
      if (result.success) {
        showToast(`已拒绝 ${result.data.count} 篇帖子`, 'success')
        setSelectedPosts(new Set())
        loadPendingPosts(1, true)
      }
    } catch (err) {
      console.error('Failed to batch reject:', err)
      showToast('批量操作失败', 'error')
    } finally {
      setBatchLoading(false)
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
      ) : pendingPosts.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>
            <EmptyIcon />
          </div>
          <p className={styles.emptyText}>暂无待审核内容</p>
        </div>
      ) : (
        <>
          <div className={styles.batchBar}>
            <label className={styles.selectAll}>
              <input
                type="checkbox"
                checked={selectedPosts.size === pendingPosts.length && pendingPosts.length > 0}
                onChange={handleSelectAll}
              />
              <span>全选</span>
            </label>
            {selectedPosts.size > 0 && (
              <div className={styles.batchActions}>
                <span className={styles.selectedCount}>已选 {selectedPosts.size} 篇</span>
                <button
                  className={styles.batchApproveBtn}
                  onClick={handleBatchApprove}
                  disabled={batchLoading}
                >
                  批量通过
                </button>
                <button
                  className={styles.batchRejectBtn}
                  onClick={handleBatchReject}
                  disabled={batchLoading}
                >
                  批量拒绝
                </button>
              </div>
            )}
          </div>
          {pendingPosts.map(post => (
            <div key={post.id} className={`${styles.card} ${selectedPosts.has(post.id) ? styles.selected : ''}`}>
              <div className={styles.cardHeader}>
                <label className={styles.cardSelect}>
                  <input
                    type="checkbox"
                    checked={selectedPosts.has(post.id)}
                    onChange={() => handleSelectPost(post.id)}
                  />
                </label>
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
          ))}
        </>
      )}
      {postsHasMore && !loading && (
        <button
          className={styles.loadMore}
          onClick={() => loadPendingPosts(postsPage + 1, false)}
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
    </div>
  )
}
