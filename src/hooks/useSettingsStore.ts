import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsState {
  fontSize: 'small' | 'medium' | 'large'
  theme: 'starry' | 'aurora' | 'dark'
  reduceMotion: boolean
  ambientSound: 'none' | 'dreamPad' | 'whiteNoise' | 'rain'
  ambientVolume: number
  setFontSize: (size: 'small' | 'medium' | 'large') => void
  setTheme: (theme: 'starry' | 'aurora' | 'dark') => void
  setReduceMotion: (reduce: boolean) => void
  setAmbientSound: (sound: 'none' | 'dreamPad' | 'whiteNoise' | 'rain') => void
  setAmbientVolume: (volume: number) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      fontSize: 'medium',
      theme: 'starry',
      reduceMotion: false,
      ambientSound: 'none',
      ambientVolume: 0.5,

      setFontSize: (size) => set({ fontSize: size }),
      setTheme: (theme) => set({ theme }),
      setReduceMotion: (reduce) => set({ reduceMotion: reduce }),
      setAmbientSound: (sound) => set({ ambientSound: sound }),
      setAmbientVolume: (volume) => set({ ambientVolume: volume })
    }),
    {
      name: 'yeelin-settings-storage'
    }
  )
)