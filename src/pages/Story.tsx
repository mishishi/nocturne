import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useDreamStore } from '../hooks/useDreamStore'
import { useAchievementSound } from '../hooks/useAchievementSound'
import { useTextToSpeech } from '../hooks/useTextToSpeech'
import { Button } from '../components/ui/Button'
import { Toast } from '../components/ui/Toast'
import { SharePoster } from '../components/SharePoster'
import { Breadcrumb } from '../components/Breadcrumb'
import { DreamInterpretationModal, DreamInterpretationLoadingModal } from '../components/DreamInterpretationModal'
import { DreamIllustration } from '../components/DreamIllustration'
import { shareApi, api, wallApi } from '../services/api'
import styles from './Story.module.css'

const PUBLISHED_SESSIONS_KEY = 'yeelin_published_sessions'

export function Story() {
  const navigate = useNavigate()
  const location = useLocation()
  const { currentSession, addToHistory, reset, user } = useDreamStore()
  const { playSound } = useAchievementSound()
  const [toastVisible, setToastVisible] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success')
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [showPosterModal, setShowPosterModal] = useState(false)
  const [readProgress, setReadProgress] = useState(0)
  const [isRevealed, setIsRevealed] = useState(false)
  const [showContent, setShowContent] = useState(false)
  const [showInterpretation, setShowInterpretation] = useState(false)
  const [interpretation, setInterpretation] = useState<string | null>(null)
  const [isInterpreting, setIsInterpreting] = useState(false)
  const [isGeneratingImage] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [isPublished, setIsPublished] = useState(false)
  const { speak, stop, isSpeaking, isSupported: isTtsSupported, voices, selectedVoice, setVoice } = useTextToSpeech()
  const shareWrapperRef = useRef<HTMLDivElement>(null)
  const shareMenuRef = useRef<HTMLDivElement>(null)
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Check if we navigated from history with state
  const fromHistory = location.state?.fromHistory

  // Story reveal animation on mount
  useEffect(() => {
    // When coming from history, data is already available - show immediately
    if (fromHistory) {
      setIsRevealed(true)
      setShowContent(true)
      return
    }
    // For new stories, use animation delay
    const timer = setTimeout(() => setIsRevealed(true), 50)
    const contentTimer = setTimeout(() => setShowContent(true), 100)
    return () => {
      clearTimeout(timer)
      clearTimeout(contentTimer)
    }
  }, [fromHistory])

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

  // Cleanup copy timeout on unmount
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current)
      }
    }
  }, [])

  // Check if this session was already published
  useEffect(() => {
    const sessionId = location.state?.fromHistory?.sessionId || location.state?.fromHistory?.id || currentSession.sessionId
    if (sessionId) {
      const publishedSessions = JSON.parse(localStorage.getItem(PUBLISHED_SESSIONS_KEY) || '[]')
      if (publishedSessions.includes(sessionId)) {
        setIsPublished(true)
      }
    }
  }, [location.state, currentSession.sessionId])

  const storyTitle = fromHistory?.storyTitle || currentSession.storyTitle
  const story = fromHistory?.story || currentSession.story
  const dreamText = fromHistory?.dreamSnippet || currentSession.dreamText
  const status = fromHistory ? 'completed' : currentSession.status

  useEffect(() => {
    if (status !== 'completed' || !story) {
      navigate('/dream')
    }
  }, [status, story, navigate])

  const handleShareToWeChat = async (type: 'friend' | 'moment') => {
    const shareText = `「${storyTitle}」\n\n${story}`
    const openid = currentSession.openid

    if (navigator.share) {
      try {
        await navigator.share({
          title: '夜棂 - 梦境故事',
          text: shareText
        })
        // Log successful share
        if (openid) {
          try {
            const result = await shareApi.logShare(openid, type)
            if (result.success) {
              const msg = result.pointsEarned ? `+${result.pointsEarned} 积分` : ''
              const medalMsg = result.medalsUnlocked?.length ? ` ${result.medalsUnlocked.join(',')} 已解锁！` : ''
              setToastType('success')
              setToastMessage(`${msg}${medalMsg}` || '分享成功')
              setToastVisible(true)
            } else if (result.reason) {
              setToastType('info')
              setToastMessage(result.reason)
              setToastVisible(true)
            }
          } catch {
            // Silently fail if share logging fails
          }
        }
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

  const handleCopyLink = async () => {
    const url = window.location.href
    const openid = currentSession.openid

    navigator.clipboard.writeText(url).then(async () => {
      setToastType('success')
      setToastMessage('链接已复制到剪贴板')
      setToastVisible(true)

      // Log share after clipboard copy
      if (openid) {
        try {
          const result = await shareApi.logShare(openid, 'link')
          if (result.success && result.pointsEarned) {
            // Clear any existing timeout
            if (copyTimeoutRef.current) {
              clearTimeout(copyTimeoutRef.current)
            }
            copyTimeoutRef.current = setTimeout(() => {
              setToastType('success')
              setToastMessage(`+${result.pointsEarned} 积分`)
              setToastVisible(true)
              copyTimeoutRef.current = null
            }, 1500)
          }
        } catch {
          // Silently fail
        }
      }
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
    playSound('celebration')
    setToastMessage('故事已保存')
    setToastVisible(true)
    setTimeout(() => navigate('/'), 800)
  }

  const handleSpeakStory = () => {
    if (!story) return

    if (isSpeaking) {
      stop()
    } else {
      speak(story)
    }
  }

  // Cleanup TTS on unmount
  useEffect(() => {
    return () => {
      stop()
    }
  }, [stop])

  const handleInterpret = async () => {
    const openid = localStorage.getItem('yeelin_openid') || user?.openid || currentSession.openid
    const sessionId = location.state?.fromHistory?.sessionId || location.state?.fromHistory?.id || currentSession.sessionId

    if (!openid) {
      setToastType('error')
      setToastMessage('请先登录')
      setToastVisible(true)
      return
    }

    if (!sessionId) {
      setToastType('error')
      setToastMessage('无法获取梦境ID')
      setToastVisible(true)
      return
    }

    // Check if interpretation already exists in local state
    if (interpretation) {
      setShowInterpretation(true)
      return
    }

    setIsInterpreting(true)

    try {
      const result = await api.interpret(sessionId, openid)

      if (result.success && result.interpretation) {
        setInterpretation(result.interpretation)
        setShowInterpretation(true)

        // Show points used toast
        if (result.pointsUsed) {
          setToastType('info')
          setToastMessage(`解读消耗 ${result.pointsUsed} 积分`)
          setToastVisible(true)
        }
      } else if (result.reason) {
        setToastType('error')
        setToastMessage(result.reason)
        setToastVisible(true)
      }
    } catch {
      setToastType('error')
      setToastMessage('解读生成失败，请重试')
      setToastVisible(true)
    } finally {
      setIsInterpreting(false)
    }
  }

  const handlePublishToWall = async () => {
    const openid = localStorage.getItem('yeelin_openid') || user?.openid || currentSession.openid
    const sessionId = location.state?.fromHistory?.sessionId || location.state?.fromHistory?.id || currentSession.sessionId

    if (!openid) {
      setToastType('error')
      setToastMessage('请先登录')
      setToastVisible(true)
      return
    }

    if (!sessionId) {
      setToastType('error')
      setToastMessage('无法获取梦境ID')
      setToastVisible(true)
      return
    }

    setIsPublishing(true)

    try {
      const result = await wallApi.publish({
        openid,
        sessionId,
        isAnonymous: true,
        visibility: 'public'
      })

      if (result.success) {
        setIsPublished(true)
        // Save to localStorage to persist across page refreshes
        const publishedSessions = JSON.parse(localStorage.getItem(PUBLISHED_SESSIONS_KEY) || '[]')
        if (!publishedSessions.includes(sessionId)) {
          publishedSessions.push(sessionId)
          localStorage.setItem(PUBLISHED_SESSIONS_KEY, JSON.stringify(publishedSessions))
        }
        setToastType('success')
        setToastMessage('发布成功！')
        setToastVisible(true)
      } else {
        setToastType('error')
        setToastMessage(result.message || '发布失败')
        setToastVisible(true)
      }
    } catch {
      setToastType('error')
      setToastMessage('网络错误，请重试')
      setToastVisible(true)
    } finally {
      setIsPublishing(false)
    }
  }

  if (!story) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <p>无法加载故事，请返回重试</p>
          <Link to="/">
            <Button>返回首页</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className={`${styles.page} ${isRevealed ? styles.revealed : ''}`}>
      {/* Reveal glow effect */}
      <div className={styles.revealGlow} />

      {/* Reading Progress */}
      <div className={styles.readProgress} style={{ width: `${readProgress}%` }} role="progressbar" aria-valuenow={readProgress} aria-valuemin={0} aria-valuemax={100} aria-label="阅读进度" />
      <div className={styles.container}>
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { label: '首页', href: '/' },
            { label: '历史', href: '/history' },
            { label: storyTitle || '故事' }
          ]}
        />

        {/* Header */}
        <header className={`${styles.header} ${showContent ? styles.headerVisible : ''}`}>
          <div className={styles.badgeWrapper}>
            <span className={styles.badgeIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </span>
            <span className={styles.badge}>你的故事</span>
          </div>
          <h1 className={styles.title}>{storyTitle}</h1>
          <div className={styles.headerDecor}>
            <span className={styles.decorStar} />
            <span className={styles.decorStar} />
            <span className={styles.decorStar} />
          </div>
        </header>

        {/* Dream Illustration */}
        <DreamIllustration
          storyTitle={storyTitle}
          story={story}
          onGenerate={undefined}
          isGenerating={isGeneratingImage}
        />

        {/* Story Content */}
        <article className={`${styles.story} ${showContent ? styles.storyVisible : ''}`}>
          {story.split('\n').map((paragraph: string, index: number) => (
            paragraph.trim() && (
              <p key={index} className={styles.paragraph} style={{ animationDelay: `${0.6 + index * 0.1}s` }}>
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
          {!fromHistory && (
            <Button onClick={handleDone} size="lg" className={styles.doneBtn}>
              保存并返回
            </Button>
          )}

          <div className={styles.secondaryActions}>
            <div className={styles.shareWrapper} ref={shareWrapperRef}>
              <Button variant="secondary" onClick={() => setShowShareMenu(!showShareMenu)} aria-expanded={showShareMenu} aria-label="分享">
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
                  <button className={styles.shareMenuItem} onClick={() => handleShareToWeChat('friend')} role="menuitem" tabIndex={0}>
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8.69 13.3c-.39-.39-.39-1.02 0-1.41l6.25-6.25c.39-.39 1.02-.39 1.41 0s.39 1.02 0 1.41L10.1 13.3a.996.996 0 0 1-1.41 0z"/>
                      <path d="M15.31 21.7c-.39-.39-.39-1.02 0-1.41l6.25-6.25c.39-.39 1.02-.39 1.41 0s.39 1.02 0 1.41L16.72 21.7a.996.996 0 0 1-1.41 0z"/>
                      <path d="M17.56 17.56c-.39-.39-.39-1.02 0-1.41l.71-.71c.39-.39 1.02-.39 1.41 0s.39 1.02 0 1.41l-.71.71c-.39.39-1.02.39-1.41 0z"/>
                    </svg>
                    微信好友
                  </button>
                  <button className={styles.shareMenuItem} onClick={() => handleShareToWeChat('moment')} role="menuitem" tabIndex={0}>
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
            {!isPublished && (
              <Button
                variant="secondary"
                onClick={handlePublishToWall}
                disabled={isPublishing}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}>
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 2a7 7 0 0 1 0 14 7 7 0 0 1 0-14" />
                  <circle cx="12" cy="9" r="3" />
                </svg>
                {isPublishing ? '发布中...' : '发布到梦墙'}
              </Button>
            )}
            {isPublished && (
              <Button variant="secondary" disabled>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                已发布
              </Button>
            )}
            {isTtsSupported && (
              <div className={styles.ttsWrapper}>
                <Button
                  variant="secondary"
                  onClick={handleSpeakStory}
                  className={isSpeaking ? styles.ttsButtonActive : ''}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}>
                    {isSpeaking ? (
                      // Pause icon when speaking
                      <>
                        <rect x="6" y="4" width="4" height="16" rx="1" />
                        <rect x="14" y="4" width="4" height="16" rx="1" />
                      </>
                    ) : (
                      // Speaker icon when not speaking
                      <>
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                      </>
                    )}
                  </svg>
                  {isSpeaking ? '停止' : '听故事'}
                </Button>
                {voices.length > 1 && (
                  <select
                    className={styles.voiceSelect}
                    value={selectedVoice?.name || ''}
                    onChange={(e) => {
                      const voice = voices.find(v => v.name === e.target.value)
                      if (voice) setVoice(voice)
                    }}
                  >
                    {voices.slice(0, 6).map((voice) => (
                      <option key={voice.name} value={voice.name}>
                        {voice.name.length > 20 ? voice.name.substring(0, 20) + '...' : voice.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
            <Button variant="secondary" onClick={handleInterpret} disabled={isInterpreting}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}>
                <path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z" />
                <path d="M9 21h6" />
              </svg>
              {isInterpreting ? '解读中...' : '听听解读'}
            </Button>
            <Link to="/dream">
              <Button variant="primary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}>
                  <path d="M12 5v14M5 12h14" />
                </svg>
                记录新梦境
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Toast */}
      <Toast message={toastMessage} visible={toastVisible} onClose={() => setToastVisible(false)} type={toastType} />

      {/* Dream Interpretation Loading Modal */}
      {isInterpreting && (
        <DreamInterpretationLoadingModal onClose={() => setIsInterpreting(false)} />
      )}

      {/* Dream Interpretation Modal */}
      {showInterpretation && interpretation && (
        <DreamInterpretationModal
          interpretation={interpretation}
          onClose={() => setShowInterpretation(false)}
        />
      )}

      {/* Share Poster Modal */}
      {showPosterModal && (
        <SharePoster
          storyTitle={storyTitle}
          story={story}
          date={new Date().toLocaleDateString('zh-CN')}
          onClose={() => setShowPosterModal(false)}
          onShare={async (type) => {
            const openid = currentSession.openid
            if (openid) {
              try {
                const result = await shareApi.logShare(openid, type)
                if (result.success && result.pointsEarned) {
                  setToastType('success')
                  setToastMessage(`+${result.pointsEarned} 积分`)
                  setToastVisible(true)
                }
              } catch {
                // Silently fail
              }
            }
          }}
        />
      )}

      {/* Floating particles */}
      <div className={styles.particles}>
        {[...Array(12)].map((_, i) => (
          <span
            key={i}
            className={styles.particle}
            style={{
              left: `${8 + Math.random() * 84}%`,
              animationDelay: `${Math.random() * 8}s`,
              animationDuration: `${6 + Math.random() * 6}s`
            }}
          />
        ))}
      </div>

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
