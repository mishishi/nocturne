import { useState, useEffect, useRef } from 'react'
import { TypewriterText } from './ui/TypewriterText'
import styles from './RevealScreen.module.css'

interface RevealScreenProps {
  storyTitle: string
  streamedContent?: string
  storyReady?: boolean
  onReveal: () => void
}

const MESSAGES = [
  '月光正在晕染故事...',
  '星辰开始闪烁...',
  '梦境正在浮现...',
  '故事即将揭晓...',
]

export function RevealScreen({ storyTitle, streamedContent, storyReady, onReveal }: RevealScreenProps) {
  const [phase, setPhase] = useState<'loading' | 'streaming' | 'ready' | 'countdown'>('loading')
  const [countdown, setCountdown] = useState(3)
  const [messageIndex, setMessageIndex] = useState(0)
  const contentRef = useRef<HTMLDivElement>(null)

  // Cycle through messages during loading
  useEffect(() => {
    if (phase !== 'loading') return
    const interval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % MESSAGES.length)
    }, 1500)
    return () => clearInterval(interval)
  }, [phase])

  // Transition to streaming phase when we receive content
  useEffect(() => {
    if (streamedContent && phase === 'loading') {
      setPhase('streaming')
    }
  }, [streamedContent, phase])

  // Auto-scroll to bottom when streaming new content
  useEffect(() => {
    if (phase === 'streaming' && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight
    }
  }, [streamedContent, phase])

  // Transition to ready phase when story is ready (API returned)
  useEffect(() => {
    if (storyReady && (phase === 'loading' || phase === 'streaming')) {
      setPhase('ready')
    }
  }, [storyReady, phase])

  // Countdown before reveal
  useEffect(() => {
    if (phase !== 'ready') return
    const timer = setTimeout(() => {
      setPhase('countdown')
      setCountdown(3)
    }, 800)
    return () => clearTimeout(timer)
  }, [phase])

  useEffect(() => {
    if (phase !== 'countdown') return
    if (countdown === 0) {
      onReveal()
      return
    }
    const timer = setTimeout(() => {
      setCountdown(c => c - 1)
    }, 1000)
    return () => clearTimeout(timer)
  }, [phase, countdown, onReveal])

  // Generate star positions once per phase to avoid re-renders
  const starPositions = Array.from({ length: 20 }, () => ({
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    delay: `${Math.random() * 3}s`,
    duration: `${2 + Math.random() * 2}s`
  }))

  const renderContent = () => {
    if (phase === 'loading') {
      return (
        <>
          <div className={styles.brocadeStars}>
            {starPositions.map((pos, i) => (
              <span
                key={i}
                className={styles.firefly}
                style={pos}
              />
            ))}
          </div>
          <div className={styles.weavingSpinner}>
            <span className={styles.weavingStar}>✦</span>
          </div>
          <h2 className={styles.loadingTitle}>正在编织你的梦</h2>
          <p className={styles.loadingMessage}>
            <TypewriterText
              key={messageIndex}
              text={MESSAGES[messageIndex]}
              speed={40}
            />
          </p>
        </>
      )
    }

    if (phase === 'streaming') {
      return (
        <>
          <div className={styles.brocadeStars}>
            {starPositions.map((pos, i) => (
              <span
                key={i}
                className={styles.firefly}
                style={pos}
              />
            ))}
          </div>
          <div className={styles.brocadeFrame}>
            <h2 className={styles.brocadeTitle}>
              <span className={styles.brocadeStar}>✦</span>
              {storyTitle}
              <span className={styles.brocadeStar}>✦</span>
            </h2>
            <div className={styles.brocadeContent} ref={contentRef}>
              <p className={styles.brocadeText}>
                {streamedContent}
                <span className={styles.featherCursor}>🪶</span>
              </p>
            </div>
            <div className={styles.charCount}>
              {streamedContent?.length || 0} 字
            </div>
            <div className={styles.goldenThreads}>
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className={styles.thread}
                  style={{ top: `${25 + i * 25}%`, animationDelay: `${i * 0.5}s` }}
                />
              ))}
            </div>
          </div>
        </>
      )
    }

    if (phase === 'ready') {
      return (
        <>
          <div className={styles.brocadeStars}>
            {starPositions.map((pos, i) => (
              <span
                key={i}
                className={styles.firefly}
                style={pos}
              />
            ))}
          </div>
          <div className={styles.brocadeFrame}>
            <div className={styles.completionBadge}>
              <span className={styles.badgeStar}>✦</span>
              <span className={styles.badgeStar}>✦</span>
              <span className={styles.badgeStar}>✦</span>
            </div>
            <h2 className={styles.readyTitle}>你的梦已编织完成</h2>
            <p className={styles.readySubtitle}>即将揭晓...</p>
            <p className={styles.readyStoryTitle}>{storyTitle}</p>
          </div>
        </>
      )
    }

    if (phase === 'countdown') {
      return (
        <>
          <div className={styles.brocadeStars}>
            {starPositions.map((pos, i) => (
              <span
                key={i}
                className={styles.firefly}
                style={pos}
              />
            ))}
          </div>
          <div className={styles.countdownContent}>
            <div className={styles.countdownMoon}>
              <svg viewBox="0 0 100 100" fill="none">
                <path
                  d="M70 50c0 16.57-10.17 30.62-24.43 36.35-3.17 1.27-6.77 1.95-10.57 1.95-14.36 0-26-11.64-26-26s11.64-26 26-26c3.8 0 7.4.68 10.57 1.95C59.83 19.38 70 33.43 70 50z"
                  fill="url(#countdownMoonGradient)"
                />
                <defs>
                  <linearGradient id="countdownMoonGradient" x1="30" y1="20" x2="70" y2="80">
                    <stop offset="0%" stopColor="#F4D35E" />
                    <stop offset="100%" stopColor="#E8C547" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <span className={styles.countdownNumber} key={countdown}>
              {countdown}
            </span>
          </div>
        </>
      )
    }

    return null
  }

  return (
    <div className={styles.brocadeContainer}>
      <div className={styles.content} aria-live="polite" aria-atomic="true">
        {renderContent()}
      </div>
    </div>
  )
}
