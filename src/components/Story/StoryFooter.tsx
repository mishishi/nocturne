import { useMemo } from 'react'
import styles from '../../pages/Story.module.css'

interface StoryFooterProps {
  className?: string
}

export function StoryFooter(_props: StoryFooterProps) {
  // Memoized particle positions to avoid Math.random() on each render
  const particlePositions = useMemo(() =>
    Array.from({ length: 12 }, () => ({
      left: `${8 + Math.random() * 84}%`,
      animationDelay: `${Math.random() * 8}s`,
      animationDuration: `${6 + Math.random() * 6}s`
    })), []
  )

  return (
    <>
      {/* Floating particles */}
      <div className={styles.particles}>
        {particlePositions.map((particle, i) => (
          <span
            key={i}
            className={styles.particle}
            style={particle}
          />
        ))}
      </div>

      {/* Decorative elements */}
      <div className={styles.decorLeft}>
        <svg viewBox="0 0 100 200" fill="none">
          <path d="M50 0 Q100 50 50 100 Q0 150 50 200" stroke="currentColor" strokeWidth="1" fill="none" />
        </svg>
      </div>
      <div className={styles.decorRight}>
        <svg viewBox="0 0 100 200" fill="none">
          <path d="M50 0 Q0 50 50 100 Q100 150 50 200" stroke="currentColor" strokeWidth="1" fill="none" />
        </svg>
      </div>
    </>
  )
}
