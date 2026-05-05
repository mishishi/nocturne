import { useState, useCallback } from 'react'
import styles from './ExpandableCard.module.css'

interface ExpandableCardProps {
  icon?: React.ReactNode
  title: string
  defaultExpanded?: boolean
  children: React.ReactNode
  onExpanded?: () => void
}

export function ExpandableCard({
  icon,
  title,
  defaultExpanded = false,
  children,
  onExpanded
}: ExpandableCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  const handleToggle = useCallback(() => {
    setIsExpanded(prev => {
      const next = !prev
      if (next && onExpanded) {
        onExpanded()
      }
      return next
    })
  }, [onExpanded])

  return (
    <div className={styles.card}>
      <div
        className={styles.header}
        onClick={handleToggle}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleToggle()
          }
        }}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
      >
        <div className={styles.headerLeft}>
          {icon && <span className={styles.icon}>{icon}</span>}
          <span className={styles.title}>{title}</span>
        </div>
        <div className={styles.toggleBtn}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={isExpanded ? styles.expanded : ''}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      {isExpanded && <div className={styles.content}>{children}</div>}
    </div>
  )
}
