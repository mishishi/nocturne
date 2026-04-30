import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { Link, useNavigate, useLocation, useParams } from 'react-router-dom'
import { useDreamStore } from '../hooks/useDreamStore'
import { useAchievementSound } from '../hooks/useAchievementSound'
import { useTextToSpeech } from '../hooks/useTextToSpeech'
import { useDreamWallContext, clearDreamWallContext } from '../hooks/useDreamWallContext'
import { Button } from '../components/ui/Button'
import { Toast } from '../components/ui/Toast'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import { SharePoster } from '../components/SharePoster'
import { Breadcrumb } from '../components/Breadcrumb'
import { DreamInterpretationModal, DreamInterpretationLoadingModal } from '../components/DreamInterpretationModal'
import { DreamIllustration } from '../components/DreamIllustration'
import { StoryFeedbackForm } from '../components/StoryFeedbackForm'
import { StoryFeedbackPanel } from '../components/StoryFeedbackPanel'
import { CommentThread } from '../components/CommentThread'
import { FriendRequestButton } from '../components/FriendRequestButton'
import { shareApi, api, wallApi } from '../services/api'
import styles from './Story.module.css'

const PUBLISHED_SESSIONS_KEY = 'yeelin_published_sessions'

export function Story() {
  const navigate = useNavigate()
  const location = useLocation()
  const { sessionId: urlSessionId } = useParams()
  const { currentSession, addToHistory, reset, user } = useDreamStore()
  const { playSound } = useAchievementSound()
  const [toastVisible, setToastVisible] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success')
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [showAiMenu, setShowAiMenu] = useState(false)
  const [showFabMenu, setShowFabMenu] = useState(false)
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
  const [publishedPostId, setPublishedPostId] = useState<string | null>(null)
  const [dreamWallStory, setDreamWallStory] = useState<string | null>(null)

  // Unified Dream Wall context - handles location.state vs sessionStorage automatically
  const wallContext = useDreamWallContext()
  const isFromDreamWall = wallContext.fromDreamWall
  // Show loading if coming from Dream Wall (and storyFull not available) OR if we have a URL sessionId and no story data yet
  const [isLoadingDreamWallStory, setIsLoadingDreamWallStory] = useState(
    (isFromDreamWall && !wallContext.storyFull) || (!!urlSessionId && !wallContext.storyFull && !dreamWallStory)
  )
  // Pending share confirmation state
  const [pendingShareType, setPendingShareType] = useState<'friend' | 'moment' | null>(null)
  const { speak, stop, isSpeaking, voices, selectedVoice, setVoice } = useTextToSpeech()
  const shareWrapperRef = useRef<HTMLDivElement>(null)
  const aiWrapperRef = useRef<HTMLDivElement>(null)
  const shareMenuRef = useRef<HTMLDivElement>(null)
  const aiMenuRef = useRef<HTMLDivElement>(null)
  const fabMenuRef = useRef<HTMLDivElement>(null)
  const fabJustClosedByOutsideRef = useRef(false)
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Memoized particle positions to avoid Math.random() on each render
  const particlePositions = useMemo(() =>
    Array.from({ length: 12 }, () => ({
      left: `${8 + Math.random() * 84}%`,
      animationDelay: `${Math.random() * 8}s`,
      animationDuration: `${6 + Math.random() * 6}s`
    })), []
  )

  // Stable callback for toast close to prevent effect re-runs
  const handleToastClose = useCallback(() => {
    setToastVisible(false)
  }, [])

  // Check if we navigated from history with state
  const fromHistory = location.state?.fromHistory
  const fromDreamWall = location.state?.fromDreamWall

  // sessionId for feedback form
  const sessionId = location.state?.fromHistory?.sessionId || location.state?.fromHistory?.id || location.state?.sessionId || currentSession.sessionId || urlSessionId

  // 从梦墙进入时，判断当前用户是否是作者
  const currentUserOpenid = localStorage.getItem('yeelin_openid') || user?.openid || currentSession.openid
  const storyAuthorOpenid = location.state?.authorOpenid
  const authorIsFriend = location.state?.isFriend
  // 只有在梦墙场景下才需要判断作者身份：当前用户openid与故事作者openid相同才是作者
  // isAuthor: user is the author if their openid matches the session's openid
  // For history stories where currentSession.openid is empty, use currentUserOpenid from localStorage
  const isAuthor = (fromDreamWall && storyAuthorOpenid && currentUserOpenid === storyAuthorOpenid) ||
    (!fromDreamWall && currentUserOpenid)

  // Story reveal animation on mount
  useEffect(() => {
    // When coming from history or dream wall, data is already available - show immediately
    if (fromHistory || fromDreamWall) {
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
  }, [fromHistory, fromDreamWall])

  // Track reading progress with debounced scroll handler
  useEffect(() => {
    let rafId: number | null = null
    const handleScroll = () => {
      if (rafId !== null) return
      rafId = requestAnimationFrame(() => {
        const scrollTop = window.scrollY
        const docHeight = document.documentElement.scrollHeight - window.innerHeight
        const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0
        setReadProgress(Math.min(100, Math.max(0, progress)))
        rafId = null
      })
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (rafId !== null) cancelAnimationFrame(rafId)
    }
  }, [])

  // Close share menu on outside click
  useEffect(() => {
    if (!showShareMenu && !showAiMenu && !showFabMenu) return
    const handleClickOutside = (e: MouseEvent) => {
      if (showShareMenu && shareWrapperRef.current && !shareWrapperRef.current.contains(e.target as Node)) {
        setShowShareMenu(false)
      }
      if (showAiMenu && aiWrapperRef.current && !aiWrapperRef.current.contains(e.target as Node)) {
        setShowAiMenu(false)
      }
      if (showFabMenu && fabMenuRef.current && !fabMenuRef.current.contains(e.target as Node)) {
        fabJustClosedByOutsideRef.current = true
        setShowFabMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showShareMenu, showAiMenu, showFabMenu])

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

  // Focus trap and Escape for AI menu
  useEffect(() => {
    if (!showAiMenu || !aiMenuRef.current) return
    const menuItems = aiMenuRef.current.querySelectorAll('button')
    const firstItem = menuItems[0]
    const lastItem = menuItems[menuItems.length - 1]

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowAiMenu(false)
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
  }, [showAiMenu])

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
    // Use sessionId from location state (fromHistory) since currentSession resets on refresh
    const sessionId = location.state?.fromHistory?.sessionId || location.state?.fromHistory?.id || location.state?.sessionId || urlSessionId
    if (sessionId) {
      const publishedSessions = JSON.parse(localStorage.getItem(PUBLISHED_SESSIONS_KEY) || '[]')
      if (publishedSessions.includes(sessionId)) {
        setIsPublished(true)
      }
    }
  }, [location.state?.fromHistory?.sessionId, location.state?.fromHistory?.id, location.state?.sessionId, urlSessionId])

  // Fetch full story when coming from Dream Wall or direct URL (notifications)
  useEffect(() => {
    const { sessionId, storyFull, fromDreamWall } = wallContext

    // Determine which sessionId to use: wallContext takes priority, then URL param
    const targetSessionId = sessionId || urlSessionId

    // Skip if no sessionId available
    if (!targetSessionId) {
      return
    }

    // If storyFull is already available in wallContext, use it directly - no need to fetch
    if (fromDreamWall && storyFull) {
      setDreamWallStory(storyFull)
      setIsLoadingDreamWallStory(false)
      return
    }

    // If from Dream Wall but no storyFull yet, or coming from notifications (direct URL):
    // fetch from API using targetSessionId
    setIsLoadingDreamWallStory(true)
    let cancelled = false

    const fetchFullStory = async () => {
      try {
        const result = await api.getStory(targetSessionId)
        if (!cancelled) {
          if (result.data?.story) {
            setDreamWallStory(result.data.story.content)
          }
          setIsLoadingDreamWallStory(false)
        }
      } catch (err) {
        console.error('[Story] Failed to fetch story:', err)
        if (!cancelled) {
          setIsLoadingDreamWallStory(false)
        }
      }
    }
    fetchFullStory()

    return () => {
      cancelled = true
    }
  // Re-run when wallContext changes OR when urlSessionId changes
  }, [wallContext.sessionId, wallContext.storyFull, wallContext.fromDreamWall, urlSessionId])

  const storyTitle = fromHistory?.storyTitle || currentSession.storyTitle || wallContext.storyTitle
  const story = wallContext.storyFull || dreamWallStory || fromHistory?.story || currentSession.story
  const dreamText = fromHistory?.dreamSnippet || currentSession.dreamText
  const status = fromHistory || wallContext.fromDreamWall ? 'completed' : currentSession.status

  useEffect(() => {
    const { fromDreamWall, sessionId } = wallContext

    // If coming from Dream Wall, wait for story to load before deciding
    if (fromDreamWall && sessionId) {
      if (isLoadingDreamWallStory) {
        return // Still loading, don't redirect
      }
      // Check if we have the story
      const hasStory = wallContext.storyFull || dreamWallStory || fromHistory?.story || currentSession.story
      if (!hasStory) {
        navigate('/dream') // Loading done but no story, redirect
      }
      return
    }

    // Direct URL access (e.g., from notifications) - also wait for loading
    if (urlSessionId) {
      if (isLoadingDreamWallStory) {
        return // Still loading, don't redirect
      }
      // Loading done, check if we have story
      const hasStory = dreamWallStory || wallContext.storyFull || currentSession.story
      if (!hasStory) {
        navigate('/dream')
      }
      return
    }

    // Only redirect for normal sessions without URL sessionId
    if (!fromDreamWall && (status !== 'completed' || !story)) {
      navigate('/dream')
    }
  }, [status, story, dreamWallStory, navigate, isLoadingDreamWallStory, wallContext.fromDreamWall, wallContext.sessionId, wallContext.storyFull, urlSessionId])

  // Restore DreamWall context from sessionStorage on mount (for page refresh scenarios)
  useEffect(() => {
    const savedContext = sessionStorage.getItem('dreamwall_context')
    if (savedContext) {
      const context = JSON.parse(savedContext)
      if (context.scrollPosition) {
        window.scrollTo(0, context.scrollPosition)
      }
    }
    // Cleanup sessionStorage when leaving Story page via navigation
    return () => {
      if (window.location.pathname !== '/story') {
        clearDreamWallContext()
      }
    }
  }, [])

  const handleShareToWeChat = async (type: 'friend' | 'moment'): Promise<void> => {
    const openid = currentUserOpenid
    setShowShareMenu(false)

    if (!isAuthor || !openid) {
      // Non-authors just get feedback without reward
      setToastType('info')
      setToastMessage('请长按复制内容分享')
      setToastVisible(true)
      return
    }

    // Check daily share limit before showing confirm modal
    try {
      const stats = await shareApi.getStats(openid)
      const limit = stats.dailyLimit[type]
      const todayCount = stats.todayShareCount[type]
      if (todayCount >= limit) {
        setToastType('info')
        setToastMessage('分享次数已达今日上限')
        setToastVisible(true)
        return
      }
    } catch (err) {
      // If stats check fails, proceed anyway - the actual share will be rejected if limit exceeded
    }

    // Show confirm modal before sharing
    setPendingShareType(type)
  }

  const handleConfirmShare = async () => {
    if (!pendingShareType) return
    const type = pendingShareType
    const openid = currentUserOpenid
    const shareText = `「${storyTitle}」\n\n${story}`

    setPendingShareType(null)

    if (!navigator.share) {
      setToastType('info')
      setToastMessage('分享功能不可用，请长按复制内容分享')
      setToastVisible(true)
      return
    }

    try {
      await navigator.share({
        title: '夜棂 - 梦境故事',
        text: shareText
      })
      // Share sheet opened successfully - now record the share
      try {
        const result = await shareApi.logShare(openid, type)
        if (result.success && result.data) {
          const parts: string[] = ['分享成功']
          if (result.data.pointsEarned) parts.push(`+${result.data.pointsEarned} 积分`)
          if (result.data.medalsUnlocked?.length) parts.push(`${result.data.medalsUnlocked.join(',')} 已解锁`)
          setToastType('success')
          setToastMessage(parts.join(' '))
          setToastVisible(true)
        } else if (result.data?.reason) {
          setToastType('info')
          setToastMessage(result.data.reason)
          setToastVisible(true)
        }
      } catch {
        setToastType('error')
        setToastMessage('记录分享失败')
        setToastVisible(true)
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        // User cancelled share
        return
      }
      setToastType('info')
      setToastMessage('分享失败，请长按复制内容分享')
      setToastVisible(true)
    }
  }

  const handleCopyLink = async () => {
    const url = window.location.href
    const openid = currentUserOpenid
    setShowShareMenu(false)

    navigator.clipboard.writeText(url).then(async () => {
      // Immediate feedback
      setToastType('success')
      setToastMessage('链接已复制到剪贴板')
      setToastVisible(true)

      // Log share and show rewards - only for author
      if (isAuthor && openid) {
        try {
          const result = await shareApi.logShare(openid, 'link')
          if (result.data?.success) {
            const parts: string[] = []
            if (result.data.pointsEarned) parts.push(`+${result.data.pointsEarned} 积分`)
            if (result.data.medalsUnlocked?.length) parts.push(`${result.data.medalsUnlocked.join(',')} 已解锁`)
            if (parts.length) {
              // Clear any existing timeout
              if (copyTimeoutRef.current) {
                clearTimeout(copyTimeoutRef.current)
              }
              copyTimeoutRef.current = setTimeout(() => {
                setToastType('success')
                setToastMessage(parts.join(' '))
                setToastVisible(true)
                copyTimeoutRef.current = null
              }, 1000)
            }
          } else if (result.data?.reason) {
            setToastType('error')
            setToastMessage(result.data.reason)
            setToastVisible(true)
          }
        } catch {
          // Silently fail - already showed copy confirmation
        }
      }
    })
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
    const sessionId = location.state?.fromHistory?.sessionId || location.state?.fromHistory?.id || location.state?.sessionId || currentSession.sessionId || urlSessionId

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
      const result = await api.interpret(sessionId)

      if (result.success && result.data?.interpretation) {
        setInterpretation(result.data.interpretation)
        setShowInterpretation(true)

        // Show points used toast with earning hint
        if (result.data.pointsUsed) {
          setToastType('info')
          setToastMessage(`解读消耗 ${result.data.pointsUsed} 积分，签到可获得更多`)
          setToastVisible(true)
        }
      } else if (result.data?.reason) {
        setToastType('error')
        setToastMessage(result.data.reason)
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
    const sessionId = location.state?.fromHistory?.sessionId || location.state?.fromHistory?.id || urlSessionId

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
        if (result.post?.id) {
          setPublishedPostId(result.post.id)
        }
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
        // Check if already published error
        if (result.message?.includes('已在') || result.message?.includes('已经')) {
          // Mark as published even if backend says already published
          setIsPublished(true)
          const publishedSessions = JSON.parse(localStorage.getItem(PUBLISHED_SESSIONS_KEY) || '[]')
          if (!publishedSessions.includes(sessionId)) {
            publishedSessions.push(sessionId)
            localStorage.setItem(PUBLISHED_SESSIONS_KEY, JSON.stringify(publishedSessions))
          }
          setToastType('info')
          setToastMessage('已在梦墙发布过')
          setToastVisible(true)
        } else {
          setToastType('error')
          setToastMessage(result.message || '发布失败')
          setToastVisible(true)
        }
      }
    } catch (err) {
      // Check if it's the "already published" error from backend (409 Conflict)
      const error = err as { message?: string }
      if (error.message?.includes('已在') || error.message?.includes('已经') || error.message?.includes('409')) {
        setIsPublished(true)
        const publishedSessions = JSON.parse(localStorage.getItem(PUBLISHED_SESSIONS_KEY) || '[]')
        if (!publishedSessions.includes(sessionId)) {
          publishedSessions.push(sessionId)
          localStorage.setItem(PUBLISHED_SESSIONS_KEY, JSON.stringify(publishedSessions))
        }
        setToastType('info')
        setToastMessage('已在梦墙发布过')
        setToastVisible(true)
      } else {
        setToastType('error')
        setToastMessage('网络错误，请重试')
        setToastVisible(true)
      }
    } finally {
      setIsPublishing(false)
    }
  }

  if (!story && !isLoadingDreamWallStory) {
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
    <>
      {/* Pre-reveal loading state */}
      {!isRevealed && (
        <div className={styles.revealLoader}>
          <div className={styles.revealLoaderMoon}>
            <div className={styles.revealLoaderMoonCore} />
            <div className={styles.revealLoaderMoonGlow} />
          </div>
          <p className={styles.revealLoaderText}>正在为你编织梦境</p>
        </div>
      )}

      {/* Reading Progress - outside .page to avoid transform affecting fixed positioning */}
      <div className={styles.progressWrapper}>
        <div className={styles.readProgress} style={{ width: `${readProgress}%` }} role="progressbar" aria-valuenow={readProgress} aria-valuemin={0} aria-valuemax={100} aria-label="阅读进度" />
        <div className={styles.progressInfo}>
          <span className={styles.progressPercent}>{Math.round(readProgress)}%</span>
          {readProgress > 0 && readProgress < 100 && (
            <span className={styles.readingTime}>约{Math.ceil(story.split(/[\s\n]+/).length / 200)}分钟</span>
          )}
        </div>
      </div>

      <div className={`${styles.page} ${isRevealed ? styles.revealed : ''}`}>
        {/* Reveal glow effect */}
        <div className={styles.revealGlow} />
        <div className={styles.container}>
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { label: '首页', href: '/' },
            ...(fromDreamWall ? [{ label: '梦墙', href: '/wall' }] : fromHistory ? [{ label: '历史', href: '/history' }] : []),
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
            {fromDreamWall && !isAuthor && storyAuthorOpenid && !authorIsFriend && (
              <FriendRequestButton friendOpenid={storyAuthorOpenid} />
            )}
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

        {/* Nested Comment Thread - for Dream Wall posts */}
        {fromDreamWall && wallContext.postId && (
          <CommentThread postId={wallContext.postId} />
        )}

        {/* Feedback Panel - only visible to author */}
        {(fromDreamWall || fromHistory) && isAuthor && (
          <StoryFeedbackPanel sessionId={sessionId} />
        )}

        {/* Next Actions */}
        <div className={styles.nextActions}>
          <h3 className={styles.nextActionsTitle}>接下来做什么</h3>
          <div className={styles.nextActionsGrid}>
            <Link to="/dream" className={styles.nextActionCard}>
              <div className={styles.nextActionIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </div>
              <span className={styles.nextActionLabel}>再记录一个</span>
            </Link>
            <Link to="/wall" className={styles.nextActionCard}>
              <div className={styles.nextActionIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 2a7 7 0 0 1 0 14 7 7 0 0 1 0-14" />
                  <circle cx="12" cy="9" r="3" />
                </svg>
              </div>
              <span className={styles.nextActionLabel}>随便逛逛</span>
            </Link>
          </div>
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          {!fromHistory && !fromDreamWall && (
            <Button onClick={handleDone} size="lg" className={styles.doneBtn}>
              保存到我的故事
            </Button>
          )}

          {!fromDreamWall && (
            <div className={styles.secondaryActions}>
              {/* FAB for secondary actions */}
              <div className={styles.fabWrapper} ref={fabMenuRef}>
                <button
                  className={styles.fab}
                  onClick={() => {
                    if (fabJustClosedByOutsideRef.current) {
                      fabJustClosedByOutsideRef.current = false
                      return
                    }
                    setShowFabMenu(!showFabMenu)
                  }}
                  aria-expanded={showFabMenu}
                  aria-label="更多操作"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 20, height: 20 }}>
                    <circle cx="12" cy="5" r="1.5" fill="currentColor" />
                    <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                    <circle cx="12" cy="19" r="1.5" fill="currentColor" />
                  </svg>
                </button>
                {showFabMenu && (
                  <div className={styles.fabMenu} role="menu" aria-label="更多操作">
                    <button
                      className={styles.fabMenuItem}
                      onClick={() => {
                        setShowFabMenu(false)
                        setShowShareMenu(true)
                      }}
                      role="menuitem"
                      tabIndex={0}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}>
                        <circle cx="18" cy="5" r="3" />
                        <circle cx="6" cy="12" r="3" />
                        <circle cx="18" cy="19" r="3" />
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                      </svg>
                      分享
                    </button>
                    {!isPublished && (
                      <button
                        className={styles.fabMenuItem}
                        onClick={() => {
                          setShowFabMenu(false)
                          handlePublishToWall()
                        }}
                        role="menuitem"
                        tabIndex={0}
                        disabled={isPublishing}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}>
                          <circle cx="12" cy="12" r="10" />
                          <path d="M12 2a7 7 0 0 1 0 14 7 7 0 0 1 0-14" />
                          <circle cx="12" cy="9" r="3" />
                        </svg>
                        {isPublishing ? '发布中...' : '发布到梦墙'}
                      </button>
                    )}
                    {isPublished && (
                      publishedPostId ? (
                        <Link to={`/wall?post=${publishedPostId}`} className={styles.fabMenuLink} onClick={() => setShowFabMenu(false)}>
                          <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 18, height: 18 }}>
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                          在梦墙查看
                        </Link>
                      ) : (
                        <span className={styles.fabMenuItemDisabled}>
                          <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 18, height: 18 }}>
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                          已在梦墙
                        </span>
                      )
                    )}
                    <Link to="/dream" className={styles.fabMenuLink} onClick={() => setShowFabMenu(false)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}>
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                      记录新梦境
                    </Link>
                  </div>
                )}
              </div>

              {/* Share dropdown (triggered by FAB) */}
              <div className={styles.shareWrapper} ref={shareWrapperRef}>
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

              {/* Share confirmation modal */}
              <ConfirmModal
                isOpen={pendingShareType !== null}
                title="确认分享"
                message={`确定要分享到${pendingShareType === 'moment' ? '朋友圈' : '微信好友'}吗？`}
                confirmText="确认分享"
                cancelText="取消"
                onConfirm={handleConfirmShare}
                onCancel={() => setPendingShareType(null)}
              />
            </div>
          )}

          {/* AI Assistant Dropdown - for normal flow or authors from Dream Wall */}
          {(!fromDreamWall || isAuthor) && (
            <div className={styles.aiWrapper} ref={aiWrapperRef}>
              <Button
                variant="secondary"
                onClick={() => setShowAiMenu(!showAiMenu)}
                aria-expanded={showAiMenu}
                disabled={isInterpreting}
                className={isSpeaking ? styles.ttsButtonActive : ''}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}>
                  {isSpeaking ? (
                    <>
                      <rect x="6" y="4" width="4" height="16" rx="1" />
                      <rect x="14" y="4" width="4" height="16" rx="1" />
                    </>
                  ) : (
                    <>
                      <path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z" />
                      <path d="M9 21h6" />
                    </>
                  )}
                </svg>
                AI 助手
              </Button>
              {showAiMenu && (
                <div className={styles.shareMenu} role="menu" aria-label="AI 助手选项" ref={aiMenuRef}>
                  <button
                    className={styles.shareMenuItem}
                    onClick={() => {
                      handleSpeakStory()
                      setShowAiMenu(false)
                    }}
                    role="menuitem"
                    tabIndex={0}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}>
                      {isSpeaking ? (
                        <>
                          <rect x="6" y="4" width="4" height="16" rx="1" />
                          <rect x="14" y="4" width="4" height="16" rx="1" />
                        </>
                      ) : (
                        <>
                          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                        </>
                      )}
                    </svg>
                    {isSpeaking ? '停止朗读' : '听故事朗读'}
                  </button>
                  {voices.length > 1 && !isSpeaking && (
                    <div className={styles.voiceSubMenu}>
                      <span className={styles.subMenuLabel}>选择声音</span>
                      {voices
                        .filter(v => v.name.toLowerCase().includes('google'))
                        .slice(0, 6)
                        .map((voice) => (
                          <button
                            key={voice.name}
                            className={`${styles.shareMenuItem} ${selectedVoice?.name === voice.name ? styles.selectedVoice : ''}`}
                            onClick={() => {
                              setVoice(voice)
                            }}
                            role="menuitem"
                            tabIndex={0}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                            </svg>
                            {voice.name.length > 18 ? voice.name.substring(0, 18) + '...' : voice.name}
                          </button>
                        ))}
                    </div>
                  )}
                  {user && (
                    <div className={styles.pointsHint}>
                      剩余积分: <strong>{user.points ?? 0}</strong> | 解读需 <strong>10</strong> 积分
                    </div>
                  )}
                  <button
                    className={`${styles.shareMenuItem} ${!user || user.points < 10 ? styles.menuItemDisabled : ''}`}
                    onClick={() => {
                      if (!user || user.points < 10) return
                      handleInterpret()
                      setShowAiMenu(false)
                    }}
                    role="menuitem"
                    tabIndex={0}
                    title={!user ? '请先登录' : user.points < 10 ? '积分不足' : ''}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}>
                      {!user ? (
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      ) : (
                        <>
                          <path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z" />
                          <path d="M9 21h6" />
                        </>
                      )}
                    </svg>
                    {isInterpreting ? '解读生成中...' : user ? 'AI 梦境解读' : '登录后使用'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Standalone TTS button for non-authors viewing from Dream Wall */}
          {fromDreamWall && !isAuthor && (
            <div className={styles.aiWrapper} ref={aiWrapperRef}>
              <Button
                variant="secondary"
                onClick={handleSpeakStory}
                className={isSpeaking ? styles.ttsButtonActive : ''}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}>
                  {isSpeaking ? (
                    <>
                      <rect x="6" y="4" width="4" height="16" rx="1" />
                      <rect x="14" y="4" width="4" height="16" rx="1" />
                    </>
                  ) : (
                    <>
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                    </>
                  )}
                </svg>
                {isSpeaking ? '停止朗读' : '听故事朗读'}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Story Feedback Form */}
      <StoryFeedbackForm sessionId={sessionId} isAuthor={isAuthor} />

      {/* Toast */}
      <Toast message={toastMessage} visible={toastVisible} onClose={handleToastClose} type={toastType} />

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
            const openid = currentUserOpenid
            // Show immediate feedback
            setToastType('success')
            setToastMessage('海报已保存')
            setToastVisible(true)
            if (openid) {
              try {
                const result = await shareApi.logShare(openid, type)
                if (result.data?.success) {
                  const parts: string[] = []
                  if (result.data.pointsEarned) parts.push(`+${result.data.pointsEarned} 积分`)
                  if (result.data.medalsUnlocked?.length) parts.push(`${result.data.medalsUnlocked.join(',')} 已解锁`)
                  if (parts.length) {
                    setToastType('success')
                    setToastMessage(parts.join(' '))
                    setToastVisible(true)
                  }
                } else if (result.data?.reason) {
                  setToastType('error')
                  setToastMessage(result.data.reason)
                  setToastVisible(true)
                }
              } catch {
                // Silently fail - already showed initial toast
              }
            }
          }}
        />
      )}

      {/* Floating particles */}
      <div className={styles.particles}>
        {particlePositions.map((particle, i) => (
          <span
            key={i}
            className={styles.particle}
            style={particle}
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
    </>
  )
}
