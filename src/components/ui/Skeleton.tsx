import styles from './Skeleton.module.css'

interface SkeletonProps {
  variant?: 'text' | 'title' | 'avatar' | 'line'
  width?: string
  height?: string
  className?: string
}

export function Skeleton({ variant = 'text', width, height, className = '' }: SkeletonProps) {
  return (
    <div
      className={`${styles.skeleton} ${styles[variant]} ${className}`}
      style={{ width, height }}
      aria-hidden="true"
    />
  )
}

export function DreamFormSkeleton() {
  return (
    <div className={styles.card} role="status" aria-live="polite" aria-label="正在加载">
      <div className={styles.cardSkeleton}>
        <div className={styles.cardHeader}>
          <Skeleton variant="avatar" className={styles.avatar} />
          <div className={styles.cardContent}>
            <Skeleton variant="title" className={styles.cardTitle} />
            <Skeleton variant="text" className={styles.cardMeta} />
          </div>
        </div>
        <div className={styles.cardBody}>
          <Skeleton variant="line" />
          <Skeleton variant="line" />
          <Skeleton variant="line" />
        </div>
      </div>
    </div>
  )
}
