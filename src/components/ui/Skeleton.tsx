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

export function DreamWallSkeleton() {
  return (
    <div className={styles.wallSkeleton} role="status" aria-live="polite" aria-label="正在加载梦境">
      {[1, 2, 3].map((i) => (
        <div key={i} className={styles.wallCard}>
          <div className={styles.wallCardHeader}>
            <Skeleton variant="avatar" className={styles.wallAvatar} />
            <div className={styles.wallCardContent}>
              <Skeleton variant="title" className={styles.wallCardTitle} />
              <Skeleton variant="text" className={styles.wallCardMeta} />
            </div>
          </div>
          <Skeleton variant="title" className={styles.wallCardStoryTitle} />
          <div className={styles.wallCardBody}>
            <Skeleton variant="line" />
            <Skeleton variant="line" />
            <Skeleton variant="line" />
          </div>
          <div className={styles.wallCardActions}>
            <Skeleton variant="line" className={styles.wallActionBtn} />
            <Skeleton variant="line" className={styles.wallActionBtn} />
            <Skeleton variant="line" className={styles.wallActionBtn} />
          </div>
        </div>
      ))}
    </div>
  )
}

export function FriendsSkeleton() {
  return (
    <div className={styles.friendsSkeleton} role="status" aria-live="polite" aria-label="正在加载好友">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className={styles.friendCardSkeleton}>
          <Skeleton variant="avatar" className={styles.friendAvatar} />
          <div className={styles.friendCardContent}>
            <Skeleton variant="title" className={styles.friendCardName} />
            <Skeleton variant="text" className={styles.friendCardMeta} />
          </div>
        </div>
      ))}
    </div>
  )
}

export function StoryContentSkeleton() {
  return (
    <div className={styles.storyContentSkeleton} role="status" aria-live="polite" aria-label="正在加载故事内容">
      <div className={styles.storySkeletonHeader}>
        <Skeleton variant="title" className={styles.storySkeletonTitle} />
        <div className={styles.storySkeletonMeta}>
          <Skeleton variant="text" className={styles.storySkeletonMetaText} />
        </div>
      </div>
      <div className={styles.storySkeletonBody}>
        <Skeleton variant="line" className={styles.storySkeletonLine} />
        <Skeleton variant="line" className={styles.storySkeletonLine} />
        <Skeleton variant="line" className={styles.storySkeletonLine} />
        <Skeleton variant="line" className={styles.storySkeletonLine} />
        <Skeleton variant="line" className={styles.storySkeletonLineShort} />
      </div>
    </div>
  )
}
