import styles from './LoadingSpinner.module.css'

interface LoadingSpinnerProps {
  size?: 'small' | 'large'
  className?: string
}

export function LoadingSpinner({ size, className }: LoadingSpinnerProps) {
  return (
    <span
      className={`${styles.spinner} ${size ? styles[size] : ''} ${className || ''}`}
      aria-label="加载中"
      role="status"
    />
  )
}
