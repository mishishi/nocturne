import styles from './ProgressDots.module.css'

interface ProgressDotsProps {
  total: number
  current: number
}

export function ProgressDots({ total, current }: ProgressDotsProps) {
  return (
    <div className={styles.container}>
      {Array.from({ length: total }).map((_, index) => (
        <div
          key={index}
          className={`${styles.dot} ${index < current ? styles.filled : ''} ${index === current ? styles.current : ''}`}
        />
      ))}
    </div>
  )
}
