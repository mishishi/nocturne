import styles from './BreathingOrb.module.css'

interface OrbProps {
  className?: string
  color: string
  size: number
  top?: string
  left?: string
  right?: string
  bottom?: string
  duration: number
  delay?: number
}

function Orb({ className, color, size, top, left, duration, delay = 0 }: OrbProps) {
  return (
    <div
      className={`${styles.orb} ${className || ''}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        top,
        left,
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        animationDuration: `${duration}s`,
        animationDelay: `${delay}s`
      }}
    />
  )
}

export function BreathingOrb() {
  return (
    <div className={styles.container}>
      {/* Main atmospheric orbs with breathing animation */}
      <Orb
        className={styles.orb1}
        color="rgba(74, 111, 165, 0.3)"
        size={600}
        top="-200px"
        left="auto"
        right="-100px"
        duration={8}
        delay={0}
      />
      <Orb
        className={styles.orb2}
        color="rgba(107, 91, 149, 0.25)"
        size={500}
        top="auto"
        bottom="-150px"
        left="-100px"
        duration={10}
        delay={2}
      />
      <Orb
        className={styles.orb3}
        color="rgba(244, 211, 94, 0.12)"
        size={400}
        top="40%"
        left="30%"
        duration={7}
        delay={4}
      />
      <Orb
        className={styles.orb4}
        color="rgba(139, 157, 195, 0.18)"
        size={300}
        top="20%"
        left="auto"
        right="20%"
        duration={12}
        delay={1}
      />

      {/* Extra deep breathing orbs for atmosphere */}
      <Orb
        className={styles.orb5}
        color="rgba(74, 85, 130, 0.2)"
        size={450}
        top="60%"
        left="10%"
        duration={9}
        delay={3}
      />
      <Orb
        className={styles.orb6}
        color="rgba(139, 92, 146, 0.15)"
        size={350}
        top="70%"
        left="auto"
        right="15%"
        duration={11}
        delay={5}
      />
    </div>
  )
}
