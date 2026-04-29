import { useState, useEffect, useRef } from 'react'
import { friendApi } from '../services/api'
import { useDreamStore } from './useDreamStore'

interface FriendRequestItem {
  id: string
  fromOpenid: string
  fromNickname: string
  fromAvatar: string | null
  status: string
  createdAt: string
}

// Shared cache to prevent duplicate API calls
let cachedRequests: FriendRequestItem[] = []
let cacheUserOpenid: string | null = null
let fetchPromise: Promise<FriendRequestItem[]> | null = null

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
      const requests = res.success ? res.requests : []
      cachedRequests = requests
      cacheUserOpenid = openid
      return requests
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
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!user?.openid) {
      setRequests([])
      cachedRequests = []
      cacheUserOpenid = null
      return
    }

    const updateRequests = async () => {
      const newRequests = await fetchFriendRequests(user.openid!)
      setRequests(newRequests)
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

  return requests
}
