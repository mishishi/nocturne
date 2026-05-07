import { useState, useEffect, useCallback } from 'react'
import { usePWA } from './usePWA'
import * as offlineStorage from '../services/offlineStorage'

export interface OfflineStats {
  totalDreams: number
  unsyncedDreams: number
  totalSessions: number
  syncQueueLength: number
  isSyncing: boolean
  lastSyncTime: string | null
  syncError: string | null
}

export function useOfflineSync() {
  const { isOnline } = usePWA()
  const [stats, setStats] = useState<OfflineStats>({
    totalDreams: 0,
    unsyncedDreams: 0,
    totalSessions: 0,
    syncQueueLength: 0,
    isSyncing: false,
    lastSyncTime: null,
    syncError: null
  })

  // Refresh stats
  const refreshStats = useCallback(async () => {
    try {
      const offlineStats = await offlineStorage.getOfflineStats()
      setStats(prev => ({
        ...prev,
        ...offlineStats
      }))
    } catch (e) {
      console.error('[OfflineSync] Failed to refresh stats:', e)
    }
  }, [])

  // Initialize and listen for sync events
  useEffect(() => {
    const init = async () => {
      try {
        await offlineStorage.initOfflineDB()
        await refreshStats()
      } catch (e) {
        console.error('[OfflineSync] Failed to initialize:', e)
      }
    }
    init()

    // Listen for sync required events from SW
    const handleSyncRequired = () => {
      console.log('[OfflineSync] Sync required event received')
      syncNow()
    }

    window.addEventListener('pwa-sync-required', handleSyncRequired)

    // Listen for online status changes
    const handleOnline = () => {
      console.log('[OfflineSync] Back online, triggering sync')
      syncNow()
    }

    window.addEventListener('online', handleOnline)

    return () => {
      window.removeEventListener('pwa-sync-required', handleSyncRequired)
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  // Sync when coming back online
  useEffect(() => {
    if (isOnline) {
      syncNow()
    }
  }, [isOnline])

  // Perform sync
  const syncNow = useCallback(async () => {
    if (!isOnline) {
      console.log('[OfflineSync] Offline, skipping sync')
      return
    }

    setStats(prev => ({ ...prev, isSyncing: true, syncError: null }))

    try {
      // Get all unsynced dreams
      const unsyncedDreams = await offlineStorage.getUnsyncedDreams()
      console.log(`[OfflineSync] Found ${unsyncedDreams.length} unsynced dreams`)

      // Get sync queue
      const syncQueue = await offlineStorage.getSyncQueue()
      console.log(`[OfflineSync] Sync queue has ${syncQueue.length} items`)

      // Process sync queue
      for (const item of syncQueue) {
        try {
          await processSyncItem(item)
        } catch (e) {
          console.error('[OfflineSync] Failed to sync item:', e)
        }
      }

      setStats(prev => ({
        ...prev,
        isSyncing: false,
        lastSyncTime: new Date().toISOString(),
        syncError: null
      }))

      // Refresh stats
      await refreshStats()
    } catch (e: any) {
      console.error('[OfflineSync] Sync failed:', e)
      setStats(prev => ({
        ...prev,
        isSyncing: false,
        syncError: e.message || '同步失败'
      }))
    }
  }, [isOnline, refreshStats])

  // Process a single sync item
  const processSyncItem = async (item: any): Promise<void> => {
    console.log('[OfflineSync] Processing:', item.type, item.action, item.entityId)

    // In a real implementation, this would call the API
    // For now, we'll simulate successful sync
    switch (item.type) {
      case 'dream':
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500))
        await offlineStorage.markDreamSynced(item.entityId)
        break
      case 'session':
        // Handle session sync
        break
      default:
        console.warn('[OfflineSync] Unknown sync item type:', item.type)
    }
  }

  // Save dream with offline support
  const saveDreamOffline = useCallback(async (
    content: string,
    createdAt: string = new Date().toISOString()
  ): Promise<string> => {
    const localId = `local_${crypto.randomUUID()}`

    await offlineStorage.saveDreamOffline({
      localId,
      content,
      createdAt,
      updatedAt: createdAt
    })

    await refreshStats()

    // Trigger background sync if online
    if (isOnline && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SYNC_TRIGGER'
      })
    }

    return localId
  }, [isOnline, refreshStats])

  // Delete dream
  const deleteDreamOffline = useCallback(async (localId: string): Promise<void> => {
    await offlineStorage.deleteDreamOffline(localId)
    await refreshStats()
  }, [refreshStats])

  return {
    stats,
    syncNow,
    saveDreamOffline,
    deleteDreamOffline,
    refreshStats
  }
}
