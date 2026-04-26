import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Navbar } from './components/Navbar'
import { PageTransition } from './components/PageTransition'
import { AchievementUnlockModal } from './components/ui/AchievementUnlockModal'
import { AtmosphereEffects } from './components/effects/AtmosphereEffects'
import { SkipLink } from './components/SkipLink'
import { useDreamStore, ACHIEVEMENTS } from './hooks/useDreamStore'
import { Home } from './pages/Home'
import { Dream } from './pages/Dream'
import { Questions } from './pages/Questions'
import { Story } from './pages/Story'
import { History } from './pages/History'
import { Profile } from './pages/Profile'

function App() {
  const { recentlyUnlocked, clearRecentlyUnlocked, fontSize, theme } = useDreamStore()

  // Sync fontSize and theme to documentElement for CSS selectors
  useEffect(() => {
    document.documentElement.setAttribute('data-font-size', fontSize)
  }, [fontSize])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

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
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </main>
      </PageTransition>

      <AchievementUnlockModal
        achievement={currentAchievement}
        isOpen={currentAchievement !== null}
        onClose={handleClose}
      />

      <footer role="contentinfo" className="sr-only" aria-label="页脚">
        <p>夜棂 - 记录你的每一个梦境</p>
      </footer>
    </div>
  )
}

export default App
