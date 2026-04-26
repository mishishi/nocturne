import { useEffect, useRef, useState } from 'react'
import styles from './FloatingDust.module.css'

interface Dust {
  id: number
  x: number
  y: number
  size: number
  opacity: number
  duration: number
  delay: number
  driftX: number
  driftY: number
}

export function FloatingDust() {
  const [dustParticles, setDustParticles] = useState<Dust[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const generateDust = () => {
      const count = window.innerWidth < 768 ? 30 : 50
      const particles: Dust[] = []

      for (let i = 0; i < count; i++) {
        const driftX = (Math.random() - 0.5) * 100
        const driftY = (Math.random() - 0.5) * 100

        particles.push({
          id: i,
          x: Math.random() * 100,
          y: Math.random() * 100,
          size: Math.random() * 3 + 1,
          opacity: Math.random() * 0.3 + 0.1,
          duration: Math.random() * 20 + 15,
          delay: Math.random() * 10,
          driftX,
          driftY
        })
      }

      setDustParticles(particles)
    }

    generateDust()
  }, [])

  return (
    <div ref={containerRef} className={styles.container}>
      {dustParticles.map((dust) => (
        <div
          key={dust.id}
          className={styles.dust}
          style={{
            left: `${dust.x}%`,
            top: `${dust.y}%`,
            width: `${dust.size}px`,
            height: `${dust.size}px`,
            opacity: dust.opacity,
            animationDuration: `${dust.duration}s`,
            animationDelay: `${dust.delay}s`,
            '--drift-x': `${dust.driftX}px`,
            '--drift-y': `${dust.driftY}px`
          } as React.CSSProperties}
        />
      ))}
    </div>
  )
}
