import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { openidService } from '../services/openidService'
import { AchievementIcon } from '../hooks/useDreamStore'
import styles from './QuickRecord.module.css'

// Emotion to iconKey mapping
const EMOTION_ICONS: Record<string, string> = {
  peaceful: 'sun',
  excited: 'bolt',
  anxious: 'wind',
  scared: 'moon',
  sad: 'cloud',
  joyful: 'sparkle',
  confused: 'wind',
  nostalgic: 'heart',
}

const EMOTIONS = [
  { id: 'peaceful', label: '平静' },
  { id: 'excited', label: '兴奋' },
  { id: 'anxious', label: '焦虑' },
  { id: 'scared', label: '恐惧' },
  { id: 'sad', label: '悲伤' },
  { id: 'joyful', label: '喜悦' },
  { id: 'confused', label: '困惑' },
  { id: 'nostalgic', label: '怀念' },
]

export function QuickRecord() {
  const navigate = useNavigate()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [dreamText, setDreamText] = useState('')
  const [selectedEmotion, setSelectedEmotion] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!dreamText.trim()) {
      setError('请描述你记得的梦境片段')
      return
    }

    if (dreamText.length < 10) {
      setError('梦境片段太短了，请多描述一些细节')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const openid = openidService.getOrCreate()

      const result = await api.createSession(openid)
      if (!result.success) throw new Error('创建会话失败')
      const sessionId = result.data?.sessionId
      if (!sessionId) throw new Error('创建会话失败')

      const submitResult = await api.submitDream(sessionId, dreamText.trim(), selectedEmotion)
      if (!submitResult.success) throw new Error('获取问题失败')
      const questions = submitResult.data?.questions
      if (!questions) throw new Error('获取问题失败')

      navigate('/questions', { state: { sessionId } })
    } catch (err) {
      const error = err as { message?: string }
      if (error.message?.includes('network') || error.message?.includes('fetch')) {
        setError('网络连接失败，请检查网络后重试')
      } else {
        setError('发送失败了，请稍后重试')
      }
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }

  if (isLoading) {
    return (
      <div className={styles.loadingOverlay}>
        <div className={styles.spinner} />
        <span className={styles.loadingText}>正在穿越梦境...</span>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <AchievementIcon iconKey="sparkle" className={styles.crownIcon} />
          <h1 className={styles.title}>快速记录</h1>
          <p className={styles.subtitle}>描述你记得的梦境片段，AI 将为你解梦</p>
        </header>

        <div className={styles.textareaWrapper}>
          <textarea
            ref={textareaRef}
            className={`${styles.textarea} ${error && !dreamText ? styles.hasError : ''}`}
            placeholder="昨晚我梦见了..."
            value={dreamText}
            onChange={e => {
              setDreamText(e.target.value)
              if (error) setError('')
            }}
            onKeyDown={handleKeyDown}
            autoFocus
            maxLength={2000}
          />

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.emotionRow}>
            {EMOTIONS.map(emotion => (
              <button
                key={emotion.id}
                type="button"
                className={`${styles.emotionBtn} ${selectedEmotion === emotion.id ? styles.selected : ''}`}
                onClick={() => setSelectedEmotion(prev => prev === emotion.id ? '' : emotion.id)}
              >
                <AchievementIcon iconKey={EMOTION_ICONS[emotion.id]} className={styles.emotionIcon} />
                <span>{emotion.label}</span>
              </button>
            ))}
          </div>

          <div className={styles.submitArea}>
            <button
              className={styles.submitBtn}
              onClick={handleSubmit}
              disabled={!dreamText.trim() || dreamText.length < 10}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 20, height: 20 }}>
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
              开始解梦
            </button>
            <p className={styles.charCount}>{dreamText.length}/2000</p>
          </div>
        </div>
      </div>
    </div>
  )
}
