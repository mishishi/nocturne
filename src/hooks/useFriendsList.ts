import { useState, useEffect } from 'react'
import { friendApi, FriendListItem } from '../services/api'
import { useDreamStore } from './useDreamStore'

// Shared cache to prevent duplicate API calls
let cachedFriends: FriendListItem[] = []
let cacheOpenid: string | null = null
let isLoading = false
let loadPromise: Promise<FriendListItem[]> | null = null

async function fetchFriends(openid: string): Promise<FriendListItem[]> {
  // Return cached value if same user
  if (cacheOpenid === openid && cachedFriends.length > 0) {
    return cachedFriends
  }

  // If already fetching, wait for that promise
  if (loadPromise) {
    return loadPromise
  }

  isLoading = true
  loadPromise = (async () => {
    try {
      const res = await friendApi.getFriends()
      const friends = res.success ? res.friends : []
      cachedFriends = friends
      cacheOpenid = openid
      return friends
    } finally {
      isLoading = false
      loadPromise = null
    }
  })()

  return loadPromise
}

/**
 * Shared hook for friends list.
 * Only makes one API call regardless of how many components use it.
 */
export function useFriendsList() {
  const { user } = useDreamStore()
  const [friends, setFriends] = useState<FriendListItem[]>([])

  useEffect(() => {
    if (!user?.openid) {
      setFriends([])
      cachedFriends = []
      cacheOpenid = null
      return
    }

    const loadFriends = async () => {
      const friendsList = await fetchFriends(user.openid!)
      setFriends(friendsList)
    }

    loadFriends()
  }, [user?.openid])

  // Helper function to check if a user is already a friend
  const isFriend = (openid: string): boolean => {
    return friends.some(f => f.openid === openid)
  }

  return { friends, isFriend }
}
