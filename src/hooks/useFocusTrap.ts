import { useEffect, useRef, useCallback } from 'react'

interface UseFocusTrapOptions {
  enabled?: boolean
  onEscape?: () => void
}

/**
 * Focus trap hook for modal dialogs
 * - Traps focus within the container
 * - Handles Tab/Shift+Tab cycling
 * - Handles Escape key
 * - Restores focus to previous element on unmount
 */
export function useFocusTrap<T extends HTMLElement = HTMLDivElement>(
  options: UseFocusTrapOptions = {}
) {
  const { enabled = true, onEscape } = options
  const containerRef = useRef<T>(null)
  const previousActiveElement = useRef<HTMLElement | null>(null)

  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) return []

    return Array.from(
      containerRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter(el => el.offsetParent !== null)
  }, [])

  useEffect(() => {
    if (!enabled) return

    // Store previously focused element
    previousActiveElement.current = document.activeElement as HTMLElement

    // Focus first focusable element on mount
    const focusFirst = () => {
      const focusable = getFocusableElements()
      if (focusable.length > 0) {
        focusable[0].focus()
      }
    }

    const timer = setTimeout(focusFirst, 0)

    return () => {
      clearTimeout(timer)
      // Restore focus on unmount
      if (previousActiveElement.current) {
        previousActiveElement.current.focus()
      }
    }
  }, [enabled, getFocusableElements])

  // Handle keyboard navigation
  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape key
      if (e.key === 'Escape' && onEscape) {
        e.preventDefault()
        onEscape()
        return
      }

      // Tab key - trap focus
      if (e.key !== 'Tab') return

      const focusable = getFocusableElements()
      if (focusable.length === 0) return

      const firstElement = focusable[0]
      const lastElement = focusable[focusable.length - 1]

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement.focus()
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [enabled, onEscape, getFocusableElements])

  return containerRef
}
