import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { TypewriterText } from '../components/ui/TypewriterText'
import { RevealScreen } from '../components/RevealScreen'
import styles from './DemoExperience.module.css'

// Preset demo data
const DEMO_DREAM = '我梦见自己在一片无尽的星空下奔跑，身后有什么在追我。我跑过一片发光的湖泊，水面倒映着陌生的星座。突然我来到一座古老的石桥，桥头站着一个看不清面容的人影……'

const DEMO_QUESTIONS = [
  '追逐你的事物，给你什么感觉？是恐惧、好奇还是别的？',
  '那片发光的湖泊，你之前见过吗？',
  '石桥头的人影，你想对他说什么？'
]

const DEMO_ANSWERS = [
  '一种说不清的紧迫感，像是有什么重要的东西我快要失去了。',
  '好像梦里有见过，但不记得是什么时候。',
  '我想问他，他是不是在等我很久了。'
]

const DEMO_STORY_TITLE = '星空下的逃亡者'

type Phase = 'dream' | 'questions' | 'reveal' | 'complete'

export function DemoExperience() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState<Phase>('dream')
  const [questionIndex, setQuestionIndex] = useState(0)
  const [showQuestion, setShowQuestion] = useState(false)
  const [showAnswer, setShowAnswer] = useState(false)
  const [answerDone, setAnswerDone] = useState(false)
  const [showReveal, setShowReveal] = useState(false)
  const [storyReady, setStoryReady] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  useEffect(() => {
    return () => clearTimer()
  }, [])

  // Phase: dream -> questions
  useEffect(() => {
    if (phase !== 'dream') return
    timerRef.current = setTimeout(() => {
      setPhase('questions')
    }, 4000)
  }, [phase])

  // Auto-advance through questions
  useEffect(() => {
    if (phase !== 'questions') return

    if (questionIndex === 0) {
      // Show first question after a short delay
      timerRef.current = setTimeout(() => {
        setShowQuestion(true)
      }, 800)
    }
  }, [phase, questionIndex])

  // Auto-fill answer after question appears
  useEffect(() => {
    if (!showQuestion || phase !== 'questions') return
    timerRef.current = setTimeout(() => {
      setShowAnswer(true)
    }, 1800)
  }, [showQuestion, phase, questionIndex])

  // Move to next question or reveal after answer
  useEffect(() => {
    if (!showAnswer || phase !== 'questions') return
    timerRef.current = setTimeout(() => {
      setAnswerDone(true)
      setShowAnswer(false)
    }, 1500)
  }, [showAnswer, phase])

  // After answer done, move to next question or reveal
  useEffect(() => {
    if (!answerDone || phase !== 'questions') return
    timerRef.current = setTimeout(() => {
      setAnswerDone(false)
      if (questionIndex < DEMO_QUESTIONS.length - 1) {
        setQuestionIndex(prev => prev + 1)
        setShowQuestion(false)
      } else {
        // All questions done -> reveal
        setPhase('reveal')
        setShowReveal(true)
        // Simulate story being "ready" after a short delay
        timerRef.current = setTimeout(() => {
          setStoryReady(true)
        }, 2000)
      }
    }, 800)
  }, [answerDone, phase, questionIndex])

  const handleReveal = () => {
    setShowReveal(false)
    setPhase('complete')
  }

  const handleStartReal = () => {
    // Mark onboarding as seen (it's a demo, user has seen the experience)
    localStorage.setItem('yeelin_onboarding_shown', 'true')
    navigate('/dream')
  }

  return (
    <div className={styles.page}>
      {/* Reveal ceremony */}
      {showReveal && (
        <RevealScreen
          storyTitle={DEMO_STORY_TITLE}
          storyReady={storyReady}
          onReveal={handleReveal}
        />
      )}

      <div className={styles.container}>
        {/* Phase indicator */}
        <div className={styles.phaseIndicator}>
          {phase === 'dream' && <span className={styles.phaseTag}>示例体验</span>}
          {phase === 'questions' && <span className={styles.phaseTag}>示例体验 · 追问</span>}
          {phase === 'complete' && <span className={styles.phaseTag}>示例体验</span>}
        </div>

        {/* Phase: Dream input */}
        {phase === 'dream' && (
          <div className={styles.dreamPhase}>
            <div className={styles.dreamIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
              </svg>
            </div>
            <h1 className={styles.dreamTitle}>梦境片段</h1>
            <div className={styles.dreamCard}>
              <p className={styles.dreamText}>
                <TypewriterText text={DEMO_DREAM} speed={30} />
              </p>
            </div>
            <p className={styles.dreamHint}>正在提取梦境元素...</p>
            <div className={styles.loadingDots}>
              <span /><span /><span />
            </div>
          </div>
        )}

        {/* Phase: Questions */}
        {phase === 'questions' && (
          <div className={styles.questionsPhase}>
            {/* Progress */}
            <div className={styles.progress}>
              <div className={styles.progressDots}>
                {DEMO_QUESTIONS.map((_, idx) => (
                  <div
                    key={idx}
                    className={`${styles.dot} ${idx === questionIndex ? styles.active : ''} ${idx < questionIndex ? styles.completed : ''}`}
                  />
                ))}
              </div>
              <span className={styles.progressText}>
                追问 {questionIndex + 1} / 共 {DEMO_QUESTIONS.length} 题
              </span>
            </div>

            {/* Chat */}
            <div className={styles.chatContainer}>
              {/* Previous answers */}
              {questionIndex > 0 && (
                <div className={styles.previousAnswers}>
                  {DEMO_ANSWERS.slice(0, questionIndex).map((ans, idx) => (
                    <div key={idx} className={styles.answerItem}>
                      <span className={styles.answerNum}>{idx + 1}</span>
                      <p className={styles.answerText}>{ans}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Current question bubble */}
              <div className={styles.chatBubble}>
                <div className={styles.aiHeader}>
                  <div className={styles.aiAvatar}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                    </svg>
                  </div>
                  <div className={styles.aiInfo}>
                    <span className={styles.aiLabel}>梦境伙伴</span>
                    <span className={styles.aiContext}>
                      {questionIndex === 0 ? '想更好地了解你的梦' : '继续说说看'}
                    </span>
                  </div>
                </div>
                <div className={styles.questionContent}>
                  <p className={styles.questionTag}>追问 {questionIndex + 1}</p>
                  <h2 className={styles.questionText}>
                    {showQuestion ? (
                      <TypewriterText text={DEMO_QUESTIONS[questionIndex]} speed={25} />
                    ) : (
                      DEMO_QUESTIONS[questionIndex]
                    )}
                  </h2>
                </div>
              </div>

              {/* Demo answer auto-appear */}
              {showAnswer && (
                <div className={styles.demoAnswer}>
                  <div className={styles.demoAnswerBubble}>
                    <span className={styles.demoAnswerIcon}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </span>
                    <p className={styles.demoAnswerText}>
                      <TypewriterText text={DEMO_ANSWERS[questionIndex]} speed={40} />
                    </p>
                  </div>
                </div>
              )}

              {/* Answer submitted indicator */}
              {answerDone && (
                <div className={styles.answerSubmitted}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  已记录
                </div>
              )}
            </div>
          </div>
        )}

        {/* Phase: Complete */}
        {phase === 'complete' && (
          <div className={styles.completePhase}>
            <div className={styles.completeIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
              </svg>
            </div>
            <h1 className={styles.completeTitle}>这就是夜棂为你编织的梦</h1>
            <p className={styles.completeStoryTitle}>{DEMO_STORY_TITLE}</p>
            <p className={styles.completeDesc}>
              每一个梦都是独特的。现在，开始记录你真实的梦境片段，让我为你编织只属于你的故事。
            </p>
            <div className={styles.completeActions}>
              <Button onClick={handleStartReal} size="lg" className={styles.ctaBtn}>
                开始你的真实梦境记录
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18, marginLeft: 8 }}>
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Button>
              <button
                className={styles.guestBtn}
                onClick={() => {
                  localStorage.setItem('yeelin_onboarding_shown', 'true')
                  navigate('/')
                }}
              >
                先行浏览
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
