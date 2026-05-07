import { useState, useEffect, useCallback } from 'react'

export interface PWAState {
  isOnline: boolean
  isStandalone: boolean
  installPromptEvent: BeforeInstallPromptEvent | null
  needsUpdate: boolean
  swVersion: string | null
  isInstalled: boolean
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function usePWA() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [isStandalone, setIsStandalone] = useState(false)
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [needsUpdate, setNeedsUpdate] = useState(false)
  const [swVersion, setSwVersion] = useState<string | null>(null)

  // Check if running as standalone PWA
  useEffect(() => {
    const checkStandalone = () => {
      setIsStandalone(
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true
      )
    }
    checkStandalone()

    // Listen for display mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)')
    const handler = () => checkStandalone()
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Capture install prompt event
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      console.log('[PWA] Install prompt captured')
      setInstallPromptEvent(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  // Listen for SW updates
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    const checkSWUpdate = async () => {
      try {
        const registration = await navigator.serviceWorker.ready
        if (registration.waiting) {
          setNeedsUpdate(true)
        }

        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setNeedsUpdate(true)
              }
            })
          }
        })

        // Get SW version
        const controller = navigator.serviceWorker.controller
        if (controller) {
          controller.postMessage({ type: 'GET_VERSION' })
        }
      } catch (e) {
        console.error('[PWA] Error checking SW update:', e)
      }
    }

    checkSWUpdate()

    // Listen for messages from SW
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'SW_VERSION') {
        setSwVersion(e.data.version)
      }
      if (e.data?.type === 'SYNC_REQUIRED') {
        // Trigger sync in the app
        window.dispatchEvent(new CustomEvent('pwa-sync-required'))
      }
    }

    navigator.serviceWorker.addEventListener('message', handleMessage)
    return () => navigator.serviceWorker.removeEventListener('message', handleMessage)
  }, [])

  // Prompt user to install PWA
  const installApp = useCallback(async (): Promise<boolean> => {
    if (!installPromptEvent) {
      console.warn('[PWA] No install prompt event available')
      return false
    }

    try {
      await installPromptEvent.prompt()
      const { outcome } = await installPromptEvent.userChoice
      console.log('[PWA] Install prompt outcome:', outcome)

      if (outcome === 'accepted') {
        setInstallPromptEvent(null)
        return true
      }
      return false
    } catch (e) {
      console.error('[PWA] Error prompting install:', e)
      return false
    }
  }, [installPromptEvent])

  // Dismiss install prompt (user chose not to install)
  const dismissInstallPrompt = useCallback(() => {
    setInstallPromptEvent(null)
  }, [])

  // Apply SW update
  const applyUpdate = useCallback(async () => {
    if (!('serviceWorker' in navigator)) return

    try {
      const registration = await navigator.serviceWorker.ready
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' })
        setNeedsUpdate(false)

        // Reload to activate new SW
        window.location.reload()
      }
    } catch (e) {
      console.error('[PWA] Error applying update:', e)
    }
  }, [])

  // Request cache update for specific URLs
  const cacheUrls = useCallback(async (urls: string[]) => {
    if (!('serviceWorker' in navigator)) return

    try {
      const registration = await navigator.serviceWorker.ready
      registration.active?.postMessage({
        type: 'CACHE_URLS',
        data: { urls }
      })
    } catch (e) {
      console.error('[PWA] Error caching URLs:', e)
    }
  }, [])

  return {
    isOnline,
    isStandalone,
    installPromptEvent: !!installPromptEvent,
    installAvailable: !!installPromptEvent,
    needsUpdate,
    swVersion,
    installApp,
    dismissInstallPrompt,
    applyUpdate,
    cacheUrls,
    isInstalled: isStandalone,
  }
}
