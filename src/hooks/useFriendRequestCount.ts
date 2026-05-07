import { useState, useEffect, useRef, useCallback } from 'react'
import { friendApi, FriendRequestItem } from '../services/api'
import { useDreamStore } from './useDreamStore'
import { hasValidToken } from '../utils/auth'

// Shared cache to prevent duplicate API calls
let cachedRequests: FriendRequestItem[] = []
let cacheUserOpenid: string | null = null
let fetchPromise: Promise<FriendRequestItem[]> | null = null
let lastError: Error | null = null

async function fetchFriendRequests(openid: string): Promise<FriendRequestItem[]> {
  // Return cached value if same user
  if (cacheUserOpenid === openid) {
    return cachedRequests
  }

  // If already fetching, wait for that promise
  if (fetchPromise) {
    return fetchPromise
  }

  fetchPromise = (async () => {
    try {
      const res = await friendApi.getFriendRequests()
      const requests = res.success ? (res.data.requests || []) : []
      cachedRequests = requests
      cacheUserOpenid = openid
      lastError = null
      return requests
    } catch (err) {
      lastError = err as Error
      console.error('[useFriendRequestCount] Failed to fetch friend requests:', err)
      return cachedRequests ?? []
    } finally {
      fetchPromise = null
    }
  })()

  return fetchPromise
}

/**
 * Shared hook for friend requests.
 * Only makes one API call regardless of how many components use it.
 */
export function useFriendRequestCount() {
  const { user } = useDreamStore()
  const [requests, setRequests] = useState<FriendRequestItem[]>([])
  const [error, setError] = useState<Error | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const refresh = useCallback(async () => {
    if (!user?.openid) return
    cachedRequests = [] // Invalidate cache
    const newRequests = await fetchFriendRequests(user.openid)
    setRequests(newRequests)
    setError(lastError)
  }, [user?.openid])

  useEffect(() => {
    if (!user?.openid || !hasValidToken()) {
      setRequests([])
      setError(null)
      cachedRequests = []
      cacheUserOpenid = null
      return
    }

    const updateRequests = async () => {
      const newRequests = await fetchFriendRequests(user.openid!)
      setRequests(newRequests)
      setError(lastError)
    }

    updateRequests()

    // Refresh every 30 seconds
    intervalRef.current = setInterval(updateRequests, 30000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [user?.openid])

  return { requests, error, refresh }
}
