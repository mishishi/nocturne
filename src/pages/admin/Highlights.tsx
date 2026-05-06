import { useState, useEffect } from 'react'
import { adminApi, HighlightCandidate } from '../../services/api'
import styles from '../Admin.module.css'

type CandidateStatus = 'pending' | 'approved' | 'rejected'

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return '刚刚'
  if (diffMins < 60) return `${diffMins}分钟前`
  if (diffHours < 24) return `${diffHours}小时前`
  if (diffDays < 7) return `${diffDays}天前`
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

export function Highlights() {
  const [candidates, setCandidates] = useState<HighlightCandidate[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [batchLoading, setBatchLoading] = useState(false)
  const [candidatesPage, setCandidatesPage] = useState(1)
  const [candidatesHasMore, setCandidatesHasMore] = useState(true)
  const [candidateStatus, setCandidateStatus] = useState<CandidateStatus>('pending')
  const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(new Set())
  const [toastVisible, setToastVisible] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success')

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage(message)
    setToastType(type)
    setToastVisible(true)
  }

  useEffect(() => {
    loadCandidates(1, true)
  }, [candidateStatus])

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
          setCandidates(result.data.candidates || [])
          setSelectedCandidates(new Set())
        } else {
          setCandidates(prev => [...prev, ...(result.data.candidates || [])])
        }
        // Backend may not return pagination info
        setCandidatesHasMore(result.data.pagination?.hasMore ?? false)
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

  return (
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

      {/* Toast */}
      {toastVisible && (
        <div className={`${styles.toast} ${styles[toastType]}`}>
          {toastMessage}
        </div>
      )}
    </div>
  )
}