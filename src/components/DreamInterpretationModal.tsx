import { createPortal } from 'react-dom'
import { useState, useEffect } from 'react'
import { api } from '../services/api'
import styles from './DreamInterpretationModal.module.css'

interface DreamInterpretationModalProps {
  interpretation: string
  sessionId: string
  onClose: () => void
}

type FeedbackState = 'idle' | 'submitting' | 'submitted' | 'error'

export function DreamInterpretationModal({ interpretation, sessionId, onClose }: DreamInterpretationModalProps) {
  const sections = parseInterpretation(interpretation)
  const [feedbackState, setFeedbackState] = useState<FeedbackState>('idle')
  const [selectedRating, setSelectedRating] = useState<boolean | null>(null)
  const [feedbackComment, setFeedbackComment] = useState('')
  const [existingFeedback, setExistingFeedback] = useState<{ isAccurate: boolean; comment?: string } | null>(null)

  // Check if user already submitted feedback
  useEffect(() => {
    const checkExistingFeedback = async () => {
      try {
        const result = await api.getInterpretationFeedback(sessionId)
        if (result.success && result.data?.feedback) {
          setExistingFeedback(result.data.feedback)
          setFeedbackState('submitted')
          setSelectedRating(result.data.feedback.isAccurate)
          setFeedbackComment(result.data.feedback.comment || '')
        }
      } catch {
        // Ignore - user might not be logged in or feedback doesn't exist
      }
    }
    checkExistingFeedback()
  }, [sessionId])

  const handleFeedback = async (isAccurate: boolean) => {
    if (feedbackState === 'submitted' || feedbackState === 'submitting') return

    setSelectedRating(isAccurate)
    setFeedbackState('submitting')

    try {
      await api.submitInterpretationFeedback(sessionId, isAccurate, feedbackComment.trim() || undefined)
      setFeedbackState('submitted')
    } catch {
      setFeedbackState('error')
    }
  }

  const handleUpdateComment = async () => {
    if (feedbackState !== 'submitted' || selectedRating === null) return

    setFeedbackState('submitting')
    try {
      await api.submitInterpretationFeedback(sessionId, selectedRating, feedbackComment.trim() || undefined)
      setFeedbackState('submitted')
    } catch {
      setFeedbackState('error')
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>
            <span className={styles.titleIcon}>🌙</span>
            梦境解读
          </h3>
          <button className={styles.closeBtn} onClick={onClose} aria-label="关闭">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.intro}>
            <svg className={styles.introIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            <p className={styles.introText}>
              以下解读仅供参考，每人的梦境都有独特的个人意义。希望这些视角能帮助你更好地了解自己。
            </p>
          </div>

          {sections.symbolism && (
            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>
                <svg className={styles.sectionIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4M12 8h.01" />
                </svg>
                象征解读
              </h4>
              <p className={styles.sectionContent}>{sections.symbolism}</p>
            </div>
          )}

          {sections.emotion && (
            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>
                <svg className={styles.sectionIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                情绪线索
              </h4>
              <p className={styles.sectionContent}>{sections.emotion}</p>
            </div>
          )}

          {sections.question && (
            <div className={styles.question}>
              <span className={styles.questionLabel}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                自我思考
              </span>
              <p className={styles.questionText}>{sections.question}</p>
            </div>
          )}

          {/* Feedback Section */}
          <div className={styles.feedbackSection}>
            {feedbackState === 'idle' && (
              <>
                <p className={styles.feedbackPrompt}>这份解读对你有帮助吗？</p>
                <div className={styles.feedbackButtons}>
                  <button
                    className={`${styles.feedbackBtn} ${styles.feedbackBtnGood}`}
                    onClick={() => handleFeedback(true)}
                    aria-label="有帮助"
                  >
                    <span className={styles.feedbackEmoji}>👍</span>
                    <span>有帮助</span>
                  </button>
                  <button
                    className={`${styles.feedbackBtn} ${styles.feedbackBtnBad}`}
                    onClick={() => handleFeedback(false)}
                    aria-label="不太准确"
                  >
                    <span className={styles.feedbackEmoji}>👎</span>
                    <span>不太准确</span>
                  </button>
                </div>
              </>
            )}

            {feedbackState === 'submitting' && (
              <div className={styles.feedbackLoading}>
                <div className={styles.miniSpinner} />
                <span>提交中...</span>
              </div>
            )}

            {(feedbackState === 'submitted' || existingFeedback) && (
              <div className={styles.feedbackSubmitted}>
                <div className={styles.feedbackThanks}>
                  {selectedRating ? '感谢你的反馈！' : '感谢你的反馈，我们会继续改进'}
                  {selectedRating && ' 🙏'}
                </div>

                {/* Optional comment update */}
                <div className={styles.feedbackComment}>
                  <input
                    type="text"
                    className={styles.commentInput}
                    placeholder="补充说明（选填）..."
                    value={feedbackComment}
                    onChange={(e) => setFeedbackComment(e.target.value)}
                    maxLength={200}
                  />
                  <button
                    className={styles.commentSubmit}
                    onClick={handleUpdateComment}
                    disabled={feedbackState === 'submitting'}
                  >
                    更新
                  </button>
                </div>
              </div>
            )}

            {feedbackState === 'error' && (
              <div className={styles.feedbackError}>
                <span>提交失败</span>
                <button
                  className={styles.retryBtn}
                  onClick={() => setFeedbackState('idle')}
                >
                  重试
                </button>
              </div>
            )}
          </div>
        </div>

        <div className={styles.footer}>
          <p className={styles.hint}>解读仅供參考，請結合自己的實際情況理解</p>
        </div>
      </div>
    </div>,
    document.body
  )
}

// Loading spinner modal
export function DreamInterpretationLoadingModal({ onClose }: { onClose: () => void }) {
  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>
            <span className={styles.titleIcon}>🌙</span>
            梦境解读
          </h3>
          <button className={styles.closeBtn} onClick={onClose} aria-label="关闭">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <p className={styles.loadingText}>正在解读你的梦境...</p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

function parseInterpretation(text: string): { symbolism?: string; emotion?: string; question?: string } {
  const result: { symbolism?: string; emotion?: string; question?: string } = {}

  // Try to extract sections by headers
  const symbolismMatch = text.match(/【象征解读】([\s\S]*?)(?=【|$)/i)
  const emotionMatch = text.match(/【情绪线索】([\s\S]*?)(?=【|$)/i)
  const questionMatch = text.match(/【自我思考】([\s\S]*?)$/i)

  if (symbolismMatch) result.symbolism = symbolismMatch[1].trim()
  if (emotionMatch) result.emotion = emotionMatch[1].trim()
  if (questionMatch) result.question = questionMatch[1].trim()

  // If no structured format found, just return the whole text as a single section
  if (!result.symbolism && !result.emotion && !result.question) {
    result.symbolism = text.trim()
  }

  return result
}
