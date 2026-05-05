import { useState, useEffect, useRef, useCallback } from 'react'
import { storyFeedbackApi } from '../services/api'
import { useDreamStore } from '../hooks/useDreamStore'
import { Toast } from './ui/Toast'
import { Button } from './ui/Button'
import styles from './StoryFeedbackForm.module.css'

interface StoryFeedbackFormProps {
  sessionId: string
  isAuthor?: boolean
  onSubmitted?: () => void
}

interface ElementRatings {
  character: number
  location: number
  object: number
  emotion: number
  plot: number
}

const FEEDBACK_STORAGE_KEY = 'yeelin_story_feedbacks'

type FeedbackStatus = 'submitted' | 'skipped'

interface StoredFeedbackRecord {
  status: FeedbackStatus
  timestamp: number
}

type AllStoredFeedbacks = Record<string, StoredFeedbackRecord>

function getStoredFeedbacks(): AllStoredFeedbacks {
  const stored = localStorage.getItem(FEEDBACK_STORAGE_KEY)
  if (!stored) return {}
  try {
    return JSON.parse(stored) as AllStoredFeedbacks
  } catch {
    return {}
  }
}

function saveStoredFeedbacks(feedbacks: AllStoredFeedbacks): void {
  localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(feedbacks))
}

function getSessionFeedback(sessionId: string): StoredFeedbackRecord | null {
  const feedbacks = getStoredFeedbacks()
  return feedbacks[sessionId] || null
}

function setSessionFeedback(sessionId: string, record: StoredFeedbackRecord): void {
  const feedbacks = getStoredFeedbacks()
  feedbacks[sessionId] = record
  saveStoredFeedbacks(feedbacks)
}

const ELEMENT_LABELS: Record<keyof ElementRatings, string> = {
  character: '角色',
  location: '场景',
  object: '物品',
  emotion: '情感',
  plot: '情节'
}

// Star rating sub-component
interface StarRatingProps {
  value: number
  onChange: (value: number) => void
  hoverValue?: number
  onHover?: (value: number) => void
  readOnly?: boolean
}

function StarRating({ value, onChange, hoverValue, onHover, readOnly = false }: StarRatingProps) {
  const displayValue = hoverValue !== undefined && hoverValue > 0 ? hoverValue : value

  return (
    <div className={styles.stars} role="radiogroup" aria-label="评分">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className={`${styles.star} ${star <= displayValue ? styles.starFilled : ''}`}
          onClick={() => !readOnly && onChange(star)}
          onMouseEnter={() => !readOnly && onHover?.(star)}
          onMouseLeave={() => !readOnly && onHover?.(0)}
          disabled={readOnly}
          aria-label={`${star}星`}
          role="radio"
          aria-checked={star === value}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </button>
      ))}
    </div>
  )
}

export function StoryFeedbackForm({ sessionId, isAuthor = false, onSubmitted }: StoryFeedbackFormProps) {
  const { user } = useDreamStore()
  const isLoggedIn = !!user?.openid

  const [isVisible, setIsVisible] = useState(false)
  const [hasCheckedStorage, setHasCheckedStorage] = useState(false)
  const [isPanelExpanded, setIsPanelExpanded] = useState(true)
  const [overallRating, setOverallRating] = useState(0)
  const [hoverOverallRating, setHoverOverallRating] = useState(0)
  const [elementRatings, setElementRatings] = useState<ElementRatings>({
    character: 0,
    location: 0,
    object: 0,
    emotion: 0,
    plot: 0
  })
  const [hoverElementRatings, setHoverElementRatings] = useState<ElementRatings>({
    character: 0,
    location: 0,
    object: 0,
    emotion: 0,
    plot: 0
  })
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [toastVisible, setToastVisible] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  const sentinelRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLDivElement>(null)

  const handleToastClose = useCallback(() => {
    setToastVisible(false)
  }, [])

  // Check localStorage and server on mount
  useEffect(() => {
    const checkFeedback = async () => {
      const feedback = getSessionFeedback(sessionId)
      if (feedback && (feedback.status === 'submitted' || feedback.status === 'skipped')) {
        setHasCheckedStorage(true)
        return
      }

      // Check server if localStorage has no record
      if (user?.openid) {
        try {
          const result = await storyFeedbackApi.check(sessionId, user.openid)
          if (result.success && result.data?.hasSubmitted && result.data?.feedback) {
            // Update localStorage with server state
            setSessionFeedback(sessionId, {
              status: 'submitted',
              timestamp: new Date(result.data.feedback.createdAt).getTime()
            })
            setHasCheckedStorage(true)
            return
          }
        } catch (err) {
          console.error('Failed to check server feedback:', err)
        }
      }

      setHasCheckedStorage(true)
    }

    checkFeedback()
  }, [sessionId, user?.openid])

  // IntersectionObserver to detect 90% scroll
  useEffect(() => {
    if (!hasCheckedStorage) return

    // Check storage again before setting up observer
    const feedback = getSessionFeedback(sessionId)
    if (feedback && (feedback.status === 'submitted' || feedback.status === 'skipped')) {
      setIsVisible(false)
      return
    }

    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true)
            observer.disconnect()
          }
        })
      },
      { threshold: 0 }
    )

    observer.observe(sentinel)

    return () => {
      observer.disconnect()
    }
  }, [hasCheckedStorage, sessionId])

  // Also check scroll position as fallback
  useEffect(() => {
    if (!hasCheckedStorage) return

    let cancelled = false

    const handleScroll = async () => {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0

      if (progress >= 90) {
        // Check if already submitted/skipped before showing
        const feedback = getSessionFeedback(sessionId)
        if (feedback && (feedback.status === 'submitted' || feedback.status === 'skipped')) {
          return // Don't show if already submitted
        }

        // Check server as well
        if (user?.openid) {
          try {
            const result = await storyFeedbackApi.check(sessionId, user.openid)
            if (cancelled) return
            if (result.success && result.data?.hasSubmitted && result.data?.feedback) {
              setSessionFeedback(sessionId, {
                status: 'submitted',
                timestamp: new Date(result.data.feedback.createdAt).getTime()
              })
              return // Don't show if already submitted on server
            }
          } catch (err) {
            console.error('Failed to check server feedback:', err)
          }
        }

        setIsVisible(true)
        window.removeEventListener('scroll', handleScroll)
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() // Check immediately

    return () => {
      cancelled = true
      window.removeEventListener('scroll', handleScroll)
    }
  }, [hasCheckedStorage, sessionId, user?.openid])

  const handleElementRatingChange = (element: keyof ElementRatings, value: number) => {
    setElementRatings((prev) => ({ ...prev, [element]: value }))
  }

  const handleSkip = () => {
    setSessionFeedback(sessionId, {
      status: 'skipped',
      timestamp: Date.now()
    })
    setIsVisible(false)
  }

  const handleSubmit = async () => {
    if (overallRating === 0) {
      setToastMessage('请选择总体评分')
      setToastVisible(true)
      return
    }

    if (!user?.openid) {
      setToastMessage('请先登录')
      setToastVisible(true)
      setIsSubmitting(false)
      return
    }

    setIsSubmitting(true)

    try {
      await storyFeedbackApi.submit({
        sessionId,
        openid: user.openid,
        overallRating,
        elementRatings: overallRating > 0 && Object.values(elementRatings).some((v) => v > 0)
          ? Object.fromEntries(
              Object.entries(elementRatings).filter(([_, v]) => v > 0)
            )
          : undefined,
        comment: comment.trim() || undefined
      })

      setSessionFeedback(sessionId, {
        status: 'submitted',
        timestamp: Date.now()
      })

      setToastMessage('感谢反馈')
      setToastVisible(true)
      setIsVisible(false)
      onSubmitted?.()
    } catch (err) {
      console.error('Failed to submit feedback:', err)
      setToastMessage('提交失败，请重试')
      setToastVisible(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  const charCount = comment.length
  const isNearLimit = charCount >= 160
  const isAtLimit = charCount >= 200

  if (!hasCheckedStorage || !isLoggedIn || !isAuthor) {
    return null
  }

  return (
    <>
      {/* Sentinel element at 90% scroll position */}
      <div ref={sentinelRef} className={styles.sentinel} aria-hidden="true" />

      {/* Feedback form */}
      <div
        ref={formRef}
        className={`${styles.container} ${isVisible ? styles.visible : ''}`}
        role="dialog"
        aria-label="故事反馈"
        aria-modal="false"
      >
        <div className={styles.card}>
          <div className={styles.header}>
            <h3 className={styles.title}>分享你的反馈</h3>
            <p className={styles.subtitle}>帮助我们优化梦境故事体验</p>
          </div>

          {/* Overall satisfaction */}
          <div className={styles.section}>
            <label className={styles.label}>总体评分</label>
            <StarRating
              value={overallRating}
              onChange={setOverallRating}
              hoverValue={hoverOverallRating}
              onHover={setHoverOverallRating}
            />
          </div>

          {/* Element ratings - collapsible panel */}
          <div className={styles.section}>
            <button
              type="button"
              className={styles.collapseHeader}
              onClick={() => setIsPanelExpanded(!isPanelExpanded)}
              aria-expanded={isPanelExpanded}
            >
              <span className={styles.collapseLabel}>详细评分（可选）</span>
              <svg
                className={`${styles.collapseIcon} ${isPanelExpanded ? styles.collapseIconOpen : ''}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {isPanelExpanded && (
              <div className={styles.elementRatings}>
                {(Object.keys(ELEMENT_LABELS) as Array<keyof ElementRatings>).map((element) => (
                  <div key={element} className={styles.elementRow}>
                    <span className={styles.elementLabel}>{ELEMENT_LABELS[element]}</span>
                    <StarRating
                      value={elementRatings[element]}
                      onChange={(val) => handleElementRatingChange(element, val)}
                      hoverValue={hoverElementRatings[element]}
                      onHover={(val) =>
                        setHoverElementRatings((prev) => ({ ...prev, [element]: val }))
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Comment */}
          <div className={styles.section}>
            <div className={styles.textareaHeader}>
              <label className={styles.label} htmlFor="feedback-comment">
                反馈意见（可选）
              </label>
              <span
                className={`${styles.charCount} ${isNearLimit ? styles.charCountNear : ''} ${isAtLimit ? styles.charCountDanger : ''}`}
              >
                {charCount}/200
              </span>
            </div>
            <textarea
              id="feedback-comment"
              className={styles.textarea}
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 200))}
              placeholder="分享你的想法或建议..."
              rows={3}
              maxLength={200}
            />
          </div>

          {/* Actions */}
          <div className={styles.actions}>
            <Button variant="ghost" size="md" onClick={handleSkip}>
              暂时跳过
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleSubmit}
              loading={isSubmitting}
              disabled={overallRating === 0}
            >
              提交反馈
            </Button>
          </div>
        </div>
      </div>

      {/* Toast */}
      <Toast
        message={toastMessage}
        visible={toastVisible}
        onClose={handleToastClose}
        type={toastMessage.includes('失败') ? 'error' : 'success'}
        duration={2000}
      />
    </>
  )
}
