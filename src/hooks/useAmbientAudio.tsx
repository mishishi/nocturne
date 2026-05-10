import { useRef, useCallback, useEffect } from 'react'
import { useDreamStore } from './useDreamStore'

export type AmbientSoundType = 'none' | 'dreamPad' | 'whiteNoise' | 'rain'

export function useAmbientAudio() {
  const audioContextRef = useRef<AudioContext | null>(null)
  const nodesRef = useRef<{
    oscillators: OscillatorNode[]
    gains: GainNode[]
    lfo: OscillatorNode | null
    lfoGain: GainNode | null
    masterGain: GainNode | null
    filter: BiquadFilterNode | null
    noiseSource: AudioBufferSourceNode | null
    shimmerLfo: OscillatorNode | null
    shimmerLfoGain: GainNode | null
  }>({
    oscillators: [],
    gains: [],
    lfo: null,
    lfoGain: null,
    masterGain: null,
    filter: null,
    noiseSource: null,
    shimmerLfo: null,
    shimmerLfoGain: null
  })

  const { ambientSound, ambientVolume, setAmbientSound, setAmbientVolume } = useDreamStore()

  // Initialize AudioContext
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new AudioContext()
    }
    return audioContextRef.current
  }, [])

  // Stop all audio
  const stopAll = useCallback(() => {
    const nodes = nodesRef.current

    // Stop oscillators
    nodes.oscillators.forEach(osc => {
      try { osc.stop() } catch (e) { /* ignore */ }
    })
    nodes.oscillators = []

    // Stop LFO
    if (nodes.lfo) {
      try { nodes.lfo.stop() } catch (e) { /* ignore */ }
      nodes.lfo = null
    }

    // Stop noise source
    if (nodes.noiseSource) {
      try { nodes.noiseSource.stop() } catch (e) { /* ignore */ }
      nodes.noiseSource = null
    }

    // Disconnect all
    nodes.gains.forEach(gain => {
      try { gain.disconnect() } catch (e) { /* ignore */ }
    })
    nodes.gains = []

    if (nodes.lfoGain) {
      try { nodes.lfoGain.disconnect() } catch (e) { /* ignore */ }
      nodes.lfoGain = null
    }

    if (nodes.filter) {
      try { nodes.filter.disconnect() } catch (e) { /* ignore */ }
      nodes.filter = null
    }

    if (nodes.masterGain) {
      try { nodes.masterGain.disconnect() } catch (e) { /* ignore */ }
      nodes.masterGain = null
    }

    // Stop shimmer LFO
    if (nodes.shimmerLfo) {
      try { nodes.shimmerLfo.stop() } catch (e) { /* ignore */ }
      nodes.shimmerLfo = null
    }

    if (nodes.shimmerLfoGain) {
      try { nodes.shimmerLfoGain.disconnect() } catch (e) { /* ignore */ }
      nodes.shimmerLfoGain = null
    }
  }, [])

  // Create Dream Pad - ethereal ambient pad
  const startDreamPad = useCallback((ctx: AudioContext, volume: number) => {
    const nodes = nodesRef.current

    // Master gain
    const masterGain = ctx.createGain()
    masterGain.gain.value = volume * 0.3
    masterGain.connect(ctx.destination)
    nodes.masterGain = masterGain

    // Low-pass filter for warmth
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 800
    filter.Q.value = 0.5
    filter.connect(masterGain)
    nodes.filter = filter

    // LFO for breathing effect
    const lfo = ctx.createOscillator()
    lfo.type = 'sine'
    lfo.frequency.value = 0.08 // Very slow: ~12 seconds per cycle

    const lfoGain = ctx.createGain()
    lfoGain.gain.value = 0.15 // Subtle modulation depth
    lfo.connect(lfoGain)
    lfo.start()
    nodes.lfo = lfo
    nodes.lfoGain = lfoGain

    // Base frequencies: A1 + E2 + A2 (Am chord)
    const frequencies = [55, 82.41, 110, 164.81]

    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = i < 2 ? 'sine' : 'triangle'
      osc.frequency.value = freq

      // Connect LFO to gain for breathing
      lfoGain.connect(gain.gain)

      // Slight detune for richness
      osc.detune.value = (i % 2 === 0 ? 1 : -1) * (i * 3)

      gain.gain.value = i < 2 ? 0.3 : 0.15

      osc.connect(gain)
      gain.connect(filter)
      osc.start()

      nodes.oscillators.push(osc)
      nodes.gains.push(gain)
    })

    // Add subtle high frequency shimmer
    const shimmerOsc = ctx.createOscillator()
    const shimmerGain = ctx.createGain()
    shimmerOsc.type = 'sine'
    shimmerOsc.frequency.value = 880
    shimmerGain.gain.value = 0

    // Shimmer LFO (faster)
    const shimmerLfo = ctx.createOscillator()
    const shimmerLfoGain = ctx.createGain()
    shimmerLfo.type = 'sine'
    shimmerLfo.frequency.value = 0.3
    shimmerLfoGain.gain.value = 0.05
    shimmerLfo.connect(shimmerLfoGain)
    shimmerLfoGain.connect(shimmerGain.gain)
    shimmerLfo.start()

    shimmerOsc.connect(shimmerGain)
    shimmerGain.connect(filter)
    shimmerOsc.start()

    nodes.oscillators.push(shimmerOsc)
    nodes.gains.push(shimmerGain)
    nodes.shimmerLfo = shimmerLfo
    nodes.shimmerLfoGain = shimmerLfoGain

    return true
  }, [])

  // Create White Noise
  const startWhiteNoise = useCallback((ctx: AudioContext, volume: number) => {
    const nodes = nodesRef.current

    // Create noise buffer
    const bufferSize = ctx.sampleRate * 2
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1
    }

    const noiseSource = ctx.createBufferSource()
    noiseSource.buffer = buffer
    noiseSource.loop = true

    // Low-pass filter for softer sound
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 4000
    filter.Q.value = 0.3

    // Master gain
    const masterGain = ctx.createGain()
    masterGain.gain.value = volume * 0.4

    noiseSource.connect(filter)
    filter.connect(masterGain)
    masterGain.connect(ctx.destination)

    noiseSource.start()
    nodes.noiseSource = noiseSource
    nodes.filter = filter
    nodes.masterGain = masterGain

    return true
  }, [])

  // Create Rain Sound
  const startRain = useCallback((ctx: AudioContext, volume: number) => {
    const nodes = nodesRef.current

    // Create noise buffer (for rain)
    const bufferSize = ctx.sampleRate * 2
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1
    }

    const noiseSource = ctx.createBufferSource()
    noiseSource.buffer = buffer
    noiseSource.loop = true

    // High-pass to remove low rumble
    const highpass = ctx.createBiquadFilter()
    highpass.type = 'highpass'
    highpass.frequency.value = 800
    highpass.Q.value = 0.5

    // Low-pass for rain texture
    const lowpass = ctx.createBiquadFilter()
    lowpass.type = 'lowpass'
    lowpass.frequency.value = 8000
    lowpass.Q.value = 0.3

    // Master gain
    const masterGain = ctx.createGain()
    masterGain.gain.value = volume * 0.5

    noiseSource.connect(highpass)
    highpass.connect(lowpass)
    lowpass.connect(masterGain)
    masterGain.connect(ctx.destination)

    noiseSource.start()
    nodes.noiseSource = noiseSource
    nodes.filter = lowpass
    nodes.masterGain = masterGain

    return true
  }, [])

  // Start sound
  const startSound = useCallback((type: AmbientSoundType, volume: number) => {
    stopAll()

    if (type === 'none') return

    const ctx = getAudioContext()
    if (ctx.state === 'suspended') {
      ctx.resume()
    }

    switch (type) {
      case 'dreamPad':
        startDreamPad(ctx, volume)
        break
      case 'whiteNoise':
        startWhiteNoise(ctx, volume)
        break
      case 'rain':
        startRain(ctx, volume)
        break
    }
  }, [getAudioContext, stopAll, startDreamPad, startWhiteNoise, startRain])

  // Toggle play/pause
  const togglePlay = useCallback(() => {
    if (ambientSound === 'none') return

    const ctx = getAudioContext()
    if (ctx.state === 'running') {
      ctx.suspend()
    } else {
      ctx.resume()
      if (nodesRef.current.masterGain === null) {
        startSound(ambientSound, ambientVolume)
      }
    }
  }, [ambientSound, ambientVolume, getAudioContext, startSound])

  // Change sound type
  const changeSound = useCallback((type: AmbientSoundType) => {
    setAmbientSound(type)
    if (type !== 'none') {
      startSound(type, ambientVolume)
    } else {
      stopAll()
    }
  }, [setAmbientSound, startSound, ambientVolume, stopAll])

  // Change volume
  const changeVolume = useCallback((vol: number) => {
    setAmbientVolume(vol)
    const masterGain = nodesRef.current.masterGain
    if (masterGain) {
      // Use a small delay to avoid clicks
      masterGain.gain.setTargetAtTime(vol * 0.4, audioContextRef.current?.currentTime || 0, 0.1)
    }
  }, [setAmbientVolume])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAll()
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [stopAll])

  // Restart sound when sound type changes externally
  useEffect(() => {
    if (ambientSound !== 'none' && !nodesRef.current.masterGain) {
      startSound(ambientSound, ambientVolume)
    }
  }, [ambientSound, ambientVolume, startSound])

  return {
    soundType: ambientSound,
    volume: ambientVolume,
    togglePlay,
    changeSound,
    changeVolume,
    isPlaying: audioContextRef.current?.state === 'running'
  }
}

export const AMBIENT_SOUNDS = [
  { id: 'none' as AmbientSoundType, label: '关闭', icon: 'mute' },
  { id: 'dreamPad' as AmbientSoundType, label: '梦境音垫', icon: 'moon' },
  { id: 'whiteNoise' as AmbientSoundType, label: '白噪音', icon: 'mist' },
  { id: 'rain' as AmbientSoundType, label: '雨声', icon: 'rain' }
]

export const AMBIENT_ICONS: Record<string, { d: string; viewBox?: string; fill?: string; stroke?: string; strokeWidth?: string }> = {
  mute: { d: 'M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z', fill: 'none', stroke: 'currentColor', strokeWidth: '1.5', viewBox: '0 0 24 24' },
  moon: { d: 'M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z', fill: 'none', stroke: 'currentColor', strokeWidth: '1.5', viewBox: '0 0 24 24' },
  mist: { d: 'M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242M8 17h.01M8 13h.01M12 17h.01', fill: 'none', stroke: 'currentColor', strokeWidth: '1.5', viewBox: '0 0 24 24' },
  rain: { d: 'M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242M8 17h.01M12 17h.01M16 17h.01M8 13h.01M12 13h.01', fill: 'none', stroke: 'currentColor', strokeWidth: '1.5', viewBox: '0 0 24 24' }
}

export function AmbientIcon({ iconKey, className }: { iconKey: string; className?: string }) {
  const icon = AMBIENT_ICONS[iconKey]
  if (!icon) return null
  return (
    <svg viewBox={icon.viewBox || '0 0 24 24'} fill={icon.fill || 'none'} stroke={icon.stroke || 'currentColor'} strokeWidth={icon.strokeWidth || '1.5'} className={className}>
      <path d={icon.d} />
    </svg>
  )
}
