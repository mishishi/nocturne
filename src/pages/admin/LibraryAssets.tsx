import { useState, useEffect } from 'react'
import { adminLibraryApi } from '../../services/api'
import styles from '../Admin.module.css'

type CandidateStatus = 'pending' | 'approved' | 'rejected' | 'all'

interface AssetCandidate {
  id: string
  sessionId: string
  storyTitle: string
  targetLevel: 'premium' | 'curated'
  likeCount: number
  commentCount: number
  engagementScore: number
  status: string
  generatedAt: string
}

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

function getLevelBadgeClass(level: string): string {
  switch (level) {
    case 'premium':
      return styles.levelPremium
    case 'curated':
      return styles.levelCurated
    default:
      return styles.levelNormal
  }
}

function getLevelLabel(level: string): string {
  switch (level) {
    case 'premium':
      return '优质'
    case 'curated':
      return '精选'
    default:
      return '普通'
  }
}

export function LibraryAssets() {
  const [candidates, setCandidates] = useState<AssetCandidate[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [autoUpgrading, setAutoUpgrading] = useState(false)
  const [candidatesPage, setCandidatesPage] = useState(1)
  const [candidatesHasMore, setCandidatesHasMore] = useState(false)
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
      const result = await adminLibraryApi.getCandidates({
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
      const result = await adminLibraryApi.generateCandidates()
      if (result.success) {
        showToast(`已扫描 ${result.data.totalScanned} 篇故事，生成 ${result.data.generatedCount} 个候选`, 'success')
        loadCandidates(1, true)
      }
    } catch (err) {
      console.error('Failed to generate candidates:', err)
      showToast('生成失败', 'error')
    } finally {
      setGenerating(false)
    }
  }

  const handleAutoUpgrade = async () => {
    setAutoUpgrading(true)
    try {
      const result = await adminLibraryApi.autoUpgrade()
      if (result.success) {
        showToast(`已自动升级 ${result.data.upgradedCount} 篇故事（共扫描 ${result.data.totalScanned} 篇）`, 'success')
      }
    } catch (err) {
      console.error('Failed to auto upgrade:', err)
      showToast('自动升级失败', 'error')
    } finally {
      setAutoUpgrading(false)
    }
  }

  const handleApproveCandidate = async (candidate: AssetCandidate) => {
    try {
      const result = await adminLibraryApi.approveCandidate(candidate.sessionId)
      if (result.success) {
        showToast(`已确认 "${candidate.storyTitle}" 为${getLevelLabel(candidate.targetLevel)}`, 'success')
        setCandidates(prev => prev.filter(c => c.id !== candidate.id))
      }
    } catch (err) {
      console.error('Failed to approve candidate:', err)
      showToast('操作失败', 'error')
    }
  }

  const handleRejectCandidate = async (candidate: AssetCandidate) => {
    if (!confirm(`确定拒绝该候选？\n\n"${candidate.storyTitle}"`)) return

    try {
      const result = await adminLibraryApi.rejectCandidate(candidate.sessionId)
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

    const selectedItems = candidates.filter(c => selectedCandidates.has(c.id))
    const sessionIds = selectedItems.map(c => c.sessionId)

    try {
      const results = await Promise.all(
        sessionIds.map(sessionId => adminLibraryApi.approveCandidate(sessionId))
      )
      const successCount = results.filter(r => r.success).length
      showToast(`已确认 ${successCount} 个候选`, 'success')
      setSelectedCandidates(new Set())
      loadCandidates(1, true)
    } catch (err) {
      console.error('Failed to batch approve:', err)
      showToast('批量操作失败', 'error')
    }
  }

  const handleBatchRejectCandidates = async () => {
    if (selectedCandidates.size === 0) return

    const selectedItems = candidates.filter(c => selectedCandidates.has(c.id))
    const sessionIds = selectedItems.map(c => c.sessionId)

    try {
      const results = await Promise.all(
        sessionIds.map(sessionId => adminLibraryApi.rejectCandidate(sessionId))
      )
      const successCount = results.filter(r => r.success).length
      showToast(`已拒绝 ${successCount} 个候选`, 'success')
      setSelectedCandidates(new Set())
      loadCandidates(1, true)
    } catch (err) {
      console.error('Failed to batch reject:', err)
      showToast('批量操作失败', 'error')
    }
  }

  const handleCandidateStatusChange = (status: CandidateStatus) => {
    setCandidateStatus(status)
    setSelectedCandidates(new Set())
    loadCandidates(1, true)
  }

  return (
    <div className={styles.list}>
      {/* Header with action buttons */}
      <div className={styles.libraryHeader}>
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
        <button
          className={styles.autoUpgradeBtn}
          onClick={handleAutoUpgrade}
          disabled={autoUpgrading}
        >
          {autoUpgrading ? (
            <>
              <span className={styles.spinnerSmall} />
              升级中...
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <path d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              自动升级达标故事
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

      {/* Threshold info */}
      <div className={styles.thresholdInfo}>
        <div className={styles.thresholdItem}>
          <span className={styles.thresholdLabel}>优质标准</span>
          <span className={styles.thresholdValue}>点赞 ≥10 & 评论 ≥3</span>
        </div>
        <div className={styles.thresholdDivider}>|</div>
        <div className={styles.thresholdItem}>
          <span className={styles.thresholdLabel}>精选标准</span>
          <span className={styles.thresholdValue}>点赞 ≥30 & 评论 ≥10</span>
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
            <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
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
                >
                  批量确认
                </button>
                <button
                  className={styles.batchRejectBtn}
                  onClick={handleBatchRejectCandidates}
                >
                  批量拒绝
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
                  <span className={`${styles.levelBadge} ${getLevelBadgeClass(candidate.targetLevel)}`}>
                    {getLevelLabel(candidate.targetLevel)}
                  </span>
                </div>
                <div className={styles.scoreBadge}>
                  <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12">
                    <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  {candidate.engagementScore}
                </div>
              </div>
              <h3 className={styles.cardTitle}>{candidate.storyTitle}</h3>
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
                <span className={styles.date}>{formatDate(candidate.generatedAt)}</span>
              </div>
              {candidateStatus === 'pending' && (
                <div className={styles.cardActions}>
                  <button
                    className={styles.approveBtn}
                    onClick={() => handleApproveCandidate(candidate)}
                  >
                    确认{getLevelLabel(candidate.targetLevel)}
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
