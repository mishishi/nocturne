import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from './Button'
import styles from './OnboardingOverlay.module.css'

const ONBOARDING_KEY = 'yeelin_onboarding_shown'

// Emotion tags preview for onboarding
const EMOTION_TAGS = [
  { icon: '😌', label: '平静', color: '#64D8CB' },
  { icon: '⚔️', label: '冒险', color: '#F4A261' },
  { icon: '🔮', label: '神秘', color: '#9B7EBD' },
  { icon: '😱', label: '噩梦', color: '#E76F51' },
  { icon: '😊', label: '欢乐', color: '#F4D35E' },
  { icon: '✨', label: '奇幻', color: '#A8DADC' }
]

type OnboardingPhase = 'intro' | 'cta'

interface OnboardingOverlayProps {
  onComplete: () => void
}

export function OnboardingOverlay({ onComplete }: OnboardingOverlayProps) {
  const navigate = useNavigate()
  const [phase, setPhase] = useState<OnboardingPhase>('intro')
  const [showContent, setShowContent] = useState(false)
  const [moonPhase, setMoonPhase] = useState<' exhale' | 'inhale'>(' exhale')
  const [isVisible, setIsVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isTransitioningRef = useRef(false)

  // Breathing moon animation
  useEffect(() => {
    if (phase !== 'intro') return

    const breathInterval = setInterval(() => {
      setMoonPhase(prev => prev === ' exhale' ? 'inhale' : ' exhale')
    }, 2000)
    return () => clearInterval(breathInterval)
  }, [phase])

  // Removed values phase - now just intro → cta

  // Initial mount
  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem(ONBOARDING_KEY)
    if (!hasSeenOnboarding) {
      setIsVisible(true)
      const timer = setTimeout(() => {
        setShowContent(true)
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleDismiss = useCallback(() => {
    localStorage.setItem(ONBOARDING_KEY, 'true')
    setIsVisible(false)
    onComplete()
  }, [onComplete])

  const handleExplore = () => {
    if (isTransitioningRef.current) return
    isTransitioningRef.current = true

    // Haptic on click
    if (navigator.vibrate) {
      navigator.vibrate(5)
    }
    setPhase('cta')

    // Reset guard after a short delay
    setTimeout(() => {
      isTransitioningRef.current = false
    }, 1000)
  }

  const handleStartRecording = () => {
    if (navigator.vibrate) {
      navigator.vibrate(10)
    }
    handleDismiss()
    navigate('/dream')
  }

  const handleBack = () => {
    if (isTransitioningRef.current) return
    isTransitioningRef.current = true
    setPhase('intro')
    setTimeout(() => {
      isTransitioningRef.current = false
    }, 1000)
  }

  // Don't render if already seen
  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem(ONBOARDING_KEY)
    if (hasSeenOnboarding) {
      setIsVisible(false)
      onComplete()
    }
  }, [onComplete])

  // Don't render if not visible
  if (!isVisible) {
    return null
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.backdrop} />

      {/* Ambient glow */}
      <div className={styles.ambientGlow} />

      {/* Progress Dots */}
      <div className={styles.progressDots} aria-hidden="true">
        <div className={`${styles.progressDot} ${phase === 'intro' ? styles.active : ''}`} />
        <div className={`${styles.progressDot} ${phase === 'cta' ? styles.active : ''}`} />
      </div>

      {/* Phase: Intro - Brand Impact */}
      {phase === 'intro' && (
        <div className={`${styles.introPhase} ${showContent ? styles.visible : ''}`}>
          {/* Breathing Moon */}
          <div className={`${styles.moon} ${moonPhase === ' exhale' ? styles.exhale : styles.inhale}`}>
            <div className={styles.moonGlow} />
            <div className={styles.moonCore} />
          </div>

          {/* Brand */}
          <div className={styles.brand}>
            <span className={styles.logo}>夜棂</span>
            <p className={styles.tagline}>你昨晚做了什么梦？</p>
          </div>

          {/* CTA */}
          <Button onClick={handleExplore} size="lg" className={styles.exploreBtn}>
            开始探索
          </Button>

          {/* Skip hint */}
          <button className={styles.skipHint} onClick={() => {
            if (window.confirm('确定要跳过介绍吗？')) {
              handleDismiss()
            }
          }}>
            跳过
          </button>
        </div>
      )}

      {/* Phase: CTA */}
      {phase === 'cta' && (
        <div className={styles.ctaPhase}>
          <div className={styles.ctaIcon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
            </svg>
          </div>

          <p className={styles.ctaText}>用一个梦开始探索</p>
          <p className={styles.ctaSubtext}>记录梦，比记住更重要</p>

          <Button onClick={handleStartRecording} size="lg" className={styles.ctaBtn}>
            记录你的第一个梦
          </Button>

          {/* Emotion preview */}
          <div className={styles.emotionPreview}>
            {EMOTION_TAGS.map((tag, i) => (
              <span
                key={tag.label}
                className={styles.emotionTag}
                style={{
                  animationDelay: `${0.1 + i * 0.06}s`,
                  '--tag-color': tag.color
                } as React.CSSProperties}
              >
                {tag.icon}
              </span>
            ))}
          </div>

          {/* Back button */}
          <button className={styles.backBtn} onClick={handleBack} aria-label="返回">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            返回
          </button>
        </div>
      )}
    </div>
  )
}
