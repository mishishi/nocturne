import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface User {
  id: string
  openid: string
  nickname?: string
  avatar?: string
  phone?: string
  isMember: boolean
  memberSince?: string
  points: number
  medals: string[]
  consecutiveShares: number
  lastShareDate?: string
}

interface AuthState {
  user: User | null
  token: string | null
  setUser: (user: User | null, token?: string | null) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,

      setUser: (user, token = null) => {
        if (token) {
          localStorage.setItem('yeelin_token', token)
        }
        set({ user, token: token ?? null })
      },

      logout: () => {
        localStorage.removeItem('yeelin_openid')
        localStorage.removeItem('yeelin_token')
        set({
          user: null,
          token: null
        })
      }
    }),
    {
      name: 'yeelin-auth-storage'
    }
  )
)