import { useState, useEffect, useRef, useCallback } from 'react'

interface UseVoiceWaveformReturn {
  startWaveform: () => Promise<void>
  stopWaveform: () => void
  isActive: boolean
  canvasRef: React.RefObject<HTMLCanvasElement>
}

export function useVoiceWaveform(): UseVoiceWaveformReturn {
  const [isActive, setIsActive] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const analyser = analyserRef.current
    if (!canvas || !analyser) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    analyser.getByteTimeDomainData(dataArray)

    // Clear canvas
    ctx.fillStyle = 'rgba(13, 27, 42, 0.3)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw waveform
    ctx.lineWidth = 2
    ctx.strokeStyle = 'rgba(244, 211, 94, 0.9)'
    ctx.beginPath()

    const sliceWidth = canvas.width / bufferLength
    let x = 0

    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0
      const y = (v * canvas.height) / 2

      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }

      x += sliceWidth
    }

    ctx.lineTo(canvas.width, canvas.height / 2)
    ctx.stroke()

    // Draw mirror effect (subtle)
    ctx.strokeStyle = 'rgba(231, 111, 81, 0.4)'
    ctx.beginPath()
    x = 0
    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0
      const y = canvas.height - (v * canvas.height) / 2

      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }

      x += sliceWidth
    }
    ctx.stroke()

    animationFrameRef.current = requestAnimationFrame(draw)
  }, [])

  const startWaveform = useCallback(async () => {
    try {
      // Get microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Create audio context and analyser
      const audioContext = new AudioContext()
      audioContextRef.current = audioContext

      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 2048
      analyser.smoothingTimeConstant = 0.8
      analyserRef.current = analyser

      // Connect microphone to analyser
      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)

      // Start drawing
      setIsActive(true)
      draw()
    } catch (err) {
      console.error('Failed to access microphone:', err)
      setIsActive(false)
    }
  }, [draw])

  const stopWaveform = useCallback(() => {
    // Stop animation
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    // Stop microphone stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    // Clear canvas
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.fillStyle = 'rgba(13, 27, 42, 0)'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }
    }

    analyserRef.current = null
    setIsActive(false)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopWaveform()
    }
  }, [stopWaveform])

  return {
    startWaveform,
    stopWaveform,
    isActive,
    canvasRef
  }
}
