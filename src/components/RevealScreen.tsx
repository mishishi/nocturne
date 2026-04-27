import { useState, useEffect } from 'react'
import { TypewriterText } from './ui/TypewriterText'
import styles from './RevealScreen.module.css'

interface RevealScreenProps {
  storyTitle: string
  storyReady?: boolean
  onReveal: () => void
}

const MESSAGES = [
  '月光正在晕染故事...',
  '星辰开始闪烁...',
  '梦境正在浮现...',
  '故事即将揭晓...',
]

export function RevealScreen({ storyTitle, storyReady, onReveal }: RevealScreenProps) {
  const [phase, setPhase] = useState<'loading' | 'ready' | 'countdown'>('loading')
  const [countdown, setCountdown] = useState(3)
  const [messageIndex, setMessageIndex] = useState(0)

  // Cycle through messages during loading
  useEffect(() => {
    if (phase !== 'loading') return
    const interval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % MESSAGES.length)
    }, 1500)
    return () => clearInterval(interval)
  }, [phase])

  // Transition to ready phase when story is ready (API returned)
  useEffect(() => {
    if (storyReady && phase === 'loading') {
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

  return (
    <div className={styles.overlay}>
      <div className={styles.content}>
        {phase === 'loading' && (
          <>
            <div className={styles.moonContainer}>
              <div className={styles.moon}>
                <svg viewBox="0 0 100 100" fill="none">
                  <path
                    d="M70 50c0 16.57-10.17 30.62-24.43 36.35-3.17 1.27-6.77 1.95-10.57 1.95-14.36 0-26-11.64-26-26s11.64-26 26-26c3.8 0 7.4.68 10.57 1.95C59.83 19.38 70 33.43 70 50z"
                    fill="url(#revealMoonGradient)"
                  />
                  <defs>
                    <linearGradient id="revealMoonGradient" x1="30" y1="20" x2="70" y2="80">
                      <stop offset="0%" stopColor="#F4D35E" />
                      <stop offset="100%" stopColor="#E8C547" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <div className={styles.rays}>
                {[...Array(12)].map((_, i) => (
                  <span
                    key={i}
                    className={styles.ray}
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
            <h2 className={styles.loadingTitle}>正在编织你的梦</h2>
            <p className={styles.loadingMessage}>
              <TypewriterText
                key={messageIndex}
                text={MESSAGES[messageIndex]}
                speed={40}
              />
            </p>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} />
            </div>
          </>
        )}

        {phase === 'ready' && (
          <>
            <div className={styles.readyMoon}>
              <svg viewBox="0 0 100 100" fill="none">
                <path
                  d="M70 50c0 16.57-10.17 30.62-24.43 36.35-3.17 1.27-6.77 1.95-10.57 1.95-14.36 0-26-11.64-26-26s11.64-26 26-26c3.8 0 7.4.68 10.57 1.95C59.83 19.38 70 33.43 70 50z"
                  fill="url(#readyMoonGradient)"
                  className={styles.moonPulse}
                />
                <defs>
                  <linearGradient id="readyMoonGradient" x1="30" y1="20" x2="70" y2="80">
                    <stop offset="0%" stopColor="#F4D35E" />
                    <stop offset="100%" stopColor="#E8C547" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div className={styles.readyStars}>
              {[...Array(8)].map((_, i) => (
                <span
                  key={i}
                  className={styles.star}
                  style={{
                    left: `${20 + Math.random() * 60}%`,
                    top: `${10 + Math.random() * 60}%`,
                    animationDelay: `${i * 0.2}s`
                  }}
                />
              ))}
            </div>
            <h2 className={styles.readyTitle}>你的梦已编织完成</h2>
            <p className={styles.readySubtitle}>即将揭晓...</p>
            <p className={styles.readyStoryTitle}>{storyTitle}</p>
          </>
        )}

        {phase === 'countdown' && (
          <>
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
            <div className={styles.countdownStars}>
              {[...Array(20)].map((_, i) => (
                <span
                  key={i}
                  className={styles.twinkleStar}
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 2}s`
                  }}
                />
              ))}
            </div>
            <span className={styles.countdownNumber} key={countdown}>
              {countdown}
            </span>
          </>
        )}
      </div>
    </div>
  )
}
