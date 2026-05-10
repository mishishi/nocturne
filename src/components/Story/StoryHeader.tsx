import { FriendRequestButton } from '../FriendRequestButton'
import styles from '../../pages/Story.module.css'

interface StoryHeaderProps {
  storyTitle: string
  showContent: boolean
  fromDreamWall?: boolean
  isAuthor?: boolean
  storyAuthorOpenid?: string | null
  authorIsFriend?: boolean
}

export function StoryHeader({
  storyTitle,
  showContent,
  fromDreamWall,
  isAuthor,
  storyAuthorOpenid,
  authorIsFriend
}: StoryHeaderProps) {
  return (
    <header className={`${styles.header} ${showContent ? styles.headerVisible : ''}`}>
      <div className={styles.badgeWrapper}>
        <span className={styles.badgeIcon}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </span>
        <span className={styles.badge}>你的故事</span>
        {fromDreamWall && !isAuthor && storyAuthorOpenid && !authorIsFriend && (
          <FriendRequestButton friendOpenid={storyAuthorOpenid} />
        )}
      </div>
      <h1 className={styles.title}>{storyTitle}</h1>
      <div className={styles.headerDecor}>
        <span className={styles.decorStar} />
        <span className={styles.decorStar} />
        <span className={styles.decorStar} />
      </div>
    </header>
  )
}
