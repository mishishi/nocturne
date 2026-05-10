import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { checkInApi, achievementApi, apiWithRetry, authApi } from '../services/api'
import { useAuthStore } from './useAuthStore'
import { openidService } from '../services/openidService'
import { storage } from '../services/storageService'
import { getAuthToken, setAuthToken, clearAuthToken, markLogout, markLogin } from '../utils/auth'

// Zustand persist 存储适配器 - 直接使用原生 localStorage
// 注意：storageService 的 prefix 机制与 Zustand persist 的 name 冲突，
// 为避免 key 不匹配，直接使用原生 localStorage
// eslint-disable-next-line @typescript-eslint/no-explicit any
const storageAdapter = {
  getItem: (name: string): string | null => {
    try {
      // 优先查找正确 key，其次查找旧版双重前缀 key（兼容迁移）
      const correct = localStorage.getItem(name)
      if (correct) {
        // 防御：如果存储的是 [object Object] 或无效 JSON，清除并返回 null
        if (correct === '[object Object]' || (correct.startsWith('{') && !correct.endsWith('}'))) {
          console.warn(`[Storage] Detected corrupted data in ${name}, clearing...`)
          localStorage.removeItem(name)
          return null
        }
        try {
          JSON.parse(correct)
          return correct
        } catch {
          console.warn(`[Storage] Failed to parse ${name}, clearing...`)
          localStorage.removeItem(name)
          return null
        }
      }
      // 旧版 key 带了一层 yeelin_ 前缀
      const oldKey = 'yeelin_' + name
      const old = localStorage.getItem(oldKey)
      if (old) {
        // 迁移：删除旧 key
        localStorage.removeItem(oldKey)
        return old
      }
      // 明确返回 null 表示没有存储数据（不能返回 undefined，否则 Zustand persist 会视为"无数据"）
      return null
    } catch {
      return null
    }
  },
  setItem: (name: string, value: string): void => {
    try {
      localStorage.setItem(name, value)
    } catch {
      // Storage full or unavailable
    }
  },
  removeItem: (name: string): void => {
    try {
      localStorage.removeItem(name)
      localStorage.removeItem('yeelin_' + name) // 也清理旧 key
    } catch {
      // Ignore
    }
  }
};

import type { User } from '../types'

// Re-export User from shared types
export { type User } from '../types'

// Toast 通知回调函数（用于后台任务失败时通知用户）
type ToastCallback = (message: string, type: 'success' | 'error' | 'info') => void
let toastCallback: ToastCallback | null = null

/**
 * 注册 Toast 回调函数
 * 应在 App.tsx 初始化时调用
 */
export function registerToastCallback(fn: ToastCallback) {
  toastCallback = fn
}

/**
 * 注销 Toast 回调函数
 * 应在 App.tsx 卸载时调用，防止内存泄漏
 */
export function unregisterToastCallback() {
  toastCallback = null
}

/**
 * 显示 Toast 通知（供页面组件调用）
 */
export function showToast(message: string, type: 'success' | 'error' | 'info' = 'success') {
  toastCallback?.(message, type)
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
  { id: 'peaceful', label: '平静', icon: 'peaceful', color: '#64D8CB' },
  { id: 'adventure', label: '冒险', icon: 'adventure', color: '#F4A261' },
  { id: 'mystery', label: '神秘', icon: 'mystery', color: '#9B7EBD' },
  { id: 'nightmare', label: '噩梦', icon: 'nightmare', color: '#E76F51' },
  { id: 'joyful', label: '欢乐', icon: 'joyful', color: '#F4D35E' },
  { id: 'fantasy', label: '奇幻', icon: 'fantasy', color: '#A8DADC' }
]

// SVG icons for emotion tags (consistent dreamy style)
export const EMOTION_ICONS: Record<string, JSX.Element> = {
  peaceful: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  ),
  adventure: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 20h18L12 4z" />
      <path d="M12 4l4 8h-8l4-8z" />
    </svg>
  ),
  mystery: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  nightmare: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      <path d="M8 3l-1 2M16 3l1 2" strokeOpacity="0.5" />
      <path d="M3 12h2M19 12h2" strokeOpacity="0.5" />
    </svg>
  ),
  joyful: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  ),
  fantasy: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
      <path d="M5 19l1 3 1-3 3-1-3-1-1-3-1 3-3 1 3 1zM19 5l0.75 2.25L22 8l-2.25.75L19 11l-.75-2.25L16 8l2.25-.75L19 5z" strokeOpacity="0.6" />
    </svg>
  )
}

export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  unlockedAt?: string
  // 解锁条件提示（未解锁时显示）
  hint?: string
}

// Medal definitions (mirrors server-side MEDALS)
export const MEDALS = [
  { id: 'moonlight', name: '月光勋章', icon: '🌙', description: '朋友圈首次分享' },
  { id: 'newmoon', name: '新月勋章', icon: '🌑', description: '邀请好友成功' },
  { id: 'meteor', name: '流星成就', icon: '☄️', description: '连续分享7天' }
]

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
  },
  {
    id: 'first_share',
    title: '初次分享',
    description: '首次分享梦境到梦墙',
    icon: '🔗',
    hint: '分享故事到梦墙即可解锁'
  },
  {
    id: 'social_butterfly',
    title: '社交蝴蝶',
    description: '拥有5位好友',
    icon: '🦋',
    hint: '添加更多好友以解锁'
  },
  {
    id: 'dream_wall_contributor',
    title: '梦墙使者',
    description: '在梦墙发布3篇内容',
    icon: '🌌',
    hint: '在梦墙发布更多内容'
  },
  {
    id: 'early_bird',
    title: '早起鸟',
    description: '连续签到3天',
    icon: '🐦',
    hint: '坚持每日签到'
  },
  {
    id: 'reflective',
    title: '内省者',
    description: '为5个故事添加私人笔记',
    icon: '📝',
    hint: '在故事详情页添加笔记'
  },
  {
    id: 'tag_explorer',
    title: '标签探索者',
    description: '使用过所有梦境标签',
    icon: '🏷️',
    hint: '尝试使用不同标签记录梦境'
  },
  {
    id: 'popular_dream',
    title: '人气梦境',
    description: '单篇梦墙内容获得10个赞',
    icon: '💖',
    hint: '发布优质内容吸引更多点赞'
  },
  {
    id: 'dream_master',
    title: '梦境大师',
    description: '解锁所有其他成就',
    icon: '👑',
    hint: '继续探索，解锁所有成就'
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

  // Achievement tracking
  wallPostCount: number  // Track wall posts for dream_wall_contributor
  hasSharedToWall: boolean  // Track first_share
  tagsUsed: string[]  // Track unique tags used

  // Hydration state (for auth-dependent content)
  _hasHydrated: boolean

  // Settings
  fontSize: 'small' | 'medium' | 'large'
  theme: 'starry' | 'aurora' | 'dark' | 'light'
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
  deductPoints: (amount: number) => boolean  // Returns false if insufficient points
  unlockMedal: (medalId: string) => void
  setShareStats: (stats: { points: number; medals: string[]; consecutiveShares: number; lastShareDate: string | null }) => void
  setFontSize: (size: 'small' | 'medium' | 'large') => void
  setTheme: (theme: 'starry' | 'aurora' | 'dark' | 'light') => void
  setReduceMotion: (reduce: boolean) => void
  setAmbientSound: (sound: 'none' | 'dreamPad' | 'whiteNoise' | 'rain') => void
  setAmbientVolume: (volume: number) => void
  incrementWallPostCount: () => void
  setHasSharedToWall: (shared: boolean) => void
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
  checkAndUnlockAchievements: () => void
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
  wallPostCount: 0,
  hasSharedToWall: false,
  tagsUsed: [],
  _hasHydrated: false,
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

        // Track tags used across all history
        const allTags = [...new Set([...state.tagsUsed, ...newSession.tags])]

        // Tag explorer - use all 6 different tags
        if (allTags.length >= 6 && !newAchievements.includes('tag_explorer')) {
          newAchievements.push('tag_explorer')
        }

        // Reflective - 5 stories with private notes
        const storiesWithNotes = historyWithNew.filter(s => s.privateNote && s.privateNote.trim().length > 0).length
        if (storiesWithNotes >= 5 && !newAchievements.includes('reflective')) {
          newAchievements.push('reflective')
        }

        // Track newly unlocked achievements
        const newlyUnlocked = newAchievements.filter(
          id => !state.achievements.includes(id)
        )

        set((state) => ({
          history: [newSession, ...state.history],
          achievements: newAchievements,
          recentlyUnlocked: newlyUnlocked,
          tagsUsed: allTags,
          currentSession: initialState.currentSession
        }))

        // Record check-in after successful dream submission
        // Only check in if user is logged in (has token)
        const token = getAuthToken()
        if (token) {
          try {
            const checkInResult = await checkInApi.checkIn()
            if (checkInResult.success && checkInResult.data) {
              set({
                checkedInToday: true,
                consecutiveDays: checkInResult.data.consecutiveDays
              })
              // Check early_bird achievement (3 consecutive days)
              if (checkInResult.data.consecutiveDays >= 3) {
                get().checkAndUnlockAchievements()
              }
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

      deductPoints: (amount) => {
        const state = get()
        if (state.points < amount) return false
        set({ points: state.points - amount })
        return true
      },

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

      incrementWallPostCount: () =>
        set((state) => {
          const newCount = state.wallPostCount + 1
          const newAchievements = [...state.achievements]

          // First share achievement
          if (!state.hasSharedToWall && !newAchievements.includes('first_share')) {
            newAchievements.push('first_share')
          }

          // Dream wall contributor - 3 posts
          if (newCount >= 3 && !newAchievements.includes('dream_wall_contributor')) {
            newAchievements.push('dream_wall_contributor')
          }

          const newlyUnlocked = newAchievements.filter(
            id => !state.achievements.includes(id)
          )

          return {
            wallPostCount: newCount,
            hasSharedToWall: true,
            achievements: newAchievements,
            recentlyUnlocked: newlyUnlocked.length > 0
              ? [...state.recentlyUnlocked, ...newlyUnlocked]
              : state.recentlyUnlocked
          }
        }),

      setHasSharedToWall: (shared) =>
        set({ hasSharedToWall: shared }),

      checkAndUnlockAchievements: () => {
        const state = get()
        const newAchievements = [...state.achievements]

        // Early bird - 3 consecutive check-in days
        if (state.consecutiveDays >= 3 && !newAchievements.includes('early_bird')) {
          newAchievements.push('early_bird')
        }

        // Social butterfly - 5 friends
        if (state.friends.length >= 5 && !newAchievements.includes('social_butterfly')) {
          newAchievements.push('social_butterfly')
        }

        // Dream master - all other achievements unlocked
        const otherAchievements = ACHIEVEMENTS.filter(a =>
          a.id !== 'dream_master' && !newAchievements.includes(a.id)
        )
        if (otherAchievements.length === 0 && !newAchievements.includes('dream_master')) {
          newAchievements.push('dream_master')
        }

        if (newAchievements.length > state.achievements.length) {
          const newlyUnlocked = newAchievements.filter(
            id => !state.achievements.includes(id)
          )
          set({
            achievements: newAchievements,
            recentlyUnlocked: [...state.recentlyUnlocked, ...newlyUnlocked]
          })
        }
      },

      reset: () =>
        set({ currentSession: initialState.currentSession }),

      // Auth actions
      setUser: (user, token = null, previousOpenid) => {
        if (token) {
          setAuthToken(token)
        }
        // Also update the auth store
        useAuthStore.getState().setUser(user, token)
        set({ user, token: token ?? null })
        // Mark user as logged in for hasValidToken() check
        if (user) {
          markLogin()
          // Sync achievements from server when user logs in
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

      logout: async () => {
        // 调用后端接口清除 httpOnly cookies
        try {
          await authApi.logout()
        } catch (e) {
          console.warn('[Logout] 后端登出失败，继续本地登出流程', e)
        }
        openidService.remove()
        // Clear token Cookie
        clearAuthToken()
        // Clear login state flag
        markLogout()
        // Clear refresh token
        clearRefreshToken()
        // Also clear the auth store
        useAuthStore.getState().logout()
        // Reset to initial state (preserve persist settings like theme, fontSize)
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
      storage: storageAdapter,
      partialize: (state) => ({
        // Limit history to last 50 items to prevent localStorage bloat
        history: state.history.slice(0, 50),
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
        // token removed - stored in Cookie for security
        // friends removed - should be loaded from API, not persisted
        checkedInToday: state.checkedInToday,
        consecutiveDays: state.consecutiveDays,
        wallPostCount: state.wallPostCount,
        hasSharedToWall: state.hasSharedToWall,
        tagsUsed: state.tagsUsed
      }) as DreamState,
      // Restore login state flag when rehydrating user
      onRehydrateStorage: () => (state) => {
        // Mark store as hydrated after rehydration completes
        if (state) {
          state._hasHydrated = true
        }
        if (state?.user) {
          markLogin()
        }
      }
    }
  )
)
