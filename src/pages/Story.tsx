import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useDreamStore } from '../hooks/useDreamStore'
import { Button } from '../components/ui/Button'
import { Toast } from '../components/ui/Toast'
import { SharePoster } from '../components/SharePoster'
import styles from './Story.module.css'

export function Story() {
  const navigate = useNavigate()
  const location = useLocation()
  const { currentSession, addToHistory, reset } = useDreamStore()
  const [toastVisible, setToastVisible] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success')
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [showPosterModal, setShowPosterModal] = useState(false)
  const [readProgress, setReadProgress] = useState(0)
  const shareWrapperRef = useRef<HTMLDivElement>(null)
  const shareMenuRef = useRef<HTMLDivElement>(null)

  // Track reading progress
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0
      setReadProgress(Math.min(100, Math.max(0, progress)))
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close share menu on outside click
  useEffect(() => {
    if (!showShareMenu) return
    const handleClickOutside = (e: MouseEvent) => {
      if (shareWrapperRef.current && !shareWrapperRef.current.contains(e.target as Node)) {
        setShowShareMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showShareMenu])

  // Focus trap and Escape for share menu
  useEffect(() => {
    if (!showShareMenu || !shareMenuRef.current) return
    const menuItems = shareMenuRef.current.querySelectorAll('button')
    const firstItem = menuItems[0]
    const lastItem = menuItems[menuItems.length - 1]

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowShareMenu(false)
        return
      }
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === firstItem) {
          e.preventDefault()
          lastItem.focus()
        } else if (!e.shiftKey && document.activeElement === lastItem) {
          e.preventDefault()
          firstItem.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    firstItem?.focus()
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [showShareMenu])

  // Check if we navigated from history with state
  const fromHistory = location.state?.fromHistory
  const storyTitle = fromHistory?.storyTitle || currentSession.storyTitle
  const story = fromHistory?.story || currentSession.story
  const dreamText = fromHistory?.dreamSnippet || currentSession.dreamText
  const status = fromHistory ? 'completed' : currentSession.status

  useEffect(() => {
    if (status !== 'completed' || !story) {
      navigate('/dream')
    }
  }, [status, story, navigate])

  const handleShareToWeChat = async () => {
    const shareText = `「${storyTitle}」\n\n${story?.slice(0, 200)}...`

    if (navigator.share) {
      try {
        await navigator.share({
          title: '夜棂 - 梦境故事',
          text: shareText
        })
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setToastType('info')
          setToastMessage('请长按复制内容分享')
          setToastVisible(true)
        }
      }
    } else {
      setToastType('info')
      setToastMessage('请长按复制内容分享')
      setToastVisible(true)
    }
    setShowShareMenu(false)
  }

  const handleCopyLink = () => {
    const url = window.location.href
    navigator.clipboard.writeText(url).then(() => {
      setToastType('success')
      setToastMessage('链接已复制到剪贴板')
      setToastVisible(true)
    })
    setShowShareMenu(false)
  }

  const handleGeneratePoster = () => {
    setShowShareMenu(false)
    setShowPosterModal(true)
  }

  const handleDone = () => {
    addToHistory()
    reset()
    setToastMessage('故事已保存')
    setToastVisible(true)
    setTimeout(() => navigate('/'), 800)
  }

  const handleReadAgain = () => {
    // Just scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (!story) return null

  return (
    <div className={styles.page}>
      {/* Reading Progress */}
      <div className={styles.readProgress} style={{ width: `${readProgress}%` }} role="progressbar" aria-valuenow={readProgress} aria-valuemin={0} aria-valuemax={100} aria-label="阅读进度" />
      <div className={styles.container}>
        {/* Header */}
        <header className={styles.header}>
          <span className={styles.badge}>你的故事</span>
          <h1 className={styles.title}>{storyTitle}</h1>
        </header>

        {/* Story Content */}
        <article className={styles.story}>
          {story.split('\n').map((paragraph: string, index: number) => (
            paragraph.trim() && (
              <p key={index} className={styles.paragraph}>
                {paragraph}
              </p>
            )
          ))}
        </article>

        {/* Dream Reference */}
        <details className={styles.dreamRef}>
          <summary aria-label="查看原始梦境碎片">查看原始梦境碎片</summary>
          <div className={styles.dreamContent}>
            {dreamText}
          </div>
        </details>

        {/* Actions */}
        <div className={styles.actions}>
          <Button onClick={handleDone} size="lg" className={styles.doneBtn}>
            保存并返回
          </Button>

          <div className={styles.secondaryActions}>
            <div className={styles.shareWrapper} ref={shareWrapperRef}>
              <Button variant="ghost" onClick={() => setShowShareMenu(!showShareMenu)} aria-expanded={showShareMenu} aria-label="分享">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}>
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
                分享
              </Button>
              {showShareMenu && (
                <div className={styles.shareMenu} role="menu" aria-label="分享选项" ref={shareMenuRef}>
                  <button className={styles.shareMenuItem} onClick={handleShareToWeChat} role="menuitem" tabIndex={0}>
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8.69 13.3c-.39-.39-.39-1.02 0-1.41l6.25-6.25c.39-.39 1.02-.39 1.41 0s.39 1.02 0 1.41L10.1 13.3a.996.996 0 0 1-1.41 0z"/>
                      <path d="M15.31 21.7c-.39-.39-.39-1.02 0-1.41l6.25-6.25c.39-.39 1.02-.39 1.41 0s.39 1.02 0 1.41L16.72 21.7a.996.996 0 0 1-1.41 0z"/>
                      <path d="M17.56 17.56c-.39-.39-.39-1.02 0-1.41l.71-.71c.39-.39 1.02-.39 1.41 0s.39 1.02 0 1.41l-.71.71c-.39.39-1.02.39-1.41 0z"/>
                    </svg>
                    微信好友
                  </button>
                  <button className={styles.shareMenuItem} onClick={handleShareToWeChat} role="menuitem" tabIndex={0}>
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                    </svg>
                    朋友圈
                  </button>
                  <button className={styles.shareMenuItem} onClick={handleCopyLink} role="menuitem" tabIndex={0}>
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                    </svg>
                    复制链接
                  </button>
                  <button className={styles.shareMenuItem} onClick={handleGeneratePoster} role="menuitem" tabIndex={0}>
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-5-7l-3 3.72L9 13l-3 4h12l-4-5z"/>
                    </svg>
                    生成海报
                  </button>
                </div>
              )}
            </div>
            <Button variant="ghost" onClick={handleReadAgain}>
              再读一遍
            </Button>
            <Link to="/dream">
              <Button variant="secondary">
                记录新梦境
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Toast */}
      <Toast message={toastMessage} visible={toastVisible} onClose={() => setToastVisible(false)} type={toastType} />

      {/* Share Poster Modal */}
      {showPosterModal && (
        <SharePoster
          storyTitle={storyTitle}
          story={story}
          date={new Date().toLocaleDateString('zh-CN')}
          onClose={() => setShowPosterModal(false)}
        />
      )}

      {/* Decorative elements */}
      <div className={styles.decorLeft}>
        <svg viewBox="0 0 100 200" fill="none">
          <path d="M50 0 Q100 50 50 100 Q0 150 50 200" stroke="currentColor" strokeWidth="1" fill="none" />
        </svg>
      </div>
      <div className={styles.decorRight}>
        <svg viewBox="0 0 100 200" fill="none">
          <path d="M50 0 Q0 50 50 100 Q100 150 50 200" stroke="currentColor" strokeWidth="1" fill="none" />
        </svg>
      </div>
    </div>
  )
}
