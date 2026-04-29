import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDreamStore } from '../hooks/useDreamStore'
import { api } from '../services/api'
import { Textarea } from '../components/ui/Textarea'
import { Toast } from '../components/ui/Toast'
import { RevealScreen } from '../components/RevealScreen'
import styles from './Questions.module.css'

// Prevent concurrent submissions
let isSubmittingRef = false

export function Questions() {
  const navigate = useNavigate()
  const { currentSession, setAnswer, nextQuestion, prevQuestion, setStory } = useDreamStore()
  const [currentAnswer, setCurrentAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hasFailed, setHasFailed] = useState(false)
  const [toastVisible, setToastVisible] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success')
  const [showInput, setShowInput] = useState(false)
  const [showReveal, setShowReveal] = useState(false)
  const [storyReady, setStoryReady] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { questions, answers, currentQuestionIndex, sessionId } = currentSession

  const currentQuestion = questions[currentQuestionIndex]
  const isFirstQuestion = currentQuestionIndex === 0
  const isLastQuestion = currentQuestionIndex === questions.length - 1

  // 计算已回答数量
  const answeredCount = answers.filter(a => a && a.trim() !== '' && a !== '（未回答）').length

  // 计算进度
  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0

  // AI persona context based on question type
  const getAIContext = () => {
    if (currentQuestionIndex === 0) return '想更好地了解你的梦'
    return '继续说说看'
  }

  const aiContext = getAIContext()

  // 触发输入框显示动画
  useEffect(() => {
    setShowInput(false)
    const timer = setTimeout(() => setShowInput(true), 500)
    return () => clearTimeout(timer)
  }, [currentQuestionIndex])

  const handleNext = async () => {
    if (isSubmittingRef || loading) return
    if (!currentAnswer.trim()) return

    if (currentQuestionIndex < 0 || currentQuestionIndex >= questions.length) {
      console.error('Invalid question index:', currentQuestionIndex)
      return
    }

    if (textareaRef.current) {
      textareaRef.current.blur()
    }

    isSubmittingRef = true
    setLoading(true)
    setError('')

    const timeoutId = setTimeout(() => {
      setToastType('info')
      setToastMessage('请求较慢，请稍候...')
      setToastVisible(true)
    }, 30000)

    try {
      setAnswer(currentQuestionIndex, currentAnswer)

      const result = await api.submitAnswer(sessionId, currentAnswer)
      clearTimeout(timeoutId)
      if (result.story) {
        setStory(result.story.title, result.story.content)
        setShowReveal(true)
        setLoading(false)
        return
      } else if (result.nextQuestion) {
        setAnswer(currentQuestionIndex + 1, '')
        nextQuestion()
        setCurrentAnswer('')
      }
    } catch (err) {
      clearTimeout(timeoutId)
      const errorMsg = '发送失败了，请稍后重试'
      setError(errorMsg)
      setToastType('error')
      setToastMessage(errorMsg)
      setToastVisible(true)
    } finally {
      if (!showReveal) {
        setLoading(false)
      }
      isSubmittingRef = false
    }
  }

  const handlePrev = () => {
    if (isFirstQuestion) return
    const prevAnswer = answers[currentQuestionIndex - 1] || ''
    setCurrentAnswer(prevAnswer === '（未回答）' ? '' : prevAnswer)
    prevQuestion()
  }

  const handleSkip = () => {
    setAnswer(currentQuestionIndex, '（未回答）')
    setCurrentAnswer('')
    if (isLastQuestion) {
      handleFinalSubmit()
    } else {
      nextQuestion()
    }
  }

  const handleFinalSubmit = async () => {
    if (isSubmittingRef || loading) return

    const allAnswers = [...answers]
    allAnswers[currentQuestionIndex] = currentAnswer

    const hasValidAnswer = allAnswers.some(a => a && a.trim() !== '' && a !== '（未回答）')
    if (!hasValidAnswer && currentQuestionIndex === questions.length - 1) {
      setToastType('error')
      setToastMessage('请至少回答一个问题，让我更好地为你编织梦境')
      setToastVisible(true)
      return
    }

    allAnswers.forEach((answer, idx) => {
      setAnswer(idx, answer || '')
    })

    setShowReveal(true)
    setLoading(true)
    setError('')
    isSubmittingRef = true

    let timeoutId = setTimeout(() => {
      setToastType('info')
      setToastMessage('生成中，请稍候...')
      setToastVisible(true)
    }, 30000)

    try {
      let currentIdx = currentQuestionIndex
      let result

      while (currentIdx < questions.length) {
        const answerToSubmit = allAnswers[currentIdx] || ''
        result = await api.submitAnswer(sessionId, answerToSubmit)
        clearTimeout(timeoutId)

        if (result.story) {
          setStory(result.story.title, result.story.content)
          setStoryReady(true)
          setLoading(false)
          return
        }

        currentIdx = result.nextIndex ?? currentIdx + 1

        timeoutId = setTimeout(() => {
          setToastType('info')
          setToastMessage('生成中，请稍候...')
          setToastVisible(true)
        }, 30000)
      }
    } catch (err) {
      clearTimeout(timeoutId)
      const errorMsg = '生成故事失败了，请稍后重试'
      setError(errorMsg)
      setHasFailed(true)
      setShowReveal(false)
      setLoading(false)
      setToastType('error')
      setToastMessage(errorMsg)
      setToastVisible(true)
    } finally {
      isSubmittingRef = false
    }
  }

  const handleReveal = () => {
    setLoading(false)
    setShowReveal(false)
    setStoryReady(false)
    navigate(`/story/${sessionId}`)
  }

  if (!currentQuestion) {
    navigate('/dream')
    return null
  }

  return (
    <div className={styles.page}>
      {showReveal && (
        <RevealScreen
          storyTitle={currentSession.storyTitle || '你的梦境'}
          storyReady={storyReady}
          onReveal={handleReveal}
        />
      )}

      <div className={styles.container}>
        {/* 顶部进度条 */}
        <div className={styles.progressSection}>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${progress}%` }} />
          </div>
          <div className={styles.progressInfo}>
            <span className={styles.progressText}>
              {isLastQuestion ? (
                <span className={styles.lastLabel}>最后一题 ✨</span>
              ) : (
                `追问 ${currentQuestionIndex + 1} / ${questions.length}`
              )}
            </span>
            <span className={styles.answeredCount}>已答 {answeredCount}</span>
          </div>
        </div>

        {/* 问题区域 */}
        <div className={styles.questionArea}>

          {/* 已完成答案 - 折叠显示 */}
          {currentQuestionIndex > 0 && (
            <div className={styles.completedSection}>
              {answers.map((answer, index) => {
                if (index >= currentQuestionIndex || !answer?.trim() || answer === '（未回答）') return null
                return (
                  <div key={index} className={styles.completedCard}>
                    <div className={styles.completedHeader}>
                      <span className={styles.completedNum}>追问 {index + 1}</span>
                      <svg className={styles.checkIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    </div>
                    <p className={styles.completedText}>{answer}</p>
                  </div>
                )
              })}
            </div>
          )}

          {/* 问题气泡 */}
          <div className={styles.questionBubble}>
            <div className={styles.aiHeader}>
              <div className={styles.aiAvatar}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                </svg>
              </div>
              <div className={styles.aiInfo}>
                <span className={styles.aiLabel}>梦境伙伴</span>
                <span className={styles.aiContext}>{aiContext}</span>
              </div>
            </div>

            <div className={styles.questionContent}>
              <span className={styles.questionTag}>追问 {currentQuestionIndex + 1}</span>
              <h2 className={styles.questionText}>
                {showInput ? currentQuestion : <span className={styles.placeholder}>...</span>}
              </h2>
            </div>

            <div className={styles.questionHint}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 8v4M12 16h.01" />
              </svg>
              说说看，越详细越好
            </div>
          </div>

          {/* 输入区域 - 紧跟问题 */}
          <div className={styles.inputArea}>
            <div className={styles.inputCard}>
              <Textarea
                ref={textareaRef}
                value={currentAnswer}
                onChange={(e) => {
                  setCurrentAnswer(e.target.value)
                  setError('')
                }}
                placeholder="仔细想想，把感受到的说出来……"
                className={styles.textarea}
                error={error}
                disabled={!showInput}
                showCount
                maxLength={500}
              />
            </div>

            {/* 失败重试提示 */}
            {hasFailed && isLastQuestion && (
              <div className={styles.retryHint}>
                故事生成失败，请稍后重试
              </div>
            )}

            {/* 操作按钮 */}
            <div className={styles.actions}>
              <button
                className={styles.skipBtn}
                onClick={handleSkip}
                disabled={loading || !showInput}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
                {isLastQuestion ? '跳过生成' : '跳过此题'}
              </button>

              <div className={styles.primaryActions}>
                {!isFirstQuestion && (
                  <button className={styles.prevBtn} onClick={handlePrev} disabled={loading}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                  </button>
                )}
                <button
                  className={styles.nextBtn}
                  onClick={isLastQuestion ? handleFinalSubmit : handleNext}
                  disabled={loading || (!isLastQuestion && !currentAnswer.trim()) || !showInput}
                >
                  {loading && !isLastQuestion ? (
                    <span className={styles.loadingText}>回忆中...</span>
                  ) : isLastQuestion ? '生成故事' : '下一题'}
                  {!loading && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 底部提示 */}
        <div className={styles.footer}>
          <p className={styles.tip}>✨ 回答越详细，故事越精彩</p>
        </div>
      </div>

      <Toast message={toastMessage} visible={toastVisible} onClose={() => setToastVisible(false)} type={toastType} />
    </div>
  )
}
