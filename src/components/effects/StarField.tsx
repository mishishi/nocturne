import { useEffect, useRef, useState } from 'react'
import styles from './StarField.module.css'

interface Star {
  id: number
  x: number
  y: number
  size: number
  opacity: number
  duration: number
  delay: number
}

export function StarField() {
  const [stars, setStars] = useState<Star[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const generateStars = () => {
      const count = window.innerWidth < 768 ? 50 : 80
      const newStars: Star[] = []

      for (let i = 0; i < count; i++) {
        newStars.push({
          id: i,
          x: Math.random() * 100,
          y: Math.random() * 100,
          size: Math.random() * 2 + 1,
          opacity: Math.random() * 0.5 + 0.2,
          duration: Math.random() * 3 + 2,
          delay: Math.random() * 5
        })
      }

      setStars(newStars)
    }

    generateStars()
  }, [])

  return (
    <div ref={containerRef} className={styles.container}>
      {stars.map((star) => (
        <div
          key={star.id}
          className={styles.star}
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            opacity: star.opacity,
            animationDuration: `${star.duration}s`,
            animationDelay: `${star.delay}s`
          }}
        />
      ))}
    </div>
  )
}
