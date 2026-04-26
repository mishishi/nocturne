import { TextareaHTMLAttributes, forwardRef, useState, useEffect, useRef } from 'react'
import styles from './Textarea.module.css'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  showCount?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, showCount, className = '', value, id, maxLength, ...props }, ref) => {
    const [charCount, setCharCount] = useState(0)
    const [showError, setShowError] = useState(false)
    const prevErrorRef = useRef(error)
    const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`
    const errorId = `${textareaId}-error`

    useEffect(() => {
      setCharCount(typeof value === 'string' ? value.length : 0)
    }, [value])

    useEffect(() => {
      if (error && error !== prevErrorRef.current) {
        setShowError(true)
        const timer = setTimeout(() => setShowError(false), 600)
        prevErrorRef.current = error
        return () => clearTimeout(timer)
      }
      prevErrorRef.current = error
    }, [error])

    // Get count class based on usage percentage
    const getCountClass = (count: number, max: number | undefined) => {
      if (!max) return ''
      const ratio = count / max
      if (ratio >= 1) return styles.countDanger
      if (ratio >= 0.9) return styles.countWarning
      if (ratio >= 0.75) return styles.countNear
      return ''
    }

    return (
      <div className={styles.wrapper}>
        {label && <label className={styles.label} htmlFor={textareaId}>{label}</label>}
        <textarea
          ref={ref}
          id={textareaId}
          className={`${styles.textarea} ${error ? styles.error : ''} ${showError ? styles.shake : ''} ${className}`}
          value={value}
          aria-describedby={error ? errorId : undefined}
          aria-invalid={error ? 'true' : undefined}
          {...props}
        />
        {showCount && (
          <div className={styles.countWrapper}>
            {error && <span id={errorId} className={styles.errorText}>{error}</span>}
            <span className={`${styles.charCount} ${error ? styles.countWithError : ''} ${getCountClass(charCount, maxLength)}`}>
              {maxLength ? `${charCount}/${maxLength} 字` : `${charCount} 字`}
            </span>
          </div>
        )}
        {!showCount && error && <span id={errorId} className={styles.errorText}>{error}</span>}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'
