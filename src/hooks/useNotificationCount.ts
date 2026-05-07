import { useState, useEffect, useRef, useCallback } from 'react'
import { notificationApi } from '../services/api'
import { useDreamStore } from './useDreamStore'
import { hasValidToken } from '../utils/auth'

// Shared cache to prevent duplicate API calls
let cachedCount: number | null = null
let cacheUserOpenid: string | null = null
let fetchPromise: Promise<number> | null = null

let lastError: Error | null = null

async function fetchUnreadCount(openid: string): Promise<number> {
  // Return cached value if same user
  if (cachedCount !== null && cacheUserOpenid === openid) {
    return cachedCount
  }

  // If already fetching, wait for that promise
  if (fetchPromise) {
    const count = await fetchPromise
    return count
  }

  fetchPromise = (async () => {
    try {
      const data = await notificationApi.getUnreadCount()
      const count = data.success && data.data ? data.data.unreadCount : 0
      cachedCount = count
      cacheUserOpenid = openid
      lastError = null
      return count
    } catch (err) {
      lastError = err as Error
      console.error('[useNotificationCount] Failed to fetch unread count:', err)
      return cachedCount ?? 0
    } finally {
      fetchPromise = null
    }
  })()

  return fetchPromise
}

/**
 * Shared hook for notification unread count.
 * Only makes one API call regardless of how many components use it.
 */
export function useNotificationCount() {
  const { user } = useDreamStore()
  const [count, setCount] = useState(0)
  const [error, setError] = useState<Error | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const refresh = useCallback(async () => {
    if (!user?.openid) return
    cachedCount = null // Invalidate cache
    const newCount = await fetchUnreadCount(user.openid)
    setCount(newCount)
    setError(lastError)
  }, [user?.openid])

  useEffect(() => {
    if (!user?.openid || !hasValidToken()) {
      setCount(0)
      setError(null)
      cachedCount = null
      cacheUserOpenid = null
      return
    }

    const updateCount = async () => {
      const newCount = await fetchUnreadCount(user.openid!)
      setCount(newCount)
      setError(lastError)
    }

    updateCount()

    // Refresh every 60 seconds
    intervalRef.current = setInterval(updateCount, 60000)

    // Refresh immediately when page becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Invalidate cache to force fresh fetch
        cachedCount = null
        updateCount()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [user?.openid])

  return { count, error, refresh }
}
