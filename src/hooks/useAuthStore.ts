import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { setAuthToken, clearAuthToken } from '../utils/auth'
import type { User } from '../types'

export { type User }

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
          setAuthToken(token)
        }
        set({ user, token: token ?? null })
      },

      logout: () => {
        localStorage.removeItem('yeelin_openid')
        clearAuthToken()
        set({
          user: null,
          token: null
        })
      }
    }),
    {
      name: 'yeelin-auth-storage',
      partialize: (state) => ({ user: state.user }) // Only persist user, not token
    }
  )
)