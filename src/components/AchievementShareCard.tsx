import { useRef, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Button } from './ui/Button'
import styles from './AchievementShareCard.module.css'

interface AchievementShareCardProps {
  achievement: {
    id: string
    title: string
    description: string
    icon: string
  }
  onClose: () => void
  onShare?: () => void
}

export function AchievementShareCard({ achievement, onClose, onShare }: AchievementShareCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const generateCard = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = 540
    const height = 540
    canvas.width = width
    canvas.height = height

    // Background gradient
    const bg = ctx.createLinearGradient(0, 0, width, height)
    bg.addColorStop(0, '#0D1B2A')
    bg.addColorStop(0.5, '#1A3A5C')
    bg.addColorStop(1, '#0D1B2A')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, width, height)

    // Decorative circles
    ctx.globalAlpha = 0.08
    ctx.fillStyle = '#F4D35E'
    ctx.beginPath()
    ctx.arc(270, 270, 200, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(100, 100, 100, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(440, 440, 120, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1

    // Star decorations
    const stars = [
      { x: 80, y: 80, r: 2 }, { x: 460, y: 60, r: 1.5 }, { x: 150, y: 450, r: 2 },
      { x: 400, y: 420, r: 1.5 }, { x: 60, y: 300, r: 1 }, { x: 480, y: 280, r: 1 }
    ]
    ctx.fillStyle = '#F4D35E'
    stars.forEach(star => {
      ctx.beginPath()
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2)
      ctx.fill()
    })

    // Achievement icon (large)
    ctx.font = '80px serif'
    ctx.textAlign = 'center'
    ctx.fillText(achievement.icon, width / 2, 180)

    // Achievement title
    ctx.fillStyle = '#F4D35E'
    ctx.font = 'bold 48px "Cormorant Garamond", Georgia, serif'
    ctx.fillText(achievement.title, width / 2, 280)

    // Decorative line
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

    // Achievement description
    ctx.fillStyle = '#E8E8E8'
    ctx.font = '26px "DM Sans", -apple-system, sans-serif'
    ctx.fillText(achievement.description, width / 2, 365)

    // Date
    const dateStr = new Date().toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    ctx.fillStyle = '#A8B5C9'
    ctx.font = '20px "DM Sans", -apple-system, sans-serif'
    ctx.fillText(dateStr, width / 2, 420)

    // App branding - 夜棂 logo (drawn as moon icon)
    const logoX = width / 2
    const logoY = 470

    // Small crescent moon logo
    ctx.save()
    ctx.globalAlpha = 0.8

    // Moon glow
    const logoGlow = ctx.createRadialGradient(logoX, logoY, 0, logoX, logoY, 30)
    logoGlow.addColorStop(0, 'rgba(244, 211, 94, 0.3)')
    logoGlow.addColorStop(1, 'transparent')
    ctx.fillStyle = logoGlow
    ctx.beginPath()
    ctx.arc(logoX, logoY, 30, 0, Math.PI * 2)
    ctx.fill()

    // Crescent moon
    ctx.fillStyle = '#F4D35E'
    ctx.beginPath()
    ctx.arc(logoX - 6, logoY - 4, 12, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#1A3A5C'
    ctx.beginPath()
    ctx.arc(logoX + 2, logoY - 6, 10, 0, Math.PI * 2)
    ctx.fill()

    // Small star beside moon
    ctx.fillStyle = '#F4D35E'
    ctx.beginPath()
    ctx.arc(logoX + 22, logoY - 8, 2, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()
  }, [achievement])

  useEffect(() => {
    const timer = setTimeout(() => {
      generateCard()
    }, 50)
    return () => clearTimeout(timer)
  }, [generateCard])

  const handleDownload = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    generateCard()

    setTimeout(() => {
      const link = document.createElement('a')
      link.download = `夜棂-成就-${achievement.title}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
      onShare?.()
      onClose()
    }, 100)
  }

  const handleShare = async () => {
    const canvas = canvasRef.current
    if (!canvas) return

    generateCard()

    await new Promise(resolve => setTimeout(resolve, 100))

    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/png')
      )

      if (blob && navigator.share) {
        const file = new File([blob], `夜棂-成就-${achievement.title}.png`, { type: 'image/png' })
        await navigator.share({
          files: [file],
          title: `夜棂 - ${achievement.title}`,
          text: `我刚刚在夜棂解锁了「${achievement.title}」！${achievement.description}`
        })
        onShare?.()
      }
    } catch {
      handleDownload()
      return
    }
    onClose()
  }

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>炫耀一下</h3>
          <button className={styles.closeBtn} onClick={onClose} aria-label="关闭">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className={styles.preview}>
          <canvas ref={canvasRef} className={styles.canvas} />
        </div>

        <div className={styles.incentive}>
          <div className={styles.incentiveContent}>
            <span className={styles.incentiveIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 20, height: 20 }}>
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </span>
            <span className={styles.incentiveText}>分享成就可获得 <strong>5</strong> 梦境积分</span>
          </div>
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
              分享成就
            </Button>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
