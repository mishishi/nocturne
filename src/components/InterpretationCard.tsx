import { useState } from 'react'
import { api } from '../services/api'
import { ExpandableCard } from './ExpandableCard'
import styles from './InterpretationCard.module.css'

interface InterpretationCardProps {
  interpretation: string
  personalityTag?: { name: string; description: string }
  historyComparison?: string
  sessionId: string
  onExpanded?: () => void
}

type FeedbackState = 'idle' | 'submitting' | 'submitted'

export function InterpretationCard({
  interpretation,
  personalityTag,
  historyComparison,
  sessionId,
  onExpanded
}: InterpretationCardProps) {
  const [feedbackState, setFeedbackState] = useState<FeedbackState>('idle')
  const [selectedRating, setSelectedRating] = useState<boolean | null>(null)

  const handleFeedback = async (isAccurate: boolean) => {
    if (feedbackState === 'submitted' || feedbackState === 'submitting') return

    setSelectedRating(isAccurate)
    setFeedbackState('submitting')

    try {
      await api.submitInterpretationFeedback(sessionId, isAccurate)
      setFeedbackState('submitted')
    } catch {
      setFeedbackState('idle')
    }
  }

  const sections = parseInterpretation(interpretation)

  return (
    <ExpandableCard
      icon="🌙"
      title="梦境解读"
      onExpanded={onExpanded}
    >
      {/* Personality Tag */}
      {personalityTag && (
        <div className={styles.personalityTag}>
          <span className={styles.tagBadge}>{personalityTag.name}</span>
          <span className={styles.tagDesc}>{personalityTag.description}</span>
        </div>
      )}

      {/* History Comparison */}
      {historyComparison && (
        <div className={styles.historyComparison}>
          <svg className={styles.historyIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span>{historyComparison}</span>
        </div>
      )}

      {/* Interpretation Content */}
      <div className={styles.interpretationContent}>
        {sections.symbolism && (
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>
              <svg className={styles.sectionIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4M12 8h.01" />
              </svg>
              象征解读
            </h4>
            <p className={styles.sectionText}>{sections.symbolism}</p>
          </div>
        )}

        {sections.emotion && (
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>
              <svg className={styles.sectionIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              情绪线索
            </h4>
            <p className={styles.sectionText}>{sections.emotion}</p>
          </div>
        )}

        {sections.question && (
          <div className={styles.question}>
            <span className={styles.questionLabel}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              自我思考
            </span>
            <p className={styles.questionText}>{sections.question}</p>
          </div>
        )}
      </div>

      {/* Feedback Section */}
      <div className={styles.feedback}>
        {feedbackState === 'idle' && (
          <div className={styles.feedbackButtons}>
            <span className={styles.feedbackLabel}>这份解读有帮助吗？</span>
            <button
              className={`${styles.feedbackBtn} ${styles.feedbackBtnGood}`}
              onClick={() => handleFeedback(true)}
            >
              👍 有帮助
            </button>
            <button
              className={`${styles.feedbackBtn} ${styles.feedbackBtnBad}`}
              onClick={() => handleFeedback(false)}
            >
              👎 不太准
            </button>
          </div>
        )}

        {feedbackState === 'submitting' && (
          <div className={styles.feedbackLoading}>
            <div className={styles.miniSpinner} />
            <span>提交中...</span>
          </div>
        )}

        {feedbackState === 'submitted' && (
          <div className={styles.feedbackSubmitted}>
            {selectedRating ? '感谢反馈！🙏' : '感谢反馈，我们会继续改进'}
          </div>
        )}
      </div>
    </ExpandableCard>
  )
}

function parseInterpretation(text: string): { symbolism?: string; emotion?: string; question?: string } {
  const result: { symbolism?: string; emotion?: string; question?: string } = {}

  const symbolismMatch = text.match(/【象征解读】([\s\S]*?)(?=【|$)/i)
  const emotionMatch = text.match(/【情绪线索】([\s\S]*?)(?=【|$)/i)
  const questionMatch = text.match(/【自我思考】([\s\S]*?)$/i)

  if (symbolismMatch) result.symbolism = symbolismMatch[1].trim()
  if (emotionMatch) result.emotion = emotionMatch[1].trim()
  if (questionMatch) result.question = questionMatch[1].trim()

  if (!result.symbolism && !result.emotion && !result.question) {
    result.symbolism = text.trim()
  }

  return result
}
