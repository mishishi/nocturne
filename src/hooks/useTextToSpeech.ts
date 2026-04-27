import { useState, useEffect, useCallback, useRef } from 'react'

interface UseTextToSpeechReturn {
  speak: (text: string) => void
  stop: () => void
  pause: () => void
  resume: () => void
  isSpeaking: boolean
  isPaused: boolean
  isSupported: boolean
  voices: SpeechSynthesisVoice[]
  selectedVoice: SpeechSynthesisVoice | null
  setVoice: (voice: SpeechSynthesisVoice) => void
}

export function useTextToSpeech(): UseTextToSpeechReturn {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  useEffect(() => {
    if ('speechSynthesis' in window) {
      setIsSupported(true)

      const loadVoices = () => {
        const availableVoices = speechSynthesis.getVoices()
        // Filter for Chinese voices first, then default
        const chineseVoices = availableVoices.filter(v => v.lang.includes('zh'))
        const allVoices = [...chineseVoices, ...availableVoices]

        setVoices(allVoices)

        // Try to select a Chinese female voice
        const preferredVoice = chineseVoices.find(v =>
          v.lang.includes('zh-CN') && (v.name.includes('Female') || v.name.includes('女'))
        ) || chineseVoices.find(v => v.lang.includes('zh-CN')) || chineseVoices[0]

        if (preferredVoice) {
          setSelectedVoice(preferredVoice)
        } else if (allVoices.length > 0) {
          setSelectedVoice(allVoices[0])
        }
      }

      loadVoices()
      speechSynthesis.onvoiceschanged = loadVoices
    }

    return () => {
      if ('speechSynthesis' in window) {
        speechSynthesis.cancel()
      }
    }
  }, [])

  const speak = useCallback((text: string) => {
    if (!isSupported) return

    // Cancel any ongoing speech
    speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'zh-CN'
    utterance.rate = 0.85  // Slightly slow for readability
    utterance.pitch = 1.0

    if (selectedVoice) {
      utterance.voice = selectedVoice
    }

    utterance.onstart = () => {
      setIsSpeaking(true)
      setIsPaused(false)
    }

    utterance.onend = () => {
      setIsSpeaking(false)
      setIsPaused(false)
    }

    utterance.onerror = () => {
      setIsSpeaking(false)
      setIsPaused(false)
    }

    utterance.onpause = () => {
      setIsPaused(true)
    }

    utterance.onresume = () => {
      setIsPaused(false)
    }

    utteranceRef.current = utterance
    speechSynthesis.speak(utterance)
  }, [isSupported, selectedVoice])

  const stop = useCallback(() => {
    if (!isSupported) return
    speechSynthesis.cancel()
    setIsSpeaking(false)
    setIsPaused(false)
  }, [isSupported])

  const pause = useCallback(() => {
    if (!isSupported || !isSpeaking) return
    speechSynthesis.pause()
    setIsPaused(true)
  }, [isSupported, isSpeaking])

  const resume = useCallback(() => {
    if (!isSupported || !isPaused) return
    speechSynthesis.resume()
    setIsPaused(false)
  }, [isSupported, isPaused])

  const setVoice = useCallback((voice: SpeechSynthesisVoice) => {
    setSelectedVoice(voice)
  }, [])

  return {
    speak,
    stop,
    pause,
    resume,
    isSpeaking,
    isPaused,
    isSupported,
    voices,
    selectedVoice,
    setVoice
  }
}
