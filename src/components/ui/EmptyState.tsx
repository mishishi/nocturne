import { Button } from './Button'
import styles from './EmptyState.module.css'

export type EmptyStateIcon = 'moon' | 'star' | 'document' | 'heart' | 'friends' | 'search' | 'inbox'

interface EmptyStateProps {
  icon?: EmptyStateIcon
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

const ICONS: Record<EmptyStateIcon, React.ReactNode> = {
  moon: (
    <svg viewBox="0 0 48 48" fill="none">
      <path
        d="M36.5 27.5a12.5 12.5 0 1 1-12.5-12.5c0-.3 0-.6.1-.9a10 10 0 0 0 8.9 16.9 9.8 9.8 0 0 0 3.1-.5.5.5 0 0 1 .4 0 .5.5 0 0 1 .3.4 9.6 9.6 0 0 0 2.8 6.4 9.5 9.5 0 0 1-3.1-9.3z"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      <path d="M18 8l-2 4M8 18l4-2M12 38l-4-2M38 32l-2 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  star: (
    <svg viewBox="0 0 48 48" fill="none">
      <path
        d="M24 4l5.5 11.2 12.4 1.8-9 8.8 2.1 12.4L24 32.6l-11 5.6 2.1-12.4-9-8.8 12.4-1.8L24 4z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="36" cy="10" r="1.5" fill="currentColor" />
      <circle cx="40" cy="18" r="1" fill="currentColor" />
      <circle cx="10" cy="14" r="1" fill="currentColor" />
      <circle cx="8" cy="26" r="1.5" fill="currentColor" />
    </svg>
  ),
  document: (
    <svg viewBox="0 0 48 48" fill="none">
      <rect x="8" y="12" width="32" height="28" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M16 8V12M32 8V12M8 20H40" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 28H32M16 34H24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  heart: (
    <svg viewBox="0 0 48 48" fill="none">
      <path
        d="M24 42s-15-9.3-15-18.5c0-6 4.5-10.5 10.5-10.5 3.5 0 6.5 2 8 5 1.5-3 4.5-5 8-5 6 0 10.5 4.5 10.5 10.5 0 9.2-15 18.5-15 18.5z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  ),
  friends: (
    <svg viewBox="0 0 48 48" fill="none">
      <circle cx="16" cy="20" r="6" stroke="currentColor" strokeWidth="2" />
      <path d="M4 38c0-6.6 5.4-12 12-12s12 5.4 12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="34" cy="18" r="5" stroke="currentColor" strokeWidth="2" />
      <path d="M26 36c0-5 4-9 10-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M38 30l2-2M36 32l2-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  search: (
    <svg viewBox="0 0 48 48" fill="none">
      <circle cx="22" cy="22" r="12" stroke="currentColor" strokeWidth="2" />
      <path d="M30 30l10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  ),
  inbox: (
    <svg viewBox="0 0 48 48" fill="none">
      <rect x="6" y="10" width="36" height="28" rx="3" stroke="currentColor" strokeWidth="2" />
      <path d="M6 20l18 12 18-12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function EmptyState({ icon = 'inbox', title, description, action, className }: EmptyStateProps) {
  return (
    <div className={`${styles.container} ${className || ''}`}>
      <div className={styles.iconWrapper}>
        {ICONS[icon]}
      </div>
      <h3 className={styles.title}>{title}</h3>
      {description && <p className={styles.description}>{description}</p>}
      {action && (
        <Button onClick={action.onClick} className={styles.action}>
          {action.label}
        </Button>
      )}
    </div>
  )
}
