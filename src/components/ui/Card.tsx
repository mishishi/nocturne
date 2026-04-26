import { ReactNode } from 'react'
import styles from './Card.module.css'

interface CardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
  hoverable?: boolean
}

export function Card({ children, className = '', onClick, hoverable = false }: CardProps) {
  return (
    <div
      className={`${styles.card} ${hoverable ? styles.hoverable : ''} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  )
}
