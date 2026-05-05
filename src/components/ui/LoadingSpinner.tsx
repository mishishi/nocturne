import styles from './LoadingSpinner.module.css'

interface LoadingSpinnerProps {
  className?: string
}

export function LoadingSpinner({ className }: LoadingSpinnerProps) {
  return (
    <span
      className={`${styles.spinner} ${className || ''}`}
      aria-label="加载中"
      role="status"
    />
  )
}
