import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface DreamSession {
  id: string
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
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_dream',
    title: '初入梦境',
    description: '记录你的第一个梦境',
    icon: '🌙'
  },
  {
    id: 'week_streak',
    title: '连续7天',
    description: '连续7天记录梦境',
    icon: '⭐'
  },
  {
    id: 'story_collector',
    title: '故事收藏家',
    description: '保存10个故事',
    icon: '📚'
  }
]

interface DreamState {
  // Current session
  currentSession: {
    sessionId: string
    openid: string
    dreamText: string
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

  // Settings
  fontSize: 'small' | 'medium' | 'large'
  theme: 'starry' | 'aurora' | 'highcontrast'
  ambientSound: 'none' | 'dreamPad' | 'whiteNoise' | 'rain'
  ambientVolume: number

  // Actions
  setSessionId: (id: string) => void
  setOpenid: (id: string) => void
  setDreamText: (text: string) => void
  setQuestions: (questions: string[]) => void
  setAnswer: (index: number, answer: string) => void
  nextQuestion: () => void
  prevQuestion: () => void
  setStory: (title: string, content: string) => void
  setStatus: (status: DreamState['currentSession']['status']) => void
  addToHistory: () => void
  removeFromHistory: (id: string) => void
  restoreItem: (item: DreamSession) => void
  clearHistory: () => void
  loadFromHistory: (item: DreamSession) => void
  toggleFavorite: (id: string) => void
  updatePrivateNote: (id: string, note: string) => void
  updateTags: (id: string, tags: string[]) => void
  unlockAchievement: (id: string) => void
  clearRecentlyUnlocked: (id: string) => void
  setFontSize: (size: 'small' | 'medium' | 'large') => void
  setTheme: (theme: 'starry' | 'aurora' | 'highcontrast') => void
  setAmbientSound: (sound: 'none' | 'dreamPad' | 'whiteNoise' | 'rain') => void
  setAmbientVolume: (volume: number) => void
  reset: () => void
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
  fontSize: 'medium' as const,
  theme: 'starry' as const,
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

      setQuestions: (questions) =>
        set((state) => ({
          currentSession: {
            ...state.currentSession,
            questions,
            answers: new Array(questions.length).fill(''),
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

      addToHistory: () => {
        const state = get()
        const { dreamText, questions, answers, storyTitle, story } = state.currentSession

        if (!dreamText || !story) return

        const newSession: DreamSession = {
          id: Date.now().toString(),
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
      },

      removeFromHistory: (id) =>
        set((state) => ({
          history: state.history.filter((item) => item.id !== id)
        })),

      restoreItem: (item) =>
        set((state) => ({
          history: [item, ...state.history]
        })),

      toggleFavorite: (id) =>
        set((state) => ({
          history: state.history.map((item) =>
            item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
          )
        })),

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

      loadFromHistory: (item) =>
        set({
          currentSession: {
            sessionId: '',
            openid: '',
            dreamText: item.dreamSnippet,
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
          return { achievements: [...state.achievements, id] }
        }),

      clearRecentlyUnlocked: (id) =>
        set((state) => ({
          recentlyUnlocked: state.recentlyUnlocked.filter(item => item !== id)
        })),

      setFontSize: (size) =>
        set({ fontSize: size }),

      setTheme: (theme) =>
        set({ theme }),

      setAmbientSound: (sound) =>
        set({ ambientSound: sound }),

      setAmbientVolume: (volume) =>
        set({ ambientVolume: volume }),

      reset: () =>
        set({ currentSession: initialState.currentSession })
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
        ambientVolume: state.ambientVolume
      })
    }
  )
)
