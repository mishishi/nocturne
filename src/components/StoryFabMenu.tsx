import { Link } from 'react-router-dom'
import styles from './StoryFabMenu.module.css'

interface StoryFabMenuProps {
  isPublished: boolean
  publishedPostId: string | null
  isPublishing: boolean
  onPublish: () => void
  onShare: () => void
  onClose: () => void
}

export function StoryFabMenu({
  isPublished,
  publishedPostId,
  isPublishing,
  onPublish,
  onShare,
  onClose
}: StoryFabMenuProps) {
  return (
    <div className={styles.fabMenu} role="menu" aria-label="更多操作">
      <button
        className={styles.fabMenuItem}
        onClick={() => {
          onShare()
        }}
        role="menuitem"
        tabIndex={0}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}>
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
        分享
      </button>
      {!isPublished && (
        <button
          className={styles.fabMenuItem}
          onClick={() => {
            onPublish()
          }}
          role="menuitem"
          tabIndex={0}
          disabled={isPublishing}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 2a7 7 0 0 1 0 14 7 7 0 0 1 0-14" />
            <circle cx="12" cy="9" r="3" />
          </svg>
          {isPublishing ? '发布中...' : '发布到梦墙'}
        </button>
      )}
      {isPublished && (
        publishedPostId ? (
          <Link to={`/wall?post=${publishedPostId}`} className={styles.fabMenuLink} onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 18, height: 18 }}>
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            在梦墙查看
          </Link>
        ) : (
          <span className={styles.fabMenuItemDisabled}>
            <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 18, height: 18 }}>
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            已在梦墙
          </span>
        )
      )}
      <Link to="/dream" className={styles.fabMenuLink} onClick={onClose}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}>
          <path d="M12 5v14M5 12h14" />
        </svg>
        记录新梦境
      </Link>
    </div>
  )
}
