import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from './Button'
import { DREAM_TAGS, EMOTION_ICONS } from '../../hooks/useDreamStore'
import styles from './OnboardingOverlay.module.css'

const ONBOARDING_KEY = 'yeelin_onboarding_shown'

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

    // Haptic on click (wrapped in try-catch for silent failure)
    try {
      if (navigator.vibrate) {
        navigator.vibrate(5)
      }
    } catch {
      // Silently ignore vibration errors
    }
    setPhase('cta')

    // Reset guard after a short delay
    setTimeout(() => {
      isTransitioningRef.current = false
    }, 1000)
  }

  const handleStartRecording = () => {
    try {
      if (navigator.vibrate) {
        navigator.vibrate(10)
      }
    } catch {
      // Silently ignore vibration errors
    }
    handleDismiss()
    navigate('/demo')
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

          {/* Skip button */}
          <button className={styles.skipHint} onClick={handleDismiss}>
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
            {DREAM_TAGS.map((tag, i) => (
              <span
                key={tag.id}
                className={styles.emotionTag}
                style={{
                  animationDelay: `${0.1 + i * 0.05}s`,
                  '--tag-color': tag.color
                } as React.CSSProperties}
              >
                <span className={styles.emotionTagIcon}>
                  {EMOTION_ICONS[tag.icon]}
                </span>
                <span className={styles.emotionTagLabel}>{tag.label}</span>
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
