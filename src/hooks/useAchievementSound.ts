import { useCallback, useRef } from 'react'

type SoundType = 'unlock' | 'complete' | 'success' | 'celebration'

// Web Audio API context singleton
let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
  }
  return audioContext
}

// Musical note frequencies for pleasant sounds
const NOTE_FREQUENCIES = {
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  F4: 349.23,
  G4: 392.00,
  A4: 440.00,
  B4: 493.88,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
}

// Generate a pleasant chime sound
function createChimeSound(ctx: AudioContext, type: SoundType): void {
  const now = ctx.currentTime

  // Create master gain
  const masterGain = ctx.createGain()
  masterGain.connect(ctx.destination)
  masterGain.gain.setValueAtTime(0.3, now)
  masterGain.gain.exponentialRampToValueAtTime(0.01, now + 1.5)

  if (type === 'unlock') {
    // Pleasant ascending arpeggio for achievement unlock
    const notes = [NOTE_FREQUENCIES.C4, NOTE_FREQUENCIES.E4, NOTE_FREQUENCIES.G4, NOTE_FREQUENCIES.C5]
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now + i * 0.1)

      gain.gain.setValueAtTime(0, now + i * 0.1)
      gain.gain.linearRampToValueAtTime(0.3, now + i * 0.1 + 0.05)
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.8)

      osc.connect(gain)
      gain.connect(masterGain)

      osc.start(now + i * 0.1)
      osc.stop(now + i * 0.1 + 0.8)
    })
  } else if (type === 'complete') {
    // Gentle completion sound - single pleasant tone
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(NOTE_FREQUENCIES.G4, now)
    osc.frequency.exponentialRampToValueAtTime(NOTE_FREQUENCIES.C5, now + 0.3)

    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.4, now + 0.05)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 1)

    osc.connect(gain)
    gain.connect(masterGain)

    osc.start(now)
    osc.stop(now + 1)
  } else if (type === 'success') {
    // Quick positive confirmation
    const notes = [NOTE_FREQUENCIES.E4, NOTE_FREQUENCIES.G4]
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now)

      gain.gain.setValueAtTime(0, now + i * 0.08)
      gain.gain.linearRampToValueAtTime(0.25, now + i * 0.08 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.08 + 0.5)

      osc.connect(gain)
      gain.connect(masterGain)

      osc.start(now + i * 0.08)
      osc.stop(now + i * 0.08 + 0.5)
    })
  } else if (type === 'celebration') {
    // More elaborate celebration with sparkle effect
    const baseNotes = [NOTE_FREQUENCIES.C5, NOTE_FREQUENCIES.E5, NOTE_FREQUENCIES.G4, NOTE_FREQUENCIES.C5]
    const delays = [0, 0.1, 0.2, 0.4]

    baseNotes.forEach((freq, i) => {
      // Main tone
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now + delays[i])

      gain.gain.setValueAtTime(0, now + delays[i])
      gain.gain.linearRampToValueAtTime(0.25, now + delays[i] + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.01, now + delays[i] + 0.6)

      osc.connect(gain)
      gain.connect(masterGain)

      osc.start(now + delays[i])
      osc.stop(now + delays[i] + 0.6)

      // Sparkle - higher frequency overtone
      const sparkle = ctx.createOscillator()
      const sparkleGain = ctx.createGain()

      sparkle.type = 'sine'
      sparkle.frequency.setValueAtTime(freq * 2, now + delays[i] + 0.05)

      sparkleGain.gain.setValueAtTime(0, now + delays[i] + 0.05)
      sparkleGain.gain.linearRampToValueAtTime(0.1, now + delays[i] + 0.07)
      sparkleGain.gain.exponentialRampToValueAtTime(0.01, now + delays[i] + 0.3)

      sparkle.connect(sparkleGain)
      sparkleGain.connect(masterGain)

      sparkle.start(now + delays[i] + 0.05)
      sparkle.stop(now + delays[i] + 0.3)
    })
  }
}

export function useAchievementSound() {
  const enabledRef = useRef(true)

  const playSound = useCallback((type: SoundType) => {
    if (!enabledRef.current) return

    try {
      // Resume audio context if suspended (browser autoplay policy)
      const ctx = getAudioContext()
      if (ctx.state === 'suspended') {
        ctx.resume()
      }

      createChimeSound(ctx, type)
    } catch (e) {
      // Silently fail if audio isn't available
      console.debug('Audio playback failed:', e)
    }
  }, [])

  const setEnabled = useCallback((enabled: boolean) => {
    enabledRef.current = enabled
  }, [])

  return { playSound, setEnabled }
}
