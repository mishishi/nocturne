import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminApi, AdminStats, PendingPost, AdminComment, HighlightCandidate } from '../services/api'
import { Toast } from '../components/ui/Toast'
import styles from './Admin.module.css'

type TabType = 'pending' | 'comments' | 'stats' | 'highlights'
type CandidateStatus = 'pending' | 'approved' | 'rejected'

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
  const [selectedPosts, setSelectedPosts] = useState<Set<string>>(new Set())
  const [batchLoading, setBatchLoading] = useState(false)

  // Comments
  const [comments, setComments] = useState<AdminComment[]>([])
  const [commentsPage, setCommentsPage] = useState(1)
  const [commentsHasMore, setCommentsHasMore] = useState(true)

  // Highlights/Candidates
  const [candidates, setCandidates] = useState<HighlightCandidate[]>([])
  const [candidatesPage, setCandidatesPage] = useState(1)
  const [candidatesHasMore, setCandidatesHasMore] = useState(true)
  const [candidateStatus, setCandidateStatus] = useState<CandidateStatus>('pending')
  const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(new Set())
  const [generating, setGenerating] = useState(false)

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
    } else if (activeTab === 'highlights') {
      loadCandidates(1, true)
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

  // Candidates functions
  const loadCandidates = async (page: number, reset = false) => {
    if (page === 1) setLoading(true)
    try {
      const result = await adminApi.getHighlightCandidates({
        status: candidateStatus,
        page,
        limit: 20
      })
      if (result.success) {
        if (reset) {
          setCandidates(result.data.candidates)
          setSelectedCandidates(new Set())
        } else {
          setCandidates(prev => [...prev, ...result.data.candidates])
        }
        setCandidatesHasMore(result.data.pagination.hasMore)
        setCandidatesPage(page)
      }
    } catch (err) {
      console.error('Failed to load candidates:', err)
      showToast('加载失败', 'error')
    } finally {
      if (page === 1) setLoading(false)
    }
  }

  const handleGenerateCandidates = async () => {
    setGenerating(true)
    try {
      const result = await adminApi.generateHighlightCandidates()
      if (result.success) {
        showToast(`已生成 ${result.data.generated} 个候选`, 'success')
        loadCandidates(1, true)
      }
    } catch (err) {
      console.error('Failed to generate candidates:', err)
      showToast('生成失败', 'error')
    } finally {
      setGenerating(false)
    }
  }

  const handleApproveCandidate = async (candidate: HighlightCandidate) => {
    try {
      const result = await adminApi.approveHighlightCandidate(candidate.id)
      if (result.success) {
        showToast('已确认精选，奖励作者 20 积分', 'success')
        setCandidates(prev => prev.filter(c => c.id !== candidate.id))
      }
    } catch (err) {
      console.error('Failed to approve candidate:', err)
      showToast('操作失败', 'error')
    }
  }

  const handleRejectCandidate = async (candidate: HighlightCandidate) => {
    if (!confirm(`确定拒绝该候选？\n\n"${candidate.storyTitle}"`)) return

    try {
      const result = await adminApi.rejectHighlightCandidate(candidate.id)
      if (result.success) {
        showToast('已拒绝候选', 'success')
        setCandidates(prev => prev.filter(c => c.id !== candidate.id))
      }
    } catch (err) {
      console.error('Failed to reject candidate:', err)
      showToast('操作失败', 'error')
    }
  }

  const handleSelectCandidate = (candidateId: string) => {
    setSelectedCandidates(prev => {
      const next = new Set(prev)
      if (next.has(candidateId)) {
        next.delete(candidateId)
      } else {
        next.add(candidateId)
      }
      return next
    })
  }

  const handleSelectAllCandidates = () => {
    if (selectedCandidates.size === candidates.length) {
      setSelectedCandidates(new Set())
    } else {
      setSelectedCandidates(new Set(candidates.map(c => c.id)))
    }
  }

  const handleBatchApproveCandidates = async () => {
    if (selectedCandidates.size === 0) return
    setBatchLoading(true)
    try {
      const result = await adminApi.batchApproveHighlightCandidates(Array.from(selectedCandidates))
      if (result.success) {
        showToast(`已确认 ${result.data.featured} 个精选，共奖励 ${result.data.rewardPoints} 积分`, 'success')
        setSelectedCandidates(new Set())
        loadCandidates(1, true)
      }
    } catch (err) {
      console.error('Failed to batch approve:', err)
      showToast('批量操作失败', 'error')
    } finally {
      setBatchLoading(false)
    }
  }

  const handleCandidateStatusChange = (status: CandidateStatus) => {
    setCandidateStatus(status)
    setSelectedCandidates(new Set())
    loadCandidates(1, true)
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
        loadStats()
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

    const reason = '内容违规' // Default reason for batch operations
    setBatchLoading(true)
    try {
      const result = await adminApi.batchRejectPosts(Array.from(selectedPosts), reason)
      if (result.success) {
        showToast(`已拒绝 ${result.data.count} 篇帖子`, 'success')
        setSelectedPosts(new Set())
        loadPendingPosts(1, true)
        loadStats()
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
          <button
            className={`${styles.tab} ${activeTab === 'highlights' ? styles.active : ''}`}
            onClick={() => setActiveTab('highlights')}
          >
            精选候选
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
            {stats?.trends && (
              <>
                <div className={styles.statCard}>
                  <div className={styles.statValue}>{stats.trends.postsLast7Days}</div>
                  <div className={styles.statLabel}>7天新增帖子</div>
                </div>
                <div className={styles.statCard}>
                  <div className={`${styles.statValue} ${stats.trends.postsGrowth >= 0 ? styles.positive : styles.negative}`}>
                    {stats.trends.postsGrowth >= 0 ? '+' : ''}{stats.trends.postsGrowth}%
                  </div>
                  <div className={styles.statLabel}>增长率</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statValue}>{stats.trends.approvedLast7Days}</div>
                  <div className={styles.statLabel}>7天通过</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statValue}>{stats.trends.rejectedLast7Days}</div>
                  <div className={styles.statLabel}>7天拒绝</div>
                </div>
              </>
            )}
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
              <>
                {/* Batch action bar */}
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

        {activeTab === 'highlights' && (
          <div className={styles.list}>
            {/* Generate button and status filter */}
            <div className={styles.highlightsHeader}>
              <button
                className={styles.generateBtn}
                onClick={handleGenerateCandidates}
                disabled={generating}
              >
                {generating ? (
                  <>
                    <span className={styles.spinnerSmall} />
                    生成中...
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                    </svg>
                    运行算法生成候选
                  </>
                )}
              </button>
              <div className={styles.statusFilter}>
                <button
                  className={`${styles.statusBtn} ${candidateStatus === 'pending' ? styles.activeStatus : ''}`}
                  onClick={() => handleCandidateStatusChange('pending')}
                >
                  待确认
                </button>
                <button
                  className={`${styles.statusBtn} ${candidateStatus === 'approved' ? styles.activeStatus : ''}`}
                  onClick={() => handleCandidateStatusChange('approved')}
                >
                  已确认
                </button>
                <button
                  className={`${styles.statusBtn} ${candidateStatus === 'rejected' ? styles.activeStatus : ''}`}
                  onClick={() => handleCandidateStatusChange('rejected')}
                >
                  已拒绝
                </button>
              </div>
            </div>

            {loading ? (
              <div className={styles.loading}>
                <div className={styles.spinner} />
                <span>加载中...</span>
              </div>
            ) : candidates.length === 0 ? (
              <div className={styles.empty}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className={styles.emptyIcon}>
                  <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
                <p className={styles.emptyText}>
                  {candidateStatus === 'pending' ? '暂无待确认的候选，点击上方按钮生成' : `暂无${candidateStatus === 'approved' ? '已确认' : '已拒绝'}的候选`}
                </p>
              </div>
            ) : (
              <>
                {/* Batch action bar for pending status */}
                {candidateStatus === 'pending' && selectedCandidates.size > 0 && (
                  <div className={styles.batchBar}>
                    <label className={styles.selectAll}>
                      <input
                        type="checkbox"
                        checked={selectedCandidates.size === candidates.length && candidates.length > 0}
                        onChange={handleSelectAllCandidates}
                      />
                      <span>全选</span>
                    </label>
                    <div className={styles.batchActions}>
                      <span className={styles.selectedCount}>已选 {selectedCandidates.size} 个</span>
                      <button
                        className={styles.batchApproveBtn}
                        onClick={handleBatchApproveCandidates}
                        disabled={batchLoading}
                      >
                        批量确认精选
                      </button>
                    </div>
                  </div>
                )}

                {candidates.map(candidate => (
                  <div key={candidate.id} className={`${styles.card} ${selectedCandidates.has(candidate.id) ? styles.selected : ''}`}>
                    <div className={styles.cardHeader}>
                      {candidateStatus === 'pending' && (
                        <label className={styles.cardSelect}>
                          <input
                            type="checkbox"
                            checked={selectedCandidates.has(candidate.id)}
                            onChange={() => handleSelectCandidate(candidate.id)}
                          />
                        </label>
                      )}
                      <div className={styles.cardMeta}>
                        <span className={styles.nickname}>
                          {candidate.nickname || '匿名用户'}
                        </span>
                        <span className={styles.date}>{formatDate(candidate.generatedAt)}</span>
                      </div>
                      <div className={styles.scoreBadge}>
                        <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                        {candidate.engagementScore}
                      </div>
                    </div>
                    <h3 className={styles.cardTitle}>{candidate.storyTitle}</h3>
                    <p className={styles.cardSnippet}>{candidate.storySnippet}</p>
                    <div className={styles.candidateStats}>
                      <span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                          <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
                        </svg>
                        {candidate.likeCount}
                      </span>
                      <span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                        </svg>
                        {candidate.commentCount}
                      </span>
                      <span className={styles.rankBadge}>排名 #{candidate.rank}</span>
                    </div>
                    {candidateStatus === 'pending' && (
                      <div className={styles.cardActions}>
                        <button
                          className={styles.approveBtn}
                          onClick={() => handleApproveCandidate(candidate)}
                        >
                          确认精选
                        </button>
                        <button
                          className={styles.rejectBtn}
                          onClick={() => handleRejectCandidate(candidate)}
                        >
                          拒绝
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}
            {candidatesHasMore && !loading && (
              <button
                className={styles.loadMore}
                onClick={() => loadCandidates(candidatesPage + 1, false)}
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
