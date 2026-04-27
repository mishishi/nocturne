import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useDreamStore, DREAM_TAGS } from '../hooks/useDreamStore'
import { useVoiceWaveform } from '../hooks/useVoiceWaveform'
import { api } from '../services/api'
import { Button } from '../components/ui/Button'
import { Textarea } from '../components/ui/Textarea'
import { Breadcrumb } from '../components/Breadcrumb'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import styles from './Dream.module.css'

// Web Speech API types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
  isFinal: boolean
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface ISpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: Event) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
}

declare global {
  interface Window {
    SpeechRecognition: new () => ISpeechRecognition
    webkitSpeechRecognition: new () => ISpeechRecognition
  }
}

const DRAFT_KEY = 'yeelin_draft'

// Dream elements for quick selection
const DREAM_ELEMENTS = [
  { id: 'person', icon: '👤', label: '人物' },
  { id: 'animal', icon: '🐾', label: '动物' },
  { id: 'food', icon: '🍜', label: '食物' },
  { id: 'water', icon: '🌊', label: '水' },
  { id: 'sky', icon: '☁️', label: '天空' },
  { id: 'building', icon: '🏛️', label: '建筑' },
  { id: 'flying', icon: '✈️', label: '飞行' },
  { id: 'falling', icon: '⬇️', label: '坠落' },
  { id: 'chase', icon: '🏃', label: '追逐' },
  { id: 'vehicle', icon: '🚗', label: '车辆' },
  { id: 'forest', icon: '🌲', label: '森林' },
  { id: 'beach', icon: '🏖️', label: '海滩' }
]

type DreamStep = 'emotion' | 'emotionTransition' | 'describe' | 'elements' | 'submitting'

export function Dream() {
  const navigate = useNavigate()
  const { currentSession, setSessionId, setOpenid, setDreamText, setQuestions, setStatus, setDreamElements } = useDreamStore()

  const [step, setStep] = useState<DreamStep>('emotion')
  const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null)
  const [transitionEmotion, setTransitionEmotion] = useState<string | null>(null)
  const [dreamElements, setDreamElementsLocal] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isNetworkError, setIsNetworkError] = useState(false)
  const [draftRestored, setDraftRestored] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isSrSupported, setIsSrSupported] = useState(false)
  const [interimTranscript, setInterimTranscript] = useState('')
  const [pendingTranscript, setPendingTranscript] = useState('')
  const [showTranscriptConfirm, setShowTranscriptConfirm] = useState(false)
  const lastSavedRef = useRef<string>(currentSession.dreamText)
  const recognitionRef = useRef<ISpeechRecognition | null>(null)
  const finalTranscriptRef = useRef<string>('')
  const { startWaveform, stopWaveform, canvasRef } = useVoiceWaveform()
  const [searchParams] = useSearchParams()

  // Check if this is a new dream request - clear old draft if so
  useEffect(() => {
    if (searchParams.get('new') === '1') {
      localStorage.removeItem(DRAFT_KEY)
      // Reset step to emotion for new dream
      setStep('emotion')
      setSelectedEmotion(null)
      setTransitionEmotion(null)
      setDreamElementsLocal([])
      setError('')
      setIsNetworkError(false)
      // Also reset store's dreamText to avoid showing old content
      setDreamText('')
    }
  }, []) // Run once on mount

  // Restore draft on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem(DRAFT_KEY)
    if (savedDraft && !draftRestored) {
      setDreamText(savedDraft)
      setDraftRestored(true)
      // If we have draft, skip to describe step
      if (savedDraft.length > 10) {
        setStep('describe')
      }
    }
  }, [draftRestored, setDreamText])

  // Auto-save draft (debounced: save 2s after user stops typing)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const currentText = useDreamStore.getState().currentSession.dreamText
      if (currentText && currentText !== lastSavedRef.current) {
        localStorage.setItem(DRAFT_KEY, currentText)
        lastSavedRef.current = currentText
      }
    }, 2000)

    const saveOnUnmount = () => {
      const currentText = useDreamStore.getState().currentSession.dreamText
      if (currentText && currentText !== lastSavedRef.current) {
        localStorage.setItem(DRAFT_KEY, currentText)
      }
    }

    window.addEventListener('beforeunload', saveOnUnmount)
    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener('beforeunload', saveOnUnmount)
      saveOnUnmount()
    }
  }, [currentSession.dreamText])

  // Speech recognition setup
  useEffect(() => {
    const SRConstructor = window.SpeechRecognition || (window as unknown as { webkitSpeechRecognition: new () => ISpeechRecognition }).webkitSpeechRecognition
    if (SRConstructor) {
      setIsSrSupported(true)

      const recognition = new SRConstructor()
      recognition.lang = 'zh-CN'
      recognition.continuous = true
      recognition.interimResults = true

      recognition.onresult = (event) => {
        // Only use final results to avoid duplicates from interim results
        let finalTranscript = ''
        let interimTranscript = ''

        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i]
          if (result.isFinal) {
            finalTranscript += result[0].transcript
          } else {
            interimTranscript += result[0].transcript
          }
        }

        // Update final transcript ref and state
        if (finalTranscript) {
          finalTranscriptRef.current += finalTranscript
          setPendingTranscript(finalTranscript)
          setShowTranscriptConfirm(true)
          setInterimTranscript('') // Clear interim when we get final
        } else if (interimTranscript) {
          // Show interim results separately so user can see what's being heard
          setInterimTranscript(interimTranscript)
        }
      }

      recognition.onerror = (event) => {
        setIsRecording(false)
        // Show error feedback
        const errorEvent = event as unknown as { error?: string }
        if (errorEvent.error === 'not-allowed') {
          setError('请允许麦克风权限以使用语音输入')
        } else if (errorEvent.error === 'no-speech') {
          setError('未检测到语音，请重试')
        }
      }

      recognition.onend = () => {
        setIsRecording(false)
        setInterimTranscript('') // Clear interim when recording ends
      }

      recognitionRef.current = recognition
    }
  }, [setDreamText])

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY)
    lastSavedRef.current = ''
  }

  const handleStartRecording = async () => {
    if (recognitionRef.current && !isRecording) {
      finalTranscriptRef.current = currentSession.dreamText // Preserve existing text
      try {
        // Start waveform visualization
        await startWaveform()
        recognitionRef.current.start()
        setIsRecording(true)
        setError('') // Clear any previous errors
      } catch {
        stopWaveform()
        setError('无法启动语音识别，请刷新页面重试')
      }
    }
  }

  const handleStopRecording = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop()
      stopWaveform()
      setIsRecording(false)
    }
  }

  const handleConfirmTranscript = () => {
    setDreamText(finalTranscriptRef.current)
    setPendingTranscript('')
    setShowTranscriptConfirm(false)
  }

  const handleCancelTranscript = () => {
    // Keep existing text, discard pending transcript
    finalTranscriptRef.current = currentSession.dreamText
    setPendingTranscript('')
    setShowTranscriptConfirm(false)
  }

  const handleEmotionSelect = (emotionId: string) => {
    setSelectedEmotion(emotionId)
  }

  const handleEmotionNext = () => {
    if (selectedEmotion) {
      const tag = DREAM_TAGS.find(t => t.id === selectedEmotion)
      setTransitionEmotion(tag?.label || selectedEmotion)
      setStep('emotionTransition')
      // After transition animation, go to describe
      setTimeout(() => {
        setStep('describe')
      }, 1800)
    }
  }

  const handleSkipEmotion = () => {
    setStep('describe')
  }

  const handleElementsToggle = (elementId: string) => {
    setDreamElementsLocal(prev =>
      prev.includes(elementId)
        ? prev.filter(id => id !== elementId)
        : [...prev, elementId]
    )
  }

  const handleSubmit = async () => {
    if (!currentSession.dreamText.trim()) {
      setError('请描述你记得的梦境片段')
      return
    }

    if (currentSession.dreamText.length < 10) {
      setError('梦境片段太短了，请多描述一些细节')
      return
    }

    setLoading(true)
    setError('')
    setStep('submitting')

    try {
      const openid = localStorage.getItem('yeelin_openid') || `web_${Date.now()}`
      localStorage.setItem('yeelin_openid', openid)

      const { sessionId } = await api.createSession(openid)
      setSessionId(sessionId)
      setOpenid(openid)

      // Store elements in session
      setDreamElements(dreamElements)

      const { questions } = await api.submitDream(sessionId, currentSession.dreamText)
      clearDraft()
      setQuestions(questions)
      setStatus('questions')
      navigate('/questions')
    } catch (err) {
      setStep('elements')
      const error = err as { response?: { data?: { error?: string } }; message?: string }
      const isNetError = error.message?.includes('network') || error.message?.includes('fetch')
      setIsNetworkError(isNetError)
      if (error.response?.data?.error) {
        setError(error.response.data.error)
      } else if (isNetError) {
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

        {/* Step Indicator */}
        <div
          className={styles.stepIndicator}
          role="progressbar"
          aria-valuenow={step === 'emotion' || step === 'emotionTransition' ? 1 : step === 'describe' ? 2 : step === 'elements' || step === 'submitting' ? 3 : 1}
          aria-valuemin={1}
          aria-valuemax={3}
          aria-label={`步骤 ${step === 'emotion' || step === 'emotionTransition' ? 1 : step === 'describe' ? 2 : step === 'elements' || step === 'submitting' ? 3 : 1}，共3步`}
        >
          <div className={`${styles.stepDot} ${step === 'emotion' || step === 'emotionTransition' ? styles.active : ''} ${['describe', 'elements', 'submitting'].includes(step) ? styles.completed : ''}`}>
            {['describe', 'elements', 'submitting'].includes(step) ? '✓' : '1'}
          </div>
          <div className={`${styles.stepLine} ${['describe', 'elements', 'submitting'].includes(step) ? styles.completed : ''}`} />
          <div className={`${styles.stepDot} ${step === 'describe' ? styles.active : ''} ${['elements', 'submitting'].includes(step) ? styles.completed : ''}`}>
            {['elements', 'submitting'].includes(step) ? '✓' : '2'}
          </div>
          <div className={`${styles.stepLine} ${['elements', 'submitting'].includes(step) ? styles.completed : ''}`} />
          <div className={`${styles.stepDot} ${step === 'elements' ? styles.active : ''} ${step === 'submitting' ? styles.completed : ''}`}>
            {step === 'submitting' ? '✓' : '3'}
          </div>
        </div>

        {/* Step 1: Emotion Selection */}
        {step === 'emotion' && (
          <div className={styles.stepContent}>
            <div className={styles.stepHeader}>
              <h1 className={styles.title}>昨晚的梦，你感觉如何？</h1>
              <p className={styles.subtitle}>选择最接近的情绪标签</p>
            </div>

            <div className={styles.emotionGrid}>
              {DREAM_TAGS.map((tag, index) => (
                <button
                  key={tag.id}
                  className={`${styles.emotionCard} ${selectedEmotion === tag.id ? styles.selected : ''}`}
                  onClick={() => handleEmotionSelect(tag.id)}
                  style={{
                    '--tag-color': tag.color,
                    animationDelay: `${index * 0.05}s`
                  } as React.CSSProperties}
                >
                  <span className={styles.emotionIcon}>{tag.icon}</span>
                  <span className={styles.emotionLabel}>{tag.label}</span>
                </button>
              ))}
            </div>

            <div className={styles.stepActions}>
              <Button
                onClick={handleEmotionNext}
                size="lg"
                disabled={!selectedEmotion}
                className={styles.nextBtn}
              >
                继续
              </Button>
              <button className={styles.skipBtn} onClick={handleSkipEmotion}>
                直接描述 →
              </button>
            </div>
          </div>
        )}

        {/* Emotion Transition - narrative between emotion and describe */}
        {step === 'emotionTransition' && transitionEmotion && (
          <div className={styles.transitionState}>
            <div className={styles.transitionMoon}>
              <div className={styles.moonGlow} />
              <div className={styles.moonCore} />
            </div>
            <p className={styles.transitionText}>
              你感受到了<span className={styles.transitionEmotion}>{transitionEmotion}</span>
            </p>
            <p className={styles.transitionHint}>正在打开记忆的画卷...</p>
          </div>
        )}

        {/* Step 2: Describe Dream */}
        {step === 'describe' && (
          <div className={styles.stepContent}>
            <div className={styles.stepHeader}>
              <h1 className={styles.title}>描述你记得的画面</h1>
              <p className={styles.subtitle}>场景、人物、颜色、声音，任何细节都好</p>
            </div>

            {/* Voice Input */}
            {isSrSupported && (
              <div className={styles.voiceSection}>
                <button
                  className={`${styles.voiceBtn} ${isRecording ? styles.recording : ''}`}
                  onClick={isRecording ? handleStopRecording : handleStartRecording}
                  aria-label={isRecording ? '停止语音输入' : '开始语音输入'}
                  aria-pressed={isRecording}
                >
                  <span className={styles.voiceIcon}>
                    {isRecording ? (
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <rect x="6" y="6" width="12" height="12" rx="2" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />
                      </svg>
                    )}
                  </span>
                  <span className={styles.voiceText}>
                    {isRecording ? (
                      <><span className={styles.stopIndicator} />点击停止</>
                    ) : '点击说话'}
                  </span>
                </button>
                <span className={`${styles.voiceHint} ${isRecording ? styles.recording : ''}`}>
                  {isRecording ? '正在聆听...' : '支持语音转文字'}
                </span>
                <canvas
                  ref={canvasRef}
                  className={`${styles.waveformCanvas} ${isRecording ? styles.active : ''}`}
                  width={280}
                  height={60}
                  aria-hidden="true"
                />
                {/* Live transcription display */}
                {isRecording && interimTranscript && (
                  <div className={styles.liveTranscript}>
                    <span className={styles.liveTranscriptLabel}>
                      <span className={styles.liveTranscriptDot} />
                      实时转写
                    </span>
                    <p className={styles.liveTranscriptText}>{interimTranscript}</p>
                  </div>
                )}
              </div>
            )}

            {/* Text Input */}
            <div className={styles.textSection}>
              <Textarea
                value={currentSession.dreamText}
                onChange={(e) => {
                  setDreamText(e.target.value)
                  setError('')
                  setIsNetworkError(false)
                }}
                placeholder="我梦到了...

比如：
• 在一条很长的走廊里走路
• 有个人在叫我，但我看不清是谁
• 天空是紫色的，有很多星星"
                error={error}
                showCount
                maxLength={2000}
                className={styles.textarea}
                aria-label="梦境描述"
              />
              {isNetworkError && error && (
                <div className={styles.errorBanner}>
                  <span className={styles.errorText}>{error}</span>
                  <button className={styles.retryBtn} onClick={handleSubmit}>
                    重试
                  </button>
                </div>
              )}
            </div>

            <div className={styles.stepActions}>
              <button className={styles.backBtn} onClick={() => setStep('emotion')}>
                ← 上一步
              </button>
              <Button
                onClick={() => setStep('elements')}
                size="lg"
                disabled={currentSession.dreamText.length < 10}
                className={styles.nextBtn}
              >
                下一步
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Quick Elements */}
        {step === 'elements' && (
          <div className={styles.stepContent}>
            <div className={styles.stepHeader}>
              <h1 className={styles.title}>梦里有这些吗？</h1>
              <p className={styles.subtitle}>快速勾选，帮助 AI 更好地理解</p>
            </div>

            <div className={styles.elementsGrid}>
              {DREAM_ELEMENTS.map((element, index) => (
                <button
                  key={element.id}
                  className={`${styles.elementCard} ${dreamElements.includes(element.id) ? styles.selected : ''}`}
                  onClick={() => handleElementsToggle(element.id)}
                  style={{ animationDelay: `${index * 0.03}s` }}
                >
                  <span className={styles.elementIcon}>{element.icon}</span>
                  <span className={styles.elementLabel}>{element.label}</span>
                </button>
              ))}
            </div>

            <div className={styles.stepActions}>
              <button className={styles.backBtn} onClick={() => setStep('describe')}>
                ← 上一步
              </button>
              <Button
                onClick={handleSubmit}
                size="lg"
                loading={loading}
                className={styles.nextBtn}
              >
                生成故事 →
              </Button>
            </div>
          </div>
        )}

        {/* Submitting State */}
        {step === 'submitting' && (
          <div className={styles.submittingState}>
            <div className={styles.submittingMoon}>
              <div className={styles.moonGlow} />
              <div className={styles.moonCore} />
            </div>
            <p className={styles.submittingText}>正在编织你的梦境...</p>
          </div>
        )}

        {/* Decorative elements */}
        <div className={styles.decorStars}>
          {[...Array(6)].map((_, i) => (
            <span
              key={i}
              className={styles.star}
              style={{
                left: `${15 + Math.random() * 70}%`,
                top: `${10 + Math.random() * 60}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 2}s`
              }}
            />
          ))}
        </div>

        {/* Voice Transcript Confirmation */}
        <ConfirmModal
          isOpen={showTranscriptConfirm}
          title="添加语音内容"
          message={pendingTranscript.length > 100
            ? `"${pendingTranscript.slice(0, 100)}..."`
            : `"${pendingTranscript}"`}
          confirmText="添加到文本"
          cancelText="取消"
          onConfirm={handleConfirmTranscript}
          onCancel={handleCancelTranscript}
        />
      </div>
    </div>
  )
}
