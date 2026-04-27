import { useEffect, useRef } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Navbar } from './components/Navbar'
import { BottomNav } from './components/BottomNav'
import { PageTransition } from './components/PageTransition'
import { AchievementUnlockModal } from './components/ui/AchievementUnlockModal'
import { AtmosphereEffects } from './components/effects/AtmosphereEffects'
import { SkipLink } from './components/SkipLink'
import { ProtectedRoute } from './components/ProtectedRoute'
import { useDreamStore, ACHIEVEMENTS } from './hooks/useDreamStore'
import { useAchievementSound } from './hooks/useAchievementSound'
import { Home } from './pages/Home'
import { Dream } from './pages/Dream'
import { Questions } from './pages/Questions'
import { Story } from './pages/Story'
import { History } from './pages/History'
import { Profile } from './pages/Profile'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { Friends } from './pages/Friends'
import { DreamWall } from './pages/DreamWall'

function App() {
  const { recentlyUnlocked, clearRecentlyUnlocked, fontSize, theme } = useDreamStore()
  const { playSound } = useAchievementSound()
  const lastPlayedRef = useRef<string | null>(null)

  // Sync fontSize and theme to documentElement for CSS selectors
  useEffect(() => {
    document.documentElement.setAttribute('data-font-size', fontSize)
  }, [fontSize])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // Play achievement sound when achievement is unlocked
  useEffect(() => {
    if (recentlyUnlocked.length > 0 && recentlyUnlocked[0] !== lastPlayedRef.current) {
      lastPlayedRef.current = recentlyUnlocked[0]
      playSound('unlock')
    }
  }, [recentlyUnlocked, playSound])

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
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dream" element={<Dream />} />
            <Route path="/questions" element={<Questions />} />
            <Route path="/story" element={<Story />} />
            <Route path="/history" element={<History />} />
            <Route path="/wall" element={<DreamWall />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/profile" element={
              <ProtectedRoute><Profile /></ProtectedRoute>
            } />
            <Route path="/friends" element={
              <ProtectedRoute><Friends /></ProtectedRoute>
            } />
          </Routes>
        </main>
      </PageTransition>

      <BottomNav />

      <AchievementUnlockModal
        achievement={currentAchievement}
        isOpen={currentAchievement !== null}
        onClose={handleClose}
      />
    </div>
  )
}

export default App
