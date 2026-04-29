import { useState, useEffect } from 'react'
import { friendApi } from '../services/api'
import { useFriendsList } from '../hooks/useFriendsList'
import { Button } from './ui/Button'
import styles from './FriendRequestButton.module.css'

interface FriendRequestButtonProps {
  friendOpenid: string
}

type ButtonState = 'idle' | 'loading' | 'sent' | 'alreadyFriends' | 'error'

export function FriendRequestButton({ friendOpenid }: FriendRequestButtonProps) {
  const [state, setState] = useState<ButtonState>('idle')
  const { isFriend } = useFriendsList()

  // Check if already friends on mount
  useEffect(() => {
    if (isFriend(friendOpenid)) {
      setState('alreadyFriends')
    }
  }, [friendOpenid, isFriend])

  const handleClick = async () => {
    if (state !== 'idle') return

    setState('loading')

    try {
      const result = await friendApi.sendFriendRequest(friendOpenid)
      if (result.success) {
        setState('sent')
      } else {
        // 处理已存在的好友请求或已是好友
        if (
          result.reason === '好友请求已存在' ||
          result.reason === '你们已经是好友或已有待处理请求' ||
          result.reason === '已经是好友'
        ) {
          setState('alreadyFriends')
        } else {
          setState('error')
        }
      }
    } catch (err: any) {
      // 处理网络错误中包含此信息的情况
      if (
        err?.message?.includes('好友请求已存在') ||
        err?.message?.includes('你们已经是好友或已有待处理请求') ||
        err?.message?.includes('已经是好友')
      ) {
        setState('alreadyFriends')
      } else {
        setState('error')
      }
    }
  }

  if (state === 'alreadyFriends') {
    return (
      <span role="status" className={styles.sentLabel}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.checkIcon}>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
        已是好友
      </span>
    )
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
