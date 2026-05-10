import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { storage } from '../services/storageService'

// Zustand persist 存储适配器 - 使用 storageService 实现内存缓存+防抖写入
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
} as any

interface SettingsState {
  fontSize: 'small' | 'medium' | 'large'
  theme: 'starry' | 'aurora' | 'dark' | 'light'
  language: 'zh-CN' | 'en'
  reduceMotion: boolean
  ambientSound: 'none' | 'dreamPad' | 'whiteNoise' | 'rain'
  ambientVolume: number
  setFontSize: (size: 'small' | 'medium' | 'large') => void
  setTheme: (theme: 'starry' | 'aurora' | 'dark' | 'light') => void
  setLanguage: (language: 'zh-CN' | 'en') => void
  setReduceMotion: (reduce: boolean) => void
  setAmbientSound: (sound: 'none' | 'dreamPad' | 'whiteNoise' | 'rain') => void
  setAmbientVolume: (volume: number) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      fontSize: 'medium',
      theme: 'starry',
      language: 'zh-CN',
      reduceMotion: false,
      ambientSound: 'none',
      ambientVolume: 0.5,

      setFontSize: (size) => set({ fontSize: size }),
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      setReduceMotion: (reduce) => set({ reduceMotion: reduce }),
      setAmbientSound: (sound) => set({ ambientSound: sound }),
      setAmbientVolume: (volume) => set({ ambientVolume: volume })
    }),
    {
      name: 'yeelin-settings-storage',
      storage: storageAdapter
    }
  )
)