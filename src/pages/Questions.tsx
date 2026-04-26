import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDreamStore } from '../hooks/useDreamStore'
import { api } from '../services/api'
import { Button } from '../components/ui/Button'
import { Textarea } from '../components/ui/Textarea'
import { Toast } from '../components/ui/Toast'
import { TypewriterText } from '../components/ui/TypewriterText'
import styles from './Questions.module.css'

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

  const { questions, answers, currentQuestionIndex, sessionId } = currentSession

  const currentQuestion = questions[currentQuestionIndex]
  const isFirstQuestion = currentQuestionIndex === 0
  const isLastQuestion = currentQuestionIndex === questions.length - 1

  const handleNext = async () => {
    if (!currentAnswer.trim()) return

    setLoading(true)
    setError('')

    // Timeout warning after 30 seconds
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
        navigate('/story')
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
      setLoading(false)
    }
  }

  const handlePrev = () => {
    if (!isFirstQuestion) {
      const prevAnswer = answers[currentQuestionIndex - 1] || ''
      setCurrentAnswer(prevAnswer === '（未回答）' ? '' : prevAnswer)
      prevQuestion()
    }
  }

  const handleSkip = () => {
    setAnswer(currentQuestionIndex, '（未回答）')
    setCurrentAnswer('')
    if (isLastQuestion) {
      // Skip to story generation
      handleFinalSubmit()
    } else {
      nextQuestion()
    }
  }

  const handleFinalSubmit = async () => {
    setLoading(true)
    setError('')

    // Timeout warning after 30 seconds
    const timeoutId = setTimeout(() => {
      setToastType('info')
      setToastMessage('生成中，请稍候...')
      setToastVisible(true)
    }, 30000)

    try {
      const result = await api.submitAnswer(sessionId, '')
      clearTimeout(timeoutId)
      if (result.story) {
        setStory(result.story.title, result.story.content)
        navigate('/story')
      }
    } catch (err) {
      clearTimeout(timeoutId)
      const errorMsg = '生成故事失败了，请稍后重试'
      setError(errorMsg)
      setHasFailed(true)
      setToastType('error')
      setToastMessage(errorMsg)
      setToastVisible(true)
    } finally {
      setLoading(false)
    }
  }

  // Retry story generation after failure
  const handleRetry = () => {
    setHasFailed(false)
    setError('')
    handleFinalSubmit()
  }

  if (!currentQuestion) {
    navigate('/dream')
    return null
  }

  const answeredCount = answers.filter(a => a && a.trim() !== '' && a !== '（未回答）').length

  // Ceremonial loading for story generation
  const isGeneratingStory = loading && isLastQuestion

  return (
    <div className={styles.page}>
      {isGeneratingStory && (
        <div className={styles.loadingOverlay} role="status" aria-live="polite" aria-label="正在编织你的梦境，请稍候">
          <div className={styles.loadingContent}>
            {/* Moon with quill animation */}
            <div className={styles.loadingMoon}>
              <svg viewBox="0 0 100 100" fill="none">
                {/* Moon crescent */}
                <path
                  d="M70 50c0 16.57-10.17 30.62-24.43 36.35-3.17 1.27-6.77 1.95-10.57 1.95-14.36 0-26-11.64-26-26s11.64-26 26-26c3.8 0 7.4.68 10.57 1.95C59.83 19.38 70 33.43 70 50z"
                  fill="url(#moonGradient)"
                  className={styles.moonPath}
                />
                <defs>
                  <linearGradient id="moonGradient" x1="30" y1="20" x2="70" y2="80">
                    <stop offset="0%" stopColor="#F4D35E" />
                    <stop offset="100%" stopColor="#E8C547" />
                  </linearGradient>
                </defs>
              </svg>
              {/* Quill pen */}
              <svg className={styles.quill} viewBox="0 0 40 60" fill="none">
                <path d="M20 0 C25 15 35 25 40 35 L35 38 C30 30 22 22 20 15 Z" fill="url(#quillGradient)" />
                <path d="M35 38 L30 60 L25 60 L32 40 Z" fill="#8B9DC3" />
                <defs>
                  <linearGradient id="quillGradient" x1="20" y1="0" x2="40" y2="40">
                    <stop offset="0%" stopColor="#E8E8E8" />
                    <stop offset="100%" stopColor="#B8B8B8" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            {/* Stars */}
            <div className={styles.loadingStars}>
              <span className={styles.star} style={{ animationDelay: '0s' }} />
              <span className={styles.star} style={{ animationDelay: '0.3s' }} />
              <span className={styles.star} style={{ animationDelay: '0.6s' }} />
              <span className={styles.star} style={{ animationDelay: '0.9s' }} />
              <span className={styles.star} style={{ animationDelay: '1.2s' }} />
            </div>
            <p className={styles.loadingText}>
              <TypewriterText text="正在编织你的梦境" speed={80} delay={300} />
            </p>
            <p className={styles.loadingSubtext}>请稍候...</p>
          </div>
        </div>
      )}

      <div className={styles.container}>
        {/* Back button */}
        <button className={styles.backBtn} onClick={() => navigate('/dream')} aria-label="返回上一步">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          <span>返回</span>
        </button>

        {/* Progress */}
        <div className={styles.progress}>
          <div className={styles.progressDots}>
            {questions.map((_, idx) => (
              <div
                key={idx}
                className={`${styles.dot} ${idx === currentQuestionIndex ? styles.active : ''} ${idx < currentQuestionIndex ? styles.completed : ''}`}
              />
            ))}
          </div>
          <span className={styles.progressText}>
            追问 {currentQuestionIndex + 1} / 共 {questions.length} 题
          </span>
        </div>

        {/* Question Card */}
        <div className={styles.questionCard}>
          <p className={styles.questionNumber}>追问 {currentQuestionIndex + 1}</p>
          <h2 className={styles.questionText}>{currentQuestion}</h2>
        </div>

        {/* Previous Answers */}
        {answeredCount > 0 && (
          <div className={styles.previousAnswers}>
            <div className={styles.previousHeader}>
              <svg className={styles.previousIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className={styles.previousTitle}>已回答</p>
            </div>
            <div className={styles.answersList}>
              {answers.map((answer, index) => (
                answer && answer.trim() !== '' && answer !== '（未回答）' && index < currentQuestionIndex && (
                  <div key={index} className={styles.answerItem}>
                    <span className={styles.answerNum}>{index + 1}</span>
                    <p className={styles.answerText}>{answer}</p>
                  </div>
                )
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className={styles.inputSection}>
          <Textarea
            value={currentAnswer}
            onChange={(e) => {
              setCurrentAnswer(e.target.value)
              setError('')
            }}
            placeholder="描述你记得的细节..."
            className={styles.textarea}
            error={error}
            autoFocus={!isGeneratingStory}
            showCount
            maxLength={500}
          />

          {/* Retry button on story generation failure */}
          {hasFailed && isLastQuestion && (
            <div className={styles.retrySection}>
              <Button
                onClick={handleRetry}
                size="lg"
                className={styles.retryBtn}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}>
                  <path d="M1 4v6h6M23 20v-6h-6" />
                  <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
                </svg>
                重试生成故事
              </Button>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <div className={styles.navButtons}>
            {!isFirstQuestion && (
              <Button
                variant="secondary"
                onClick={handlePrev}
                className={styles.prevBtn}
                disabled={loading}
              >
                上一题
              </Button>
            )}
            <Button
              onClick={handleNext}
              loading={loading && !isLastQuestion}
              disabled={!currentAnswer.trim() || isGeneratingStory}
              size="lg"
            >
              {isLastQuestion ? '生成故事' : '下一题'}
            </Button>
          </div>

          <div className={styles.secondaryActions}>
            <Button variant="ghost" onClick={handleSkip} className={styles.skipBtn} disabled={isGeneratingStory} aria-label={isLastQuestion ? '跳过直接生成' : '跳过此题'}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
              {isLastQuestion ? '跳过直接生成' : '跳过此题'}
            </Button>
          </div>
        </div>
      </div>

      <Toast message={toastMessage} visible={toastVisible} onClose={() => setToastVisible(false)} type={toastType} />
    </div>
  )
}
