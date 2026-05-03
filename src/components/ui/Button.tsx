import { ButtonHTMLAttributes, ReactNode, useState, useRef, useEffect } from 'react'
import styles from './Button.module.css'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  children: ReactNode
}

interface Ripple {
  x: number
  y: number
  size: number
  key: number
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  children,
  className = '',
  disabled,
  onClick,
  ...props
}: ButtonProps) {
  const [ripples, setRipples] = useState<Ripple[]>([])
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Clean up ripples on unmount and when disabled becomes true
  useEffect(() => {
    if (disabled || loading) {
      setRipples([])
    }
  }, [disabled, loading])


  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || loading) return

    const button = buttonRef.current
    if (!button) return

    const rect = button.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const size = Math.max(rect.width, rect.height)

    const newRipple: Ripple = {
      x,
      y,
      size,
      key: Date.now()
    }

    setRipples((prev) => [...prev, newRipple])

    onClick?.(e)
  }

  return (
    <button
      ref={buttonRef}
      className={`${styles.button} ${styles[variant]} ${styles[size]} ${loading ? styles.loading : ''} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading}
      onClick={handleClick}
      {...props}
    >
      {loading ? (
        <>
          <span className={styles.spinner}>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="31.4 31.4" />
            </svg>
          </span>
          <span>提交中...</span>
        </>
      ) : children}

      {/* Ripple effects */}
      <span className={styles.rippleContainer}>
        {ripples.map((ripple) => (
          <span
            key={ripple.key}
            className={styles.ripple}
            style={{
              left: ripple.x,
              top: ripple.y,
              width: ripple.size,
              height: ripple.size
            }}
          />
        ))}
      </span>
    </button>
  )
}
