import { useRef, useEffect } from 'react'
import styles from './ShareMenu.module.css'

interface ShareMenuProps {
  onShareToWeChat: (type: 'friend' | 'moment') => void
  onCopyLink: () => void
  onGeneratePoster: () => void
  onClose: () => void
}

export function ShareMenu({ onShareToWeChat, onCopyLink, onGeneratePoster, onClose }: ShareMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  // Focus trap and Escape
  useEffect(() => {
    if (!menuRef.current) return
    const menuItems = menuRef.current.querySelectorAll('button')
    const firstItem = menuItems[0]
    const lastItem = menuItems[menuItems.length - 1]

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === firstItem) {
          e.preventDefault()
          lastItem.focus()
        } else if (!e.shiftKey && document.activeElement === lastItem) {
          e.preventDefault()
          firstItem.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    firstItem?.focus()
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className={styles.shareMenu} role="menu" aria-label="分享选项" ref={menuRef}>
      <button className={styles.shareMenuItem} onClick={() => onShareToWeChat('friend')} role="menuitem" tabIndex={0}>
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M8.69 13.3c-.39-.39-.39-1.02 0-1.41l6.25-6.25c.39-.39 1.02-.39 1.41 0s.39 1.02 0 1.41L10.1 13.3a.996.996 0 0 1-1.41 0z"/>
          <path d="M15.31 21.7c-.39-.39-.39-1.02 0-1.41l6.25-6.25c.39-.39 1.02-.39 1.41 0s.39 1.02 0 1.41L16.72 21.7a.996.996 0 0 1-1.41 0z"/>
          <path d="M17.56 17.56c-.39-.39-.39-1.02 0-1.41l.71-.71c.39-.39 1.02-.39 1.41 0s.39 1.02 0 1.41l-.71.71c-.39.39-1.02.39-1.41 0z"/>
        </svg>
        微信好友
      </button>
      <button className={styles.shareMenuItem} onClick={() => onShareToWeChat('moment')} role="menuitem" tabIndex={0}>
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
        </svg>
        朋友圈
      </button>
      <button className={styles.shareMenuItem} onClick={onCopyLink} role="menuitem" tabIndex={0}>
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
        </svg>
        复制链接
      </button>
      <button className={styles.shareMenuItem} onClick={onGeneratePoster} role="menuitem" tabIndex={0}>
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-5-7l-3 3.72L9 13l-3 4h12l-4-5z"/>
        </svg>
        生成海报
      </button>
    </div>
  )
}
