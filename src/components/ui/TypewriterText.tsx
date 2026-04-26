import { useEffect, useState } from 'react'
import styles from './TypewriterText.module.css'

interface TypewriterTextProps {
  text: string
  speed?: number
  delay?: number
  className?: string
  onComplete?: () => void
  cursor?: boolean
}

export function TypewriterText({
  text,
  speed = 50,
  delay = 0,
  className = '',
  onComplete,
  cursor = true
}: TypewriterTextProps) {
  const [displayedText, setDisplayedText] = useState('')
  const [isComplete, setIsComplete] = useState(false)

  useEffect(() => {
    setDisplayedText('')
    setIsComplete(false)

    const startTimeout = setTimeout(() => {
      let currentIndex = 0

      const interval = setInterval(() => {
        if (currentIndex <= text.length) {
          setDisplayedText(text.slice(0, currentIndex))
          currentIndex++
        } else {
          clearInterval(interval)
          setIsComplete(true)
          onComplete?.()
        }
      }, speed)

      return () => clearInterval(interval)
    }, delay)

    return () => clearTimeout(startTimeout)
  }, [text, speed, delay, onComplete])

  return (
    <span className={`${styles.typewriter} ${className}`}>
      {displayedText}
      {cursor && !isComplete && <span className={styles.cursor}>|</span>}
    </span>
  )
}
