import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDreamStore } from '../hooks/useDreamStore'
import { api } from '../services/api'
import { Button } from '../components/ui/Button'
import { Textarea } from '../components/ui/Textarea'
import { DreamFormSkeleton } from '../components/ui/Skeleton'
import { Breadcrumb } from '../components/Breadcrumb'
import styles from './Dream.module.css'

const DRAFT_KEY = 'yeelin_draft'

export function Dream() {
  const navigate = useNavigate()
  const { currentSession, setSessionId, setOpenid, setDreamText, setQuestions, setStatus } = useDreamStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [draftRestored, setDraftRestored] = useState(false)
  const lastSavedRef = useRef<string>(currentSession.dreamText)

  // Restore draft on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem(DRAFT_KEY)
    if (savedDraft && !draftRestored) {
      setDreamText(savedDraft)
      setDraftRestored(true)
    }
  }, [draftRestored, setDreamText])

  // Auto-save draft every 30 seconds
  useEffect(() => {
    const intervalId = setInterval(() => {
      const currentText = useDreamStore.getState().currentSession.dreamText
      if (currentText && currentText !== lastSavedRef.current) {
        localStorage.setItem(DRAFT_KEY, currentText)
        lastSavedRef.current = currentText
      }
    }, 30000)

    // Save on unmount
    const saveOnUnmount = () => {
      const currentText = useDreamStore.getState().currentSession.dreamText
      if (currentText && currentText !== lastSavedRef.current) {
        localStorage.setItem(DRAFT_KEY, currentText)
      }
    }

    window.addEventListener('beforeunload', saveOnUnmount)
    return () => {
      clearInterval(intervalId)
      window.removeEventListener('beforeunload', saveOnUnmount)
      saveOnUnmount()
    }
  }, [])

  // Clear draft when successfully submitting
  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY)
    lastSavedRef.current = ''
  }

  const handleSubmit = async () => {
    if (!currentSession.dreamText.trim()) {
      setError('请输入你记得的梦境片段')
      return
    }

    if (currentSession.dreamText.length < 10) {
      setError('梦境片段太短了，请多描述一些细节')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Create session first (use device ID as openid for web)
      const openid = localStorage.getItem('yeelin_openid') || `web_${Date.now()}`
      localStorage.setItem('yeelin_openid', openid)

      const { sessionId } = await api.createSession(openid)
      setSessionId(sessionId)
      setOpenid(openid)

      // Submit dream and get all questions
      const { questions } = await api.submitDream(sessionId, currentSession.dreamText)
      clearDraft()
      setQuestions(questions)
      setStatus('questions')
      navigate('/questions')
    } catch (err) {
      const error = err as { response?: { data?: { error?: string } }; message?: string }
      if (error.response?.data?.error) {
        setError(error.response.data.error)
      } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
        setError('网络连接失败，请检查网络后重试')
      } else {
        setError('发送失败了，请稍后重试')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { label: '首页', href: '/' },
            { label: '记录梦境' }
          ]}
        />

        {/* Header */}
        <div className={styles.header}>
          <button className={styles.backBtn} onClick={() => navigate('/')} aria-label="返回首页">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <span className={styles.step}>第一步</span>
          <h1 className={styles.title}>记录你的梦境</h1>
          <p className={styles.subtitle}>
            把你能记得的片段写下来——场景、人物、情绪，任何细节都好
          </p>
        </div>

        {/* Form or Loading Overlay */}
        {loading ? (
          <div className={styles.loadingOverlay} role="status" aria-live="polite" aria-label="正在发送梦境">
            <DreamFormSkeleton />
          </div>
        ) : (
          <div className={styles.form}>
            <Textarea
              value={currentSession.dreamText}
              onChange={(e) => {
                setDreamText(e.target.value)
                setError('')
              }}
              placeholder="我梦到了...

比如：
• 在一条很长的走廊里走路
• 有个人在叫我，但我看不清是谁
• 醒来的时候心里很难过"
              error={error}
              showCount
              maxLength={2000}
              className={styles.textarea}
              aria-describedby="dream-tips"
              aria-label="梦境描述"
            />

            <div className={styles.tips} id="dream-tips">
              <p className={styles.tipsTitle}>小提示</p>
              <ul className={styles.tipsList}>
                <li>即使是很模糊的片段也可以</li>
                <li>场景、人物、物品、颜色、声音都算</li>
                <li>醒来后第一时间记录效果最好</li>
              </ul>
            </div>

            <Button
              onClick={handleSubmit}
              loading={loading}
              size="lg"
              className={styles.submitBtn}
            >
              发送给夜棂
            </Button>
          </div>
        )}

        {/* Decorative moon */}
        <div className={styles.decorMoon}>
          <svg viewBox="0 0 100 100" fill="none">
            <circle cx="50" cy="50" r="40" fill="url(#moonGrad)" />
            <defs>
              <radialGradient id="moonGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#FFD666" />
                <stop offset="100%" stopColor="#F4D35E" />
              </radialGradient>
            </defs>
          </svg>
        </div>
      </div>
    </div>
  )
}
