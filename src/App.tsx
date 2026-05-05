import { useEffect, useRef, useState } from 'react'
import { registerToastCallback } from './hooks/useDreamStore'
import { Toast } from './components/ui/Toast'
import { Routes, Route, useLocation } from 'react-router-dom'
import { Navbar } from './components/Navbar'
import { MobileHeader } from './components/MobileHeader'
import { BottomNav } from './components/BottomNav'
import { PageTransition } from './components/PageTransition'
import { AchievementToast } from './components/AchievementToast'
import { ReEngagementModal, updateLastActiveDate, shouldShowReEngagement, markReEngagementShown, hasShownReEngagementThisSession } from './components/ReEngagementModal'
import { AtmosphereEffects } from './components/effects/AtmosphereEffects'
import { SkipLink } from './components/SkipLink'
import { ProtectedRoute } from './components/ProtectedRoute'
import { GlobalErrorBoundary } from './components/GlobalErrorBoundary'
import { PageErrorBoundary } from './components/PageErrorBoundary'
import { ConfirmModal } from './components/ui/ConfirmModal'
import { useDreamStore, ACHIEVEMENTS } from './hooks/useDreamStore'
import { useAchievementSound } from './hooks/useAchievementSound'
import { Home } from './pages/Home'
import { Dream } from './pages/Dream'
import { Questions } from './pages/Questions'
import { Story } from './pages/Story'
import { History } from './pages/History'
import { Favorites } from './pages/Favorites'
import { Profile } from './pages/Profile'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { ForgotPassword } from './pages/ForgotPassword'
import { Friends } from './pages/Friends'
import { FriendProfile } from './pages/FriendProfile'
import { DreamWall } from './pages/DreamWall'
import { WeChatCallback } from './pages/WeChatCallback'
import { Notifications } from './pages/Notifications'
import { Chat } from './pages/Chat'
import { AdminRoute } from './components/AdminRoute'
import { AdminLayout } from './components/AdminLayout'
import { Dashboard } from './pages/admin/Dashboard'
import { PendingPosts } from './pages/admin/PendingPosts'
import { CommentManagement } from './pages/admin/CommentManagement'
import { DemoExperience } from './pages/DemoExperience'
import { StreamingEffectsDemo } from './pages/StreamingEffectsDemo'
import { StreamingLayoutDemo } from './pages/StreamingLayoutDemo'

// Page title mapping
const PAGE_TITLES: Record<string, string> = {
  '/': '夜棂 - 穿越梦境的星门',
  '/dream': '记录梦境 - 夜棂',
  '/demo': '体验梦境 - 夜棂',
  '/questions': '回答问题 - 夜棂',
  '/history': '历史记录 - 夜棂',
  '/favorites': '我的收藏 - 夜棂',
  '/wall': '梦墙 - 夜棂',
  '/login': '登录 - 夜棂',
  '/register': '注册 - 夜棂',
  '/forgot-password': '忘记密码 - 夜棂',
  '/profile': '个人中心 - 夜棂',
  '/friends': '好友列表 - 夜棂',
  '/notifications': '通知 - 夜棂',
  '/chat': '聊天 - 夜棂',
  '/admin': '管理后台 - 夜棂',
  '/admin/pending': '待审核 - 管理后台 - 夜棂',
  '/admin/comments': '评论管理 - 管理后台 - 夜棂',
  '/admin/stats': '数据统计 - 管理后台 - 夜棂'
}

function App() {
  const location = useLocation()
  const { recentlyUnlocked, clearRecentlyUnlocked, fontSize, theme, reduceMotion, history, achievements, unlockAchievement, user, syncAchievementsFromServer } = useDreamStore()
  const { playSound } = useAchievementSound()
  const lastPlayedRef = useRef<string | null>(null)
  const [showDraftConfirm, setShowDraftConfirm] = useState(false)
  const [showReEngagement, setShowReEngagement] = useState(false)
  const [toastVisible, setToastVisible] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error'>('success')

  // Re-engagement: check if should show modal based on last active date
  useEffect(() => {
    if (!user) return // Only for logged-in users

    // Check if we should show the re-engagement modal
    // (only once per browser session, and only if 3+ days inactive)
    const alreadyShownThisSession = hasShownReEngagementThisSession()
    const shouldShow = shouldShowReEngagement(alreadyShownThisSession)
    if (shouldShow) {
      markReEngagementShown()
      setShowReEngagement(true)
    }
  }, [user])

  const handleCloseReEngagement = () => {
    setShowReEngagement(false)
    // Mark as seen for this session by updating last active to today
    updateLastActiveDate()
  }

  // Update page title based on route
  useEffect(() => {
    const path = location.pathname
    // Check for exact match first
    if (PAGE_TITLES[path]) {
      document.title = PAGE_TITLES[path]
      return
    }
    // Check for pattern matches (e.g., /story/:sessionId)
    if (path.startsWith('/story/')) {
      document.title = '故事详情 - 夜棂'
      return
    }
    if (path.startsWith('/friends/')) {
      document.title = '好友主页 - 夜棂'
      return
    }
    // Default title
    document.title = '夜棂 - 穿越梦境的星门'
  }, [location])

  const handleDraftConfirm = () => {
    localStorage.removeItem('yeelin_draft')
    setShowDraftConfirm(false)
    window.location.href = '/dream?new=1'
  }

  // Sync fontSize and theme to documentElement for CSS selectors
  useEffect(() => {
    document.documentElement.setAttribute('data-font-size', fontSize)
  }, [fontSize])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    document.documentElement.setAttribute('data-reduce-motion', String(reduceMotion))
  }, [reduceMotion])

  // Play achievement sound when achievement is unlocked
  useEffect(() => {
    if (recentlyUnlocked.length > 0 && recentlyUnlocked[0] !== lastPlayedRef.current) {
      lastPlayedRef.current = recentlyUnlocked[0]
      playSound('unlock')
    }
  }, [recentlyUnlocked, playSound])

  // Retroactive achievement check on app start (catches stories loaded from backend)
  useEffect(() => {
    if (history.length > 0 && !achievements.includes('first_dream')) {
      unlockAchievement('first_dream')
    }
  }, [])

  // Sync achievements from server on app start (for users who logged in on other devices)
  useEffect(() => {
    if (user) {
      syncAchievementsFromServer()
    }
  }, [])

  // Register Toast callback for background task error notifications
  useEffect(() => {
    registerToastCallback((message: string, type: 'success' | 'error') => {
      setToastMessage(message)
      setToastType(type)
      setToastVisible(true)
    })
  }, [])

  // Get the first recently unlocked achievement to show
  const currentAchievement = recentlyUnlocked.length > 0
    ? ACHIEVEMENTS.find(a => a.id === recentlyUnlocked[0]) || null
    : null

  // Auto-clear when modal closes
  const handleClose = () => {
    if (recentlyUnlocked.length > 0) {
      clearRecentlyUnlocked(recentlyUnlocked[0])
    }
  }

  return (
    <div data-font-size={fontSize} data-theme={theme}>
      <SkipLink />
      <AtmosphereEffects />
      {!location.pathname.startsWith('/admin') && <Navbar />}
      {!location.pathname.startsWith('/admin') && <MobileHeader />}
      <PageTransition>
        <main id="main-content" role="main" aria-label="主内容区域">
          <GlobalErrorBoundary>
            <Routes>
            <Route path="/" element={<PageErrorBoundary><Home /></PageErrorBoundary>} />
            <Route path="/dream" element={<PageErrorBoundary><Dream /></PageErrorBoundary>} />
            <Route path="/demo" element={<PageErrorBoundary><DemoExperience /></PageErrorBoundary>} />
            <Route path="/questions" element={<PageErrorBoundary><Questions /></PageErrorBoundary>} />
            <Route path="/story/:sessionId" element={<PageErrorBoundary><Story /></PageErrorBoundary>} />
            <Route path="/history" element={<PageErrorBoundary><History /></PageErrorBoundary>} />
            <Route path="/favorites" element={<PageErrorBoundary><Favorites /></PageErrorBoundary>} />
            <Route path="/wall" element={<PageErrorBoundary><DreamWall /></PageErrorBoundary>} />
            <Route path="/login" element={<PageErrorBoundary><Login /></PageErrorBoundary>} />
            <Route path="/register" element={<PageErrorBoundary><Register /></PageErrorBoundary>} />
            <Route path="/forgot-password" element={<PageErrorBoundary><ForgotPassword /></PageErrorBoundary>} />
            <Route path="/profile" element={
              <PageErrorBoundary><ProtectedRoute><Profile /></ProtectedRoute></PageErrorBoundary>
            } />
            <Route path="/friends" element={
              <PageErrorBoundary><ProtectedRoute><Friends /></ProtectedRoute></PageErrorBoundary>
            } />
            <Route path="/friends/:openid" element={
              <PageErrorBoundary><ProtectedRoute><FriendProfile /></ProtectedRoute></PageErrorBoundary>
            } />
            <Route path="/auth/wechat/callback" element={<PageErrorBoundary><WeChatCallback /></PageErrorBoundary>} />
            <Route path="/notifications" element={<PageErrorBoundary><Notifications /></PageErrorBoundary>} />
            <Route path="/chat" element={
              <PageErrorBoundary><ProtectedRoute><Chat /></ProtectedRoute></PageErrorBoundary>
            } />
            <Route path="/admin" element={
              <PageErrorBoundary><AdminRoute><AdminLayout><Dashboard /></AdminLayout></AdminRoute></PageErrorBoundary>
            } />
            <Route path="/admin/pending" element={
              <PageErrorBoundary><AdminRoute><AdminLayout><PendingPosts /></AdminLayout></AdminRoute></PageErrorBoundary>
            } />
            <Route path="/admin/comments" element={
              <PageErrorBoundary><AdminRoute><AdminLayout><CommentManagement /></AdminLayout></AdminRoute></PageErrorBoundary>
            } />
            <Route path="/admin/stats" element={
              <PageErrorBoundary><AdminRoute><AdminLayout><Dashboard /></AdminLayout></AdminRoute></PageErrorBoundary>
            } />
            <Route path="/streaming-demo" element={<PageErrorBoundary><StreamingEffectsDemo /></PageErrorBoundary>} />
            <Route path="/layout-demo" element={<PageErrorBoundary><StreamingLayoutDemo /></PageErrorBoundary>} />
          </Routes>
          </GlobalErrorBoundary>
        </main>
      </PageTransition>

      {!location.pathname.startsWith('/admin') && (
        <BottomNav onDraftConfirm={() => setShowDraftConfirm(true)} />
      )}

      <ConfirmModal
        isOpen={showDraftConfirm}
        title="放弃当前草稿？"
        message="你有一段未完成的梦境记录，开始新记录将丢失当前内容。"
        confirmText="开始新记录"
        cancelText="继续编辑"
        onConfirm={handleDraftConfirm}
        onCancel={() => setShowDraftConfirm(false)}
        danger
      />

      <AchievementToast
        achievement={currentAchievement}
        onDismiss={handleClose}
      />

      {showReEngagement && <ReEngagementModal onClose={handleCloseReEngagement} />}

      <Toast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onClose={() => setToastVisible(false)}
      />
    </div>
  )
}

export default App
