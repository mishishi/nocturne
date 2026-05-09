import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDreamStore, showToast } from '../hooks/useDreamStore'
import { Button } from '../components/ui/Button'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import { Breadcrumb } from '../components/Breadcrumb'
import { EmptyState } from '../components/ui/EmptyState'
import styles from './Drafts.module.css'

// Status labels
const STATUS_LABELS: Record<string, { text: string; desc: string }> = {
  idle: { text: '无草稿', desc: '暂无保存的草稿' },
  dream_submitted: { text: '待生成问题', desc: '正在等待生成追问问题' },
  questions: { text: '待回答', desc: '问题已生成，等待你的回答' },
  answering: { text: '回答中', desc: '正在回答追问' },
  story_generating: { text: '生成中', desc: '正在生成故事' },
  completed: { text: '已完成', desc: '故事已生成完成' }
}

export function Drafts() {
  const navigate = useNavigate()
  const { currentSession, reset: resetSession } = useDreamStore()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Check if there's a draft to show
  const hasDraft = currentSession.dreamText || currentSession.questions.length > 0

  // Get draft status info
  const statusInfo = STATUS_LABELS[currentSession.status] || STATUS_LABELS.idle

  // Handle delete draft
  const handleDeleteDraft = () => {
    resetSession()
    setShowDeleteConfirm(false)
    showToast('草稿已删除', 'success')
  }

  // Handle continue draft
  const handleContinueDraft = () => {
    // Navigate based on current status
    switch (currentSession.status) {
      case 'dream_submitted':
      case 'questions':
      case 'answering':
        navigate('/questions')
        break
      case 'story_generating':
        navigate('/questions')
        break
      case 'completed':
        navigate('/story/' + currentSession.sessionId)
        break
      default:
        navigate('/dream')
    }
  }

  // Format date
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('zh-CN', {
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <Breadcrumb
          items={[
            { label: '首页', href: '/' },
            { label: '草稿箱' }
          ]}
        />

        <header className={styles.header}>
          <button className={styles.closeBtn} onClick={() => navigate('/')} aria-label="关闭">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
          <h1 className={styles.title}>草稿箱</h1>
          <p className={styles.subtitle}>管理你的未完成梦境记录</p>
        </header>

        {hasDraft ? (
          <div className={styles.draftCard}>
            <div className={styles.draftHeader}>
              <span className={styles.draftStatus}>{statusInfo.text}</span>
              <span className={styles.draftDate}>
                {formatDate(new Date())}
              </span>
            </div>

            <div className={styles.draftContent}>
              <p className={styles.draftDesc}>{statusInfo.desc}</p>

              {currentSession.dreamText && (
                <div className={styles.draftPreview}>
                  <span className={styles.previewLabel}>梦境描述</span>
                  <p className={styles.previewText}>
                    {currentSession.dreamText.slice(0, 150)}
                    {currentSession.dreamText.length > 150 ? '...' : ''}
                  </p>
                </div>
              )}

              {currentSession.questions.length > 0 && (
                <div className={styles.questionsPreview}>
                  <span className={styles.previewLabel}>
                    问题 ({currentSession.currentQuestionIndex + 1}/{currentSession.questions.length})
                  </span>
                  <p className={styles.previewText}>
                    {currentSession.questions[currentSession.currentQuestionIndex]}
                  </p>
                </div>
              )}

              {currentSession.storyTitle && (
                <div className={styles.storyPreview}>
                  <span className={styles.previewLabel}>故事标题</span>
                  <p className={styles.previewText}>{currentSession.storyTitle}</p>
                </div>
              )}
            </div>

            <div className={styles.draftActions}>
              <Button onClick={handleContinueDraft} className={styles.continueBtn}>
                {currentSession.status === 'completed' ? '查看故事' : '继续'}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setShowDeleteConfirm(true)}
                className={styles.deleteBtn}
              >
                删除
              </Button>
            </div>
          </div>
        ) : (
          <EmptyState
            icon="document"
            title="暂无草稿"
            description="开始记录一个新的梦境吧"
            action={{
              label: '开始记录',
              onClick: () => navigate('/dream')
            }}
          />
        )}

        {/* Action buttons */}
        <div className={styles.actions}>
          <button
            className={styles.actionCard}
            onClick={() => navigate('/dream')}
          >
            <div className={styles.actionIcon}>✍️</div>
            <div className={styles.actionInfo}>
              <span className={styles.actionTitle}>记录梦境</span>
              <span className={styles.actionDesc}>开始一段新的梦境记录</span>
            </div>
            <svg className={styles.actionArrow} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>

          <button
            className={styles.actionCard}
            onClick={() => navigate('/history')}
          >
            <div className={styles.actionIcon}>📚</div>
            <div className={styles.actionInfo}>
              <span className={styles.actionTitle}>历史记录</span>
              <span className={styles.actionDesc}>查看已完成的梦境故事</span>
            </div>
            <svg className={styles.actionArrow} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        </div>

        <ConfirmModal
          isOpen={showDeleteConfirm}
          title="删除草稿"
          message="确定要删除这个草稿吗？此操作不可恢复。"
          confirmText="删除"
          cancelText="取消"
          onConfirm={handleDeleteDraft}
          onCancel={() => setShowDeleteConfirm(false)}
          danger
        />
      </div>
    </div>
  )
}
