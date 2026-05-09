import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { storage } from '../services/storageService'

// Zustand persist 存储适配器 - 使用 storageService 实现内存缓存+防抖写入
const storageAdapter = {
  getItem: (name: string): string | null => {
    return storage.get(name) ?? null
  },
  setItem: (name: string, value: string): void => {
    storage.set(name, value)
  },
  removeItem: (name: string): void => {
    storage.remove(name)
  }
}

export interface Friend {
  id: string
  friendId: string
  nickname?: string
  avatar?: string
  isMember: boolean
  memberSince?: string
  friendsSince: string
}

export interface PendingRequest {
  id: string
  fromId?: string
  toId?: string
  nickname?: string
  avatar?: string
  createdAt: string
}

interface FriendsState {
  friends: Friend[]
  pendingRequests: { received: PendingRequest[]; sent: PendingRequest[] }
  setFriends: (friends: Friend[]) => void
  setPendingRequests: (received: PendingRequest[], sent: PendingRequest[]) => void
  addFriend: (friend: Friend) => void
  removeFriend: (friendId: string) => void
}

export const useFriendsStore = create<FriendsState>()(
  persist(
    (set) => ({
      friends: [],
      pendingRequests: { received: [], sent: [] },

      setFriends: (friends) => set({ friends }),

      setPendingRequests: (received: PendingRequest[], sent: PendingRequest[]) =>
        set({ pendingRequests: { received, sent } }),

      addFriend: (friend) =>
        set((state) => ({ friends: [...state.friends, friend] })),

      removeFriend: (friendId) =>
        set((state) => ({
          friends: state.friends.filter(f => f.friendId !== friendId)
        }))
    }),
    {
      name: 'yeelin-friends-storage',
      storage: storageAdapter
    }
  )
)