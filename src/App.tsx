import { useEffect, useRef } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Navbar } from './components/Navbar'
import { BottomNav } from './components/BottomNav'
import { PageTransition } from './components/PageTransition'
import { AchievementToast } from './components/AchievementToast'
import { AtmosphereEffects } from './components/effects/AtmosphereEffects'
import { SkipLink } from './components/SkipLink'
import { ProtectedRoute } from './components/ProtectedRoute'
import { GlobalErrorBoundary } from './components/GlobalErrorBoundary'
import { PageErrorBoundary } from './components/PageErrorBoundary'
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
import { Friends } from './pages/Friends'
import { FriendProfile } from './pages/FriendProfile'
import { DreamWall } from './pages/DreamWall'
import { WeChatCallback } from './pages/WeChatCallback'
import { Notifications } from './pages/Notifications'

function App() {
  const { recentlyUnlocked, clearRecentlyUnlocked, fontSize, theme, reduceMotion, history, achievements, unlockAchievement } = useDreamStore()
  const { playSound } = useAchievementSound()
  const lastPlayedRef = useRef<string | null>(null)

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
      <Navbar />
      <PageTransition>
        <main id="main-content" role="main" aria-label="主内容区域">
          <GlobalErrorBoundary>
            <Routes>
            <Route path="/" element={<PageErrorBoundary><Home /></PageErrorBoundary>} />
            <Route path="/dream" element={<PageErrorBoundary><Dream /></PageErrorBoundary>} />
            <Route path="/questions" element={<PageErrorBoundary><Questions /></PageErrorBoundary>} />
            <Route path="/story/:sessionId" element={<PageErrorBoundary><Story /></PageErrorBoundary>} />
            <Route path="/history" element={<PageErrorBoundary><History /></PageErrorBoundary>} />
            <Route path="/favorites" element={<PageErrorBoundary><Favorites /></PageErrorBoundary>} />
            <Route path="/wall" element={<PageErrorBoundary><DreamWall /></PageErrorBoundary>} />
            <Route path="/login" element={<PageErrorBoundary><Login /></PageErrorBoundary>} />
            <Route path="/register" element={<PageErrorBoundary><Register /></PageErrorBoundary>} />
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
          </Routes>
          </GlobalErrorBoundary>
        </main>
      </PageTransition>

      <BottomNav />

      <AchievementToast
        achievement={currentAchievement}
        onDismiss={handleClose}
      />
    </div>
  )
}

export default App
