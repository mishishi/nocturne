import { useState, useEffect } from 'react'
import { Button } from './Button'
import styles from './OnboardingOverlay.module.css'

const ONBOARDING_KEY = 'yeelin_onboarding_shown'

const TIPS = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
      </svg>
    ),
    title: '捕捉梦境碎片',
    description: '醒来后第一时间记录，能记住更多细节'
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
    ),
    title: '细节越多越好',
    description: '场景、人物、颜色、声音、情绪都是线索'
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
    title: '探索你的故事',
    description: 'AI 会根据你的梦境生成独特的故事'
  }
]

const EXAMPLE_DREAM = `我站在一片很大的稻田里，天是深蓝色的，星星很亮。有个小孩跑过我身边，笑得很开心，但我看不清他的脸。我想叫住他，但发不出声音。风从远处吹来，带着一股熟悉的味道……然后我就醒了。`

interface OnboardingOverlayProps {
  onComplete: () => void
}

export function OnboardingOverlay({ onComplete }: OnboardingOverlayProps) {
  const [visible, setVisible] = useState(false)
  const [currentTip, setCurrentTip] = useState(0)

  useEffect(() => {
    // Check if onboarding has been shown before
    const hasSeenOnboarding = localStorage.getItem(ONBOARDING_KEY)
    if (!hasSeenOnboarding) {
      // Small delay for page to load
      const timer = setTimeout(() => setVisible(true), 500)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleDismiss = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true')
    setVisible(false)
    onComplete()
  }

  const handleNext = () => {
    if (currentTip < TIPS.length - 1) {
      setCurrentTip(currentTip + 1)
    } else {
      handleDismiss()
    }
  }

  const handleSkip = () => {
    handleDismiss()
  }

  if (!visible) return null

  return (
    <div className={styles.overlay}>
      <div className={styles.backdrop} />

      <div className={styles.card}>
        {/* Header */}
        <div className={styles.header}>
          <span className={styles.logo}>夜棂</span>
          <p className={styles.welcome}>欢迎来到你的梦境世界</p>
        </div>

        {/* Tips carousel */}
        <div className={styles.tipsSection}>
          <div className={styles.tipContent}>
            <div className={styles.tipIcon}>
              {TIPS[currentTip].icon}
            </div>
            <h3 className={styles.tipTitle}>{TIPS[currentTip].title}</h3>
            <p className={styles.tipDesc}>{TIPS[currentTip].description}</p>
          </div>

          {/* Dots */}
          <div className={styles.dots}>
            {TIPS.map((_, idx) => (
              <span
                key={idx}
                className={`${styles.dot} ${idx === currentTip ? styles.active : ''}`}
              />
            ))}
          </div>
        </div>

        {/* Example dream */}
        <div className={styles.exampleSection}>
          <p className={styles.exampleLabel}>比如这样的梦境：</p>
          <blockquote className={styles.exampleDream}>
            {EXAMPLE_DREAM}
          </blockquote>
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <button className={styles.skipBtn} onClick={handleSkip}>
            跳过
          </button>
          <Button onClick={handleNext} size="lg" className={styles.nextBtn}>
            {currentTip < TIPS.length - 1 ? '下一步' : '开始记录'}
          </Button>
        </div>
      </div>

      {/* Decorative elements */}
      <div className={styles.decorStars}>
        {[...Array(20)].map((_, i) => (
          <span
            key={i}
            className={styles.star}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 2}s`
            }}
          />
        ))}
      </div>
    </div>
  )
}
