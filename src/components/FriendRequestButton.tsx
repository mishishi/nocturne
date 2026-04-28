import { useState } from 'react'
import { friendApi } from '../services/api'
import { Button } from './ui/Button'
import styles from './FriendRequestButton.module.css'

interface FriendRequestButtonProps {
  friendOpenid: string
}

type ButtonState = 'idle' | 'loading' | 'sent' | 'error'

export function FriendRequestButton({ friendOpenid }: FriendRequestButtonProps) {
  const [state, setState] = useState<ButtonState>('idle')

  const handleClick = async () => {
    if (state !== 'idle') return

    setState('loading')

    try {
      const result = await friendApi.sendFriendRequest(friendOpenid)
      if (result.success) {
        setState('sent')
      } else {
        setState('error')
      }
    } catch (err) {
      setState('error')
    }
  }

  if (state === 'sent') {
    return (
      <span role="status" className={styles.sentLabel}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.checkIcon}>
          <polyline points="20 6 9 17 4 12" />
        </svg>
        已发送
      </span>
    )
  }

  return (
    <Button
      variant="secondary"
      loading={state === 'loading'}
      disabled={state !== 'idle'}
      onClick={handleClick}
      className={state === 'error' ? styles.error : ''}
    >
      {state === 'error' ? (
        <>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.icon}>
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          重试
        </>
      ) : (
        <>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.icon}>
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <line x1="20" y1="8" x2="20" y2="14" />
            <line x1="23" y1="11" x2="17" y2="11" />
          </svg>
          添加好友
        </>
      )}
    </Button>
  )
}
