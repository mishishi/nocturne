import { useState, useEffect, useRef } from 'react'
import { notificationApi } from '../services/api'
import { useDreamStore } from './useDreamStore'

// Shared cache to prevent duplicate API calls
let cachedCount: number | null = null
let cacheUserOpenid: string | null = null
let fetchPromise: Promise<number> | null = null

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
      const count = data.success ? data.unreadCount : 0
      cachedCount = count
      cacheUserOpenid = openid
      return count
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
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!user?.openid) {
      setCount(0)
      cachedCount = null
      cacheUserOpenid = null
      return
    }

    const updateCount = async () => {
      const newCount = await fetchUnreadCount(user.openid!)
      setCount(newCount)
    }

    updateCount()

    // Refresh every 60 seconds
    intervalRef.current = setInterval(updateCount, 60000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [user?.openid])

  return count
}
