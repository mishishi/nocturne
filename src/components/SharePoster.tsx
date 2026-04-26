import { useRef, useCallback } from 'react'
import { Button } from './ui/Button'
import styles from './SharePoster.module.css'

interface SharePosterProps {
  storyTitle: string
  story: string
  date?: string
  onClose: () => void
}

export function SharePoster({ storyTitle, story, date, onClose }: SharePosterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const generatePoster = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Poster dimensions (9:16 aspect ratio for mobile sharing)
    const width = 540
    const height = 960
    canvas.width = width
    canvas.height = height

    // Background gradient
    const bgGradient = ctx.createLinearGradient(0, 0, width, height)
    bgGradient.addColorStop(0, '#0D1B2A')
    bgGradient.addColorStop(0.5, '#1A3A5C')
    bgGradient.addColorStop(1, '#0D1B2A')
    ctx.fillStyle = bgGradient
    ctx.fillRect(0, 0, width, height)

    // Decorative circles
    ctx.globalAlpha = 0.1
    ctx.fillStyle = '#F4D35E'
    ctx.beginPath()
    ctx.arc(100, 150, 200, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(440, 800, 180, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1

    // Top decorative moon
    ctx.fillStyle = '#F4D35E'
    ctx.beginPath()
    ctx.arc(420, 120, 50, 0, Math.PI * 2)
    ctx.fill()

    // Inner moon shadow (crescent effect)
    ctx.fillStyle = '#0D1B2A'
    ctx.beginPath()
    ctx.arc(445, 110, 45, 0, Math.PI * 2)
    ctx.fill()

    // Stars
    ctx.fillStyle = '#F4D35E'
    const stars = [
      { x: 80, y: 80, r: 2 },
      { x: 200, y: 60, r: 1.5 },
      { x: 320, y: 100, r: 2 },
      { x: 150, y: 200, r: 1 },
      { x: 500, y: 200, r: 1.5 },
      { x: 60, y: 350, r: 1 },
      { x: 480, y: 380, r: 1.5 },
      { x: 100, y: 500, r: 1 },
      { x: 450, y: 520, r: 1 },
    ]
    stars.forEach(star => {
      ctx.beginPath()
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2)
      ctx.fill()
    })

    // Title
    ctx.fillStyle = '#F4D35E'
    ctx.font = 'bold 42px "Cormorant Garamond", Georgia, serif'
    ctx.textAlign = 'center'
    ctx.fillText(storyTitle, width / 2, 280)

    // Decorative line under title
    const lineGradient = ctx.createLinearGradient(180, 0, 360, 0)
    lineGradient.addColorStop(0, 'transparent')
    lineGradient.addColorStop(0.5, '#F4D35E')
    lineGradient.addColorStop(1, 'transparent')
    ctx.strokeStyle = lineGradient
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(180, 310)
    ctx.lineTo(360, 310)
    ctx.stroke()

    // Story text (first 300 chars)
    const storyPreview = story.slice(0, 300) + (story.length > 300 ? '...' : '')
    ctx.fillStyle = '#E8E8E8'
    ctx.font = '28px "DM Sans", -apple-system, sans-serif'
    ctx.textAlign = 'left'

    // Word wrap for story
    const maxWidth = width - 80
    const lineHeight = 42
    let y = 380
    const words = storyPreview.split('')
    let line = ''

    for (const char of words) {
      const testLine = line + char
      const metrics = ctx.measureText(testLine)
      if (metrics.width > maxWidth && line !== '') {
        ctx.fillText(line, 40, y)
        line = char
        y += lineHeight
        if (y > height - 200) break
      } else {
        line = testLine
      }
    }
    if (line && y <= height - 200) {
      ctx.fillText(line, 40, y)
    }

    // Bottom decorative elements
    ctx.fillStyle = '#A8B5C9'
    ctx.font = '20px "DM Sans", -apple-system, sans-serif'
    ctx.textAlign = 'center'

    // Date
    const displayDate = date || new Date().toLocaleDateString('zh-CN')
    ctx.fillText(displayDate, width / 2, height - 100)

    // App name
    ctx.fillStyle = '#7A8BA5'
    ctx.font = '18px "DM Sans", -apple-system, sans-serif'
    ctx.fillText('— 夜棂 · 梦境记录 —', width / 2, height - 60)

    // Watermark
    ctx.globalAlpha = 0.3
    ctx.fillStyle = '#F4D35E'
    ctx.font = '16px "DM Sans", -apple-system, sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText('yeelin.app', width - 30, height - 30)
    ctx.globalAlpha = 1
  }, [storyTitle, story, date])

  const handleDownload = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    generatePoster()

    // Wait for canvas to render, then download
    setTimeout(() => {
      const link = document.createElement('a')
      link.download = `夜棂-${storyTitle}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
      onClose()
    }, 100)
  }

  const handleShare = async () => {
    const canvas = canvasRef.current
    if (!canvas) return

    generatePoster()

    // Wait for canvas to render
    await new Promise(resolve => setTimeout(resolve, 100))

    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/png')
      )

      if (blob && navigator.share) {
        const file = new File([blob], `夜棂-${storyTitle}.png`, { type: 'image/png' })
        await navigator.share({
          files: [file],
          title: '夜棂 - 梦境故事',
          text: `「${storyTitle}」`
        })
      }
    } catch {
      // Fallback to download
      handleDownload()
      return
    }
    onClose()
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>生成海报</h3>
          <button className={styles.closeBtn} onClick={onClose} aria-label="关闭">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className={styles.preview}>
          <canvas ref={canvasRef} className={styles.canvas} />
        </div>

        <div className={styles.actions}>
          <Button onClick={handleDownload} className={styles.downloadBtn}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}>
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            保存图片
          </Button>
          {typeof navigator.share === 'function' && (
            <Button variant="secondary" onClick={handleShare} className={styles.shareBtn}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}>
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
              分享海报
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
