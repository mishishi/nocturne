import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { checkInApi, wallApi, achievementApi, apiWithRetry } from '../services/api'
import { useAuthStore } from './useAuthStore'

// Toast 通知回调函数（用于后台任务失败时通知用户）
type ToastCallback = (message: string, type: 'success' | 'error') => void
let toastCallback: ToastCallback | null = null

/**
 * 注册 Toast 回调函数
 * 应在 App.tsx 初始化时调用
 */
export function registerToastCallback(fn: ToastCallback) {
  toastCallback = fn
}

export interface DreamSession {
  id: string
  sessionId: string  // Backend session ID for publishing
  openid: string     // Author's openid
  date: string
  dreamSnippet: string
  storyTitle: string
  story: string
  questions: string[]
  answers: string[]
  isFavorite?: boolean
  privateNote?: string
  tags: string[]
}

// User type
export interface User {
  id: string
  openid: string
  nickname?: string
  avatar?: string
  phone?: string
  isMember: boolean
  isAdmin?: boolean
  memberSince?: string
  points: number
  medals: string[]
  consecutiveShares: number
  lastShareDate?: string
}

// Friend type
export interface Friend {
  id: string
  friendId: string
  nickname?: string
  avatar?: string
  isMember: boolean
  memberSince?: string
  friendsSince: string
}

// Pending friend request type
export interface PendingRequest {
  id: string
  fromId?: string
  toId?: string
  nickname?: string
  avatar?: string
  createdAt: string
}

// Predefined tags
export const DREAM_TAGS = [
  { id: 'peaceful', label: '平静', icon: '😌', color: '#64D8CB' },
  { id: 'adventure', label: '冒险', icon: '⚔️', color: '#F4A261' },
  { id: 'mystery', label: '神秘', icon: '🔮', color: '#9B7EBD' },
  { id: 'nightmare', label: '噩梦', icon: '😱', color: '#E76F51' },
  { id: 'joyful', label: '欢乐', icon: '😊', color: '#F4D35E' },
  { id: 'fantasy', label: '奇幻', icon: '✨', color: '#A8DADC' }
]

export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  unlockedAt?: string
  // 解锁条件提示（未解锁时显示）
  hint?: string
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_dream',
    title: '初入梦境',
    description: '记录你的第一个梦境',
    icon: '🌙',
    hint: '记录你的第一个梦境即可解锁'
  },
  {
    id: 'week_streak',
    title: '连续7天',
    description: '连续7天记录梦境',
    icon: '⭐',
    hint: '坚持每天记录梦境'
  },
  {
    id: 'story_collector',
    title: '故事鉴赏家',
    description: '保存10个故事',
    icon: '📚',
    hint: '保存更多故事以解锁'
  }
]

interface DreamState {
  // Current session
  currentSession: {
    sessionId: string
    openid: string
    dreamText: string
    dreamElements: string[]
    questions: string[]
    answers: string[]
    currentQuestionIndex: number
    story: string
    storyTitle: string
    status: 'idle' | 'dream_submitted' | 'questions' | 'answering' | 'story_generating' | 'completed'
  }

  // History
  history: DreamSession[]

  // Achievements
  achievements: string[]
  recentlyUnlocked: string[]

  // Sharing / Points
  points: number
  medals: string[]
  consecutiveShares: number
  lastShareDate: string | null

  // User auth
  user: User | null
  token: string | null

  // Friends
  friends: Friend[]
  pendingRequests: { received: PendingRequest[]; sent: PendingRequest[] }

  // Check-in
  checkedInToday: boolean
  consecutiveDays: number

  // Settings
  fontSize: 'small' | 'medium' | 'large'
  theme: 'starry' | 'aurora' | 'dark'
  reduceMotion: boolean
  ambientSound: 'none' | 'dreamPad' | 'whiteNoise' | 'rain'
  ambientVolume: number

  // Actions
  setSessionId: (id: string) => void
  setOpenid: (id: string) => void
  setDreamText: (text: string) => void
  setDreamElements: (elements: string[]) => void
  setQuestions: (questions: string[]) => void
  setAnswer: (index: number, answer: string) => void
  nextQuestion: () => void
  prevQuestion: () => void
  setStory: (title: string, content: string) => void
  setStatus: (status: DreamState['currentSession']['status']) => void
  addToHistory: () => Promise<void>
  removeFromHistory: (id: string) => void
  restoreItem: (item: DreamSession) => void
  clearHistory: () => void
  setHistory: (history: DreamSession[]) => void
  loadFromHistory: (item: DreamSession) => void
  toggleFavorite: (id: string) => void
  updatePrivateNote: (id: string, note: string) => void
  updateTags: (id: string, tags: string[]) => void
  unlockAchievement: (id: string) => void
  clearRecentlyUnlocked: (id: string) => void
  addPoints: (amount: number) => void
  unlockMedal: (medalId: string) => void
  setShareStats: (stats: { points: number; medals: string[]; consecutiveShares: number; lastShareDate: string | null }) => void
  setFontSize: (size: 'small' | 'medium' | 'large') => void
  setTheme: (theme: 'starry' | 'aurora' | 'dark') => void
  setReduceMotion: (reduce: boolean) => void
  setAmbientSound: (sound: 'none' | 'dreamPad' | 'whiteNoise' | 'rain') => void
  setAmbientVolume: (volume: number) => void
  reset: () => void
  // Auth actions
  setUser: (user: User | null, token?: string | null, previousOpenid?: string) => void
  logout: () => void
  // Friend actions
  setFriends: (friends: Friend[]) => void
  setPendingRequests: (received: PendingRequest[], sent: PendingRequest[]) => void
  addFriend: (friend: Friend) => void
  removeFriend: (friendId: string) => void
  // Check-in actions
  setCheckInStatus: (checkedInToday: boolean, consecutiveDays: number) => void
  // Achievement actions
  syncAchievementsFromServer: () => Promise<void>
}

// Helper to check 7-day streak
function checkWeekStreak(history: DreamSession[]): boolean {
  if (history.length < 7) return false

  // Get unique dates and sort descending
  const dates = [...new Set(history.map(h => h.date))].sort((a, b) => {
    return new Date(b).getTime() - new Date(a).getTime()
  })

  if (dates.length < 7) return false

  // Check if we have 7 consecutive days ending today
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let i = 0; i < 7; i++) {
    const expectedDate = new Date(today)
    expectedDate.setDate(expectedDate.getDate() - i)
    const expectedStr = expectedDate.toLocaleDateString('zh-CN')

    if (!dates.includes(expectedStr)) {
      return false
    }
  }

  return true
}

const initialState = {
  currentSession: {
    sessionId: '',
    openid: '',
    dreamText: '',
    dreamElements: [],
    questions: [],
    answers: [],
    currentQuestionIndex: 0,
    story: '',
    storyTitle: '',
    status: 'idle' as const
  },
  history: [],
  achievements: [],
  recentlyUnlocked: [],
  points: 0,
  medals: [],
  consecutiveShares: 0,
  lastShareDate: null,
  user: null,
  token: null,
  friends: [],
  pendingRequests: { received: [] as PendingRequest[], sent: [] as PendingRequest[] },
  checkedInToday: false,
  consecutiveDays: 0,
  fontSize: 'medium' as const,
  theme: 'starry' as const,
  reduceMotion: false,
  ambientSound: 'none' as const,
  ambientVolume: 0.5
}

export const useDreamStore = create<DreamState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setSessionId: (id) =>
        set((state) => ({
          currentSession: { ...state.currentSession, sessionId: id }
        })),

      setOpenid: (id) =>
        set((state) => ({
          currentSession: { ...state.currentSession, openid: id }
        })),

      setDreamText: (text) =>
        set((state) => ({
          currentSession: { ...state.currentSession, dreamText: text }
        })),

      setDreamElements: (elements) =>
        set((state) => ({
          currentSession: { ...state.currentSession, dreamElements: elements }
        })),

      setQuestions: (questions) =>
        set((state) => ({
          currentSession: {
            ...state.currentSession,
            questions,
            answers: new Array(questions.length).fill(''),
            currentQuestionIndex: 0,
            story: '',
            storyTitle: '',
            status: 'questions'
          }
        })),

      setAnswer: (index, answer) =>
        set((state) => {
          const newAnswers = [...state.currentSession.answers]
          newAnswers[index] = answer
          return {
            currentSession: { ...state.currentSession, answers: newAnswers }
          }
        }),

      nextQuestion: () =>
        set((state) => {
          const nextIndex = state.currentSession.currentQuestionIndex + 1
          if (nextIndex >= state.currentSession.questions.length) {
            return {
              currentSession: {
                ...state.currentSession,
                status: 'story_generating'
              }
            }
          }
          return {
            currentSession: {
              ...state.currentSession,
              currentQuestionIndex: nextIndex,
              status: 'answering'
            }
          }
        }),

      prevQuestion: () =>
        set((state) => {
          const prevIndex = Math.max(0, state.currentSession.currentQuestionIndex - 1)
          return {
            currentSession: {
              ...state.currentSession,
              currentQuestionIndex: prevIndex,
              status: 'answering'
            }
          }
        }),

      setStory: (title, content) =>
        set((state) => ({
          currentSession: {
            ...state.currentSession,
            storyTitle: title,
            story: content,
            status: 'completed'
          }
        })),

      setStatus: (status) =>
        set((state) => ({
          currentSession: { ...state.currentSession, status }
        })),

      addToHistory: async () => {
        const state = get()
        const { dreamText, questions, answers, storyTitle, story } = state.currentSession

        if (!dreamText || !story) return

        const newSession: DreamSession = {
          id: `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          sessionId: state.currentSession.sessionId,
          openid: state.currentSession.openid,
          date: new Date().toLocaleDateString('zh-CN'),
          dreamSnippet: dreamText.slice(0, 100) + (dreamText.length > 100 ? '...' : ''),
          storyTitle,
          story,
          questions,
          answers,
          tags: []
        }

        // Check achievements
        const newHistoryLength = state.history.length + 1
        const newAchievements = [...state.achievements]

        // First dream (was empty before adding)
        if (state.history.length === 0 && !newAchievements.includes('first_dream')) {
          newAchievements.push('first_dream')
        }

        // Story collector - 10 stories
        if (newHistoryLength >= 10 && !newAchievements.includes('story_collector')) {
          newAchievements.push('story_collector')
        }

        // Week streak - 7 consecutive days
        // Check after adding new session to include today
        const historyWithNew = [newSession, ...state.history]
        if (!newAchievements.includes('week_streak') && checkWeekStreak(historyWithNew)) {
          newAchievements.push('week_streak')
        }

        // Track newly unlocked achievements
        const newlyUnlocked = newAchievements.filter(
          id => !state.achievements.includes(id)
        )

        set((state) => ({
          history: [newSession, ...state.history],
          achievements: newAchievements,
          recentlyUnlocked: newlyUnlocked,
          currentSession: initialState.currentSession
        }))

        // Record check-in after successful dream submission
        // Only check in if user is logged in (has token)
        const token = localStorage.getItem('yeelin_token')
        if (token) {
          try {
            const checkInResult = await checkInApi.checkIn()
            if (checkInResult.success && checkInResult.data) {
              set({
                checkedInToday: true,
                consecutiveDays: checkInResult.data.consecutiveDays
              })
            }
          } catch (error) {
            console.error('Failed to record check-in:', error)
          }
        }
      },

      removeFromHistory: (id) =>
        set((state) => ({
          history: state.history.filter((item) => item.id !== id)
        })),

      restoreItem: (item) =>
        set((state) => ({
          history: [item, ...state.history]
        })),

      toggleFavorite: (id) => {
        let sessionId: string | undefined
        set((state) => {
          const item = state.history.find((item) => item.id === id)
          sessionId = item?.sessionId
          return {
            history: state.history.map((item) =>
              item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
            )
          }
        })
        if (sessionId) {
          apiWithRetry.toggleStoryFavorite(sessionId)
            .catch(err => {
              console.error('Failed to sync favorite to backend:', err)
              toastCallback?.('收藏同步失败，请检查网络', 'error')
            })
        }
      },

      updatePrivateNote: (id, note) =>
        set((state) => ({
          history: state.history.map((item) =>
            item.id === id ? { ...item, privateNote: note } : item
          )
        })),

      updateTags: (id, tags) =>
        set((state) => ({
          history: state.history.map((item) =>
            item.id === id ? { ...item, tags } : item
          )
        })),

      clearHistory: () =>
        set({ history: [] }),

      setHistory: (history) =>
        set({ history }),

      loadFromHistory: (item) =>
        set({
          currentSession: {
            sessionId: item.sessionId || '',
            openid: '',
            dreamText: item.dreamSnippet,
            dreamElements: [],
            questions: item.questions,
            answers: item.answers,
            currentQuestionIndex: 0,
            story: item.story,
            storyTitle: item.storyTitle,
            status: 'completed'
          }
        }),

      unlockAchievement: (id) =>
        set((state) => {
          if (state.achievements.includes(id)) return state
          const newAchievements = [...state.achievements, id]
          // Sync to server in background with retry
          apiWithRetry.syncAchievements(newAchievements)
            .catch(err => {
              console.error('Failed to sync achievement to server:', err)
              toastCallback?.('成就同步失败', 'error')
            })
          return {
            achievements: newAchievements,
            recentlyUnlocked: [...state.recentlyUnlocked, id]
          }
        }),

      clearRecentlyUnlocked: (id) =>
        set((state) => ({
          recentlyUnlocked: state.recentlyUnlocked.filter(item => item !== id)
        })),

      syncAchievementsFromServer: async () => {
        try {
          const response = await achievementApi.getAchievements()
          if (response.success && response.data) {
            const serverMedals = response.data.medals || []
            set((state) => {
              // Merge server medals with local (union of both)
              const mergedMedals = [...new Set([...state.achievements, ...serverMedals])]
              return { achievements: mergedMedals }
            })
          }
        } catch (err) {
          console.error('Failed to sync achievements from server:', err)
        }
      },

      addPoints: (amount) =>
        set((state) => ({
          points: state.points + amount
        })),

      unlockMedal: (medalId) =>
        set((state) => {
          if (state.medals.includes(medalId)) return state
          return { medals: [...state.medals, medalId] }
        }),

      setShareStats: (stats) =>
        set(() => ({
          points: stats.points,
          medals: stats.medals || [],
          consecutiveShares: stats.consecutiveShares,
          lastShareDate: stats.lastShareDate
        })),

      setFontSize: (size) =>
        set({ fontSize: size }),

      setTheme: (theme) =>
        set({ theme }),

      setReduceMotion: (reduce) =>
        set({ reduceMotion: reduce }),

      setAmbientSound: (sound) =>
        set({ ambientSound: sound }),

      setAmbientVolume: (volume) =>
        set({ ambientVolume: volume }),

      reset: () =>
        set({ currentSession: initialState.currentSession }),

      // Auth actions
      setUser: (user, token = null, previousOpenid) => {
        if (token) {
          localStorage.setItem('yeelin_token', token)
        }
        // Also update the auth store
        useAuthStore.getState().setUser(user, token)
        set({ user, token: token ?? null })
        // Sync achievements from server when user logs in
        if (user) {
          useDreamStore.getState().syncAchievementsFromServer()
        }
        // Migrate history items from guest openid to logged-in openid
        if (user && previousOpenid && previousOpenid !== user.openid) {
          set((state) => ({
            history: state.history.map(item =>
              item.openid === previousOpenid
                ? { ...item, openid: user.openid }
                : item
            )
          }))
        }
      },

      logout: () => {
        localStorage.removeItem('yeelin_openid')
        localStorage.removeItem('yeelin_token')
        // Clear the persist storage entirely
        localStorage.removeItem('yeelin-dream-storage')
        // Also clear the auth store
        useAuthStore.getState().logout()
        // Reset to initial state
        set({
          ...initialState,
          user: null,
          token: null,
          friends: [],
          pendingRequests: { received: [], sent: [] },
          currentSession: initialState.currentSession,
          history: []
        })
      },

      // Friend actions
      setFriends: (friends) =>
        set({ friends }),

      setPendingRequests: (received: PendingRequest[], sent: PendingRequest[]) =>
        set({ pendingRequests: { received, sent } }),

      addFriend: (friend) =>
        set((state) => ({ friends: [...state.friends, friend] })),

      removeFriend: (friendId) =>
        set((state) => ({
          friends: state.friends.filter(f => f.friendId !== friendId)
        })),

      // Check-in actions
      setCheckInStatus: (checkedInToday, consecutiveDays) =>
        set({ checkedInToday, consecutiveDays })
    }),
    {
      name: 'yeelin-dream-storage',
      partialize: (state) => ({
        history: state.history,
        achievements: state.achievements,
        currentSession: state.currentSession,
        fontSize: state.fontSize,
        theme: state.theme,
        ambientSound: state.ambientSound,
        ambientVolume: state.ambientVolume,
        points: state.points,
        medals: state.medals,
        consecutiveShares: state.consecutiveShares,
        lastShareDate: state.lastShareDate,
        user: state.user,
        token: state.token,
        friends: state.friends,
        checkedInToday: state.checkedInToday,
        consecutiveDays: state.consecutiveDays
      })
    }
  )
)
