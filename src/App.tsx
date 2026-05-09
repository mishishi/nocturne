import { useEffect, useRef, useState, lazy, Suspense } from 'react'
import { I18nextProvider } from 'react-i18next'
import i18n from './i18n'
import { LoadingSpinner } from './components/ui/LoadingSpinner'
import { registerToastCallback, unregisterToastCallback } from './hooks/useDreamStore'
import { useSettingsStore } from './hooks/useSettingsStore'
import { usePageTracking, usePageTrackingOnUnmount } from './hooks/useAnalytics'
import { analyticsService } from './services/analytics'
import { Toast } from './components/ui/Toast'
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom'
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
import { PWAInstallPrompt } from './components/PWAInstallPrompt'
import { OfflineBanner } from './components/OfflineBanner'
import { SWUpdatePrompt } from './components/SWUpdatePrompt'
import { SupportChat } from './components/SupportChat'
import { CookieConsent, hasCookieConsent, getCookiePreferences } from './components/CookieConsent'
import { useDreamStore, ACHIEVEMENTS } from './hooks/useDreamStore'
import { useAchievementSound } from './hooks/useAchievementSound'
import { hasValidToken } from './utils/auth'
import { Home } from './pages/Home'
import { Dream } from './pages/Dream'
import { Questions } from './pages/Questions'
import { Story } from './pages/Story'
import { History } from './pages/History'
import { Favorites } from './pages/Favorites'
import { Profile } from './pages/Profile'
import { PrivacyPolicy } from './pages/PrivacyPolicy'
import { TermsOfService } from './pages/TermsOfService'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { ForgotPassword } from './pages/ForgotPassword'
import { AccountRecovery } from './pages/AccountRecovery'
import { Friends } from './pages/Friends'
import { FriendProfile } from './pages/FriendProfile'
import { DreamWall } from './pages/DreamWall'
import { WeChatCallback } from './pages/WeChatCallback'
import { Notifications } from './pages/Notifications'
import { Chat } from './pages/Chat'
import { AdminRoute } from './components/AdminRoute'
import { AdminLayout } from './components/AdminLayout'
import { DemoExperience } from './pages/DemoExperience'
import { Library } from './pages/Library'
import { Collection } from './pages/Collection'
import { Drafts } from './pages/Drafts'
import { NotFound } from './pages/NotFound'

// Lazy-loaded admin pages (less frequently accessed)
const Dashboard = lazy(() => import('./pages/admin/Dashboard').then(m => ({ default: m.Dashboard })))
const Stats = lazy(() => import('./pages/admin/Stats').then(m => ({ default: m.Stats })))
const PendingPosts = lazy(() => import('./pages/admin/PendingPosts').then(m => ({ default: m.PendingPosts })))
const CommentManagement = lazy(() => import('./pages/admin/CommentManagement').then(m => ({ default: m.CommentManagement })))
const Highlights = lazy(() => import('./pages/admin/Highlights').then(m => ({ default: m.Highlights })))
const LibraryAssets = lazy(() => import('./pages/admin/LibraryAssets').then(m => ({ default: m.LibraryAssets })))

// Lazy-loaded demo pages (for streaming effects demo)
const StreamingEffectsDemo = lazy(() => import('./pages/StreamingEffectsDemo').then(m => ({ default: m.StreamingEffectsDemo })))
const StreamingLayoutDemo = lazy(() => import('./pages/StreamingLayoutDemo').then(m => ({ default: m.StreamingLayoutDemo })))

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
  '/account-recovery': '找回密码 - 夜棂',
  '/privacy': '隐私政策 - 夜棂',
  '/terms': '用户协议 - 夜棂',
  '/profile': '个人中心 - 夜棂',
  '/friends': '好友列表 - 夜棂',
  '/notifications': '通知 - 夜棂',
  '/chat': '聊天 - 夜棂',
  '/admin': '管理后台 - 夜棂',
  '/admin/pending': '待审核 - 管理后台 - 夜棂',
  '/admin/comments': '评论管理 - 管理后台 - 夜棂',
  '/admin/stats': '数据统计 - 管理后台 - 夜棂',
  '/admin/library': '图书馆 - 管理后台 - 夜棂',
  '/library': '梦境图书馆 - 夜棂',
  '/collection': '合集详情 - 夜棂',
  '/drafts': '草稿箱 - 夜棂'
}

function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const { recentlyUnlocked, clearRecentlyUnlocked, fontSize, theme, reduceMotion, user, syncAchievementsFromServer } = useDreamStore()
  const { language: settingsLanguage } = useSettingsStore()
  const { playSound } = useAchievementSound()
  const lastPlayedRef = useRef<string | null>(null)
  const [showDraftConfirm, setShowDraftConfirm] = useState(false)
  const [showReEngagement, setShowReEngagement] = useState(false)
  const [toastVisible, setToastVisible] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error'>('success')
  const [cookieConsent, setCookieConsent] = useState<{
    necessary: boolean
    analytics: boolean
    客服: boolean
  } | null>(() => {
    if (hasCookieConsent()) {
      return getCookiePreferences()
    }
    return null
  })

  // PWA: Register Service Worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[App] Service Worker registered:', registration.scope)
        })
        .catch((error) => {
          console.error('[App] Service Worker registration failed:', error)
        })
    }
  }, [])

  // Handle cookie consent changes
  const handleCookieConsentChange = (prefs: typeof cookieConsent) => {
    if (prefs?.analytics) {
      const endpoint = import.meta.env.VITE_UMAMI_ENDPOINT
      const websiteId = import.meta.env.VITE_UMAMI_WEBSITE_ID
      if (endpoint && websiteId) {
        analyticsService.configure({ endpoint, websiteId })
      }
    }
    setCookieConsent(prefs)
  }

  // Analytics: Configure and track page views (only if analytics consent given)
  useEffect(() => {
    if (!cookieConsent?.analytics) return
    const endpoint = import.meta.env.VITE_UMAMI_ENDPOINT
    const websiteId = import.meta.env.VITE_UMAMI_WEBSITE_ID
    if (endpoint && websiteId) {
      analyticsService.configure({ endpoint, websiteId })
    }
  }, [cookieConsent?.analytics])

  // Track page views on route changes
  usePageTracking()

  // Flush analytics on page unload
  usePageTrackingOnUnmount()

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
    navigate('/dream?new=1', { replace: true })
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

  // Sync language setting with i18n
  useEffect(() => {
    i18n.changeLanguage(settingsLanguage)
  }, [settingsLanguage])

  // Play achievement sound when achievement is unlocked
  useEffect(() => {
    if (recentlyUnlocked.length > 0 && recentlyUnlocked[0] !== lastPlayedRef.current) {
      lastPlayedRef.current = recentlyUnlocked[0]
      playSound('unlock')
    }
  }, [recentlyUnlocked, playSound])


  // Sync achievements from server on app start (for users who logged in on other devices)
  useEffect(() => {
    if (user && hasValidToken()) {
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
    return () => unregisterToastCallback()
  }, [])

  // Register Service Worker for push notifications
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(
        (registration) => {
          console.log('[App] Service Worker registered:', registration.scope)
        },
        (error) => {
          console.error('[App] Service Worker registration failed:', error)
        }
      )
    }
  }, [])

  // Get the first recently unlocked achievement to show
  const currentAchievement = recentlyUnlocked.length > 0
    ? ACHIEVEMENTS.find(a => a.id === recentlyUnlocked[0]) || null
    : null

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  // Auto-clear when modal closes
  const handleClose = () => {
    if (recentlyUnlocked.length > 0) {
      clearRecentlyUnlocked(recentlyUnlocked[0])
    }
  }

  return (
    <I18nextProvider i18n={i18n}>
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
            <Route path="/history" element={<PageErrorBoundary><ProtectedRoute><History /></ProtectedRoute></PageErrorBoundary>} />
            <Route path="/favorites" element={<PageErrorBoundary><ProtectedRoute><Favorites /></ProtectedRoute></PageErrorBoundary>} />
            <Route path="/wall" element={<PageErrorBoundary><DreamWall /></PageErrorBoundary>} />
            <Route path="/login" element={<PageErrorBoundary><Login /></PageErrorBoundary>} />
            <Route path="/register" element={<PageErrorBoundary><Register /></PageErrorBoundary>} />
            <Route path="/forgot-password" element={<PageErrorBoundary><ForgotPassword /></PageErrorBoundary>} />
            <Route path="/account-recovery" element={<PageErrorBoundary><AccountRecovery /></PageErrorBoundary>} />
            <Route path="/privacy" element={<PageErrorBoundary><PrivacyPolicy /></PageErrorBoundary>} />
            <Route path="/terms" element={<PageErrorBoundary><TermsOfService /></PageErrorBoundary>} />
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
            <Route path="/notifications" element={<PageErrorBoundary><ProtectedRoute><Notifications /></ProtectedRoute></PageErrorBoundary>} />
            <Route path="/chat" element={
              <PageErrorBoundary><ProtectedRoute><Chat /></ProtectedRoute></PageErrorBoundary>
            } />
            <Route path="/admin" element={
              <PageErrorBoundary><AdminRoute><AdminLayout><Suspense fallback={<LoadingSpinner />}><Dashboard /></Suspense></AdminLayout></AdminRoute></PageErrorBoundary>
            } />
            <Route path="/admin/pending" element={
              <PageErrorBoundary><AdminRoute><AdminLayout><Suspense fallback={<LoadingSpinner />}><PendingPosts /></Suspense></AdminLayout></AdminRoute></PageErrorBoundary>
            } />
            <Route path="/admin/comments" element={
              <PageErrorBoundary><AdminRoute><AdminLayout><Suspense fallback={<LoadingSpinner />}><CommentManagement /></Suspense></AdminLayout></AdminRoute></PageErrorBoundary>
            } />
            <Route path="/admin/stats" element={
              <PageErrorBoundary><AdminRoute><AdminLayout><Suspense fallback={<LoadingSpinner />}><Stats /></Suspense></AdminLayout></AdminRoute></PageErrorBoundary>
            } />
            <Route path="/admin/highlights" element={
              <PageErrorBoundary><AdminRoute><AdminLayout><Suspense fallback={<LoadingSpinner />}><Highlights /></Suspense></AdminLayout></AdminRoute></PageErrorBoundary>
            } />
            <Route path="/admin/library" element={
              <PageErrorBoundary><AdminRoute><AdminLayout><Suspense fallback={<LoadingSpinner />}><LibraryAssets /></Suspense></AdminLayout></AdminRoute></PageErrorBoundary>
            } />
            <Route path="/library" element={<PageErrorBoundary><Library /></PageErrorBoundary>} />
            <Route path="/collection/:id" element={<PageErrorBoundary><Collection /></PageErrorBoundary>} />
            <Route path="/drafts" element={<PageErrorBoundary><Drafts /></PageErrorBoundary>} />
            <Route path="/streaming-demo" element={<PageErrorBoundary><Suspense fallback={<LoadingSpinner />}><StreamingEffectsDemo /></Suspense></PageErrorBoundary>} />
            <Route path="/layout-demo" element={<PageErrorBoundary><Suspense fallback={<LoadingSpinner />}><StreamingLayoutDemo /></Suspense></PageErrorBoundary>} />
            <Route path="*" element={<PageErrorBoundary><NotFound /></PageErrorBoundary>} />
          </Routes>
          </GlobalErrorBoundary>
        </main>
      </PageTransition>

      {!location.pathname.startsWith('/admin') && (
        <BottomNav />
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

      <OfflineBanner />
      <PWAInstallPrompt />
      <SWUpdatePrompt />

      {/* Cookie Consent Banner */}
      <CookieConsent onConsentChange={handleCookieConsentChange} />

      {/* Customer Support - Crisp.chat (only if user consented) */}
      {import.meta.env.VITE_CRISP_WEBSITE_ID && cookieConsent?.客服 && (
        <SupportChat websiteId={import.meta.env.VITE_CRISP_WEBSITE_ID} />
      )}
    </div>
    </I18nextProvider>
  )
}

export default App
