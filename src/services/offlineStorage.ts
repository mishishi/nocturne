/**
 * Offline Storage Service using IndexedDB
 * Stores dreams and sessions for offline access and sync
 */

const DB_NAME = 'nocturne-offline'
const DB_VERSION = 1

interface StoredDream {
  id?: number
  localId: string
  content: string
  createdAt: string
  updatedAt: string
  synced: boolean
  syncAttempts: number
  lastSyncError?: string
}

interface StoredSession {
  id?: number
  sessionId: string
  dreamId: string
  messages: any[]
  createdAt: string
  updatedAt: string
  synced: boolean
}

let db: IDBDatabase | null = null

// Initialize the IndexedDB database
export async function initOfflineDB(): Promise<IDBDatabase> {
  if (db) return db

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      console.error('[OfflineDB] Failed to open database:', request.error)
      reject(request.error)
    }

    request.onsuccess = () => {
      db = request.result
      console.log('[OfflineDB] Database opened successfully')
      resolve(db)
    }

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result
      console.log('[OfflineDB] Upgrading database...')

      // Dreams store
      if (!database.objectStoreNames.contains('dreams')) {
        const dreamsStore = database.createObjectStore('dreams', {
          keyPath: 'localId',
          autoIncrement: false
        })
        dreamsStore.createIndex('synced', 'synced', { unique: false })
        dreamsStore.createIndex('createdAt', 'createdAt', { unique: false })
      }

      // Sessions store
      if (!database.objectStoreNames.contains('sessions')) {
        const sessionsStore = database.createObjectStore('sessions', {
          keyPath: 'sessionId',
          autoIncrement: false
        })
        sessionsStore.createIndex('synced', 'synced', { unique: false })
        sessionsStore.createIndex('dreamId', 'dreamId', { unique: false })
      }

      // Pending sync queue
      if (!database.objectStoreNames.contains('syncQueue')) {
        const syncStore = database.createObjectStore('syncQueue', {
          keyPath: 'id',
          autoIncrement: true
        })
        syncStore.createIndex('type', 'type', { unique: false })
        syncStore.createIndex('createdAt', 'createdAt', { unique: false })
      }
    }
  })
}

// Dreams operations
export async function saveDreamOffline(dream: Omit<StoredDream, 'id' | 'synced' | 'syncAttempts'>): Promise<void> {
  const database = await initOfflineDB()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['dreams', 'syncQueue'], 'readwrite')
    const store = transaction.objectStore('dreams')
    const syncStore = transaction.objectStore('syncQueue')

    const storedDream: StoredDream = {
      ...dream,
      synced: false,
      syncAttempts: 0
    }

    const request = store.put(storedDream)

    request.onsuccess = () => {
      // Add to sync queue
      const syncEntry = {
        type: 'dream',
        entityId: dream.localId,
        action: 'create',
        createdAt: new Date().toISOString(),
        data: dream
      }
      syncStore.add(syncEntry)
      console.log('[OfflineDB] Dream saved:', dream.localId)
    }

    request.onerror = () => reject(request.error)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
}

export async function getUnsyncedDreams(): Promise<StoredDream[]> {
  const database = await initOfflineDB()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction('dreams', 'readonly')
    const store = transaction.objectStore('dreams')
    const index = store.index('synced')
    const request = index.getAll(IDBKeyRange.only(false))

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function markDreamSynced(localId: string): Promise<void> {
  const database = await initOfflineDB()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['dreams', 'syncQueue'], 'readwrite')
    const store = transaction.objectStore('dreams')
    const syncStore = transaction.objectStore('syncQueue')

    const getRequest = store.get(localId)

    getRequest.onsuccess = () => {
      const dream = getRequest.result
      if (dream) {
        dream.synced = true
        dream.updatedAt = new Date().toISOString()
        store.put(dream)

        // Remove from sync queue
        const index = syncStore.index('entityId')
        const queueRequest = index.getAllKeys(localId)
        queueRequest.onsuccess = () => {
          queueRequest.result.forEach(key => syncStore.delete(key))
        }
      }
    }

    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
}

export async function updateDreamSyncError(localId: string, error: string): Promise<void> {
  const database = await initOfflineDB()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction('dreams', 'readwrite')
    const store = transaction.objectStore('dreams')

    const getRequest = store.get(localId)

    getRequest.onsuccess = () => {
      const dream = getRequest.result
      if (dream) {
        dream.syncAttempts = (dream.syncAttempts || 0) + 1
        dream.lastSyncError = error
        dream.updatedAt = new Date().toISOString()
        store.put(dream)
      }
    }

    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
}

export async function deleteDreamOffline(localId: string): Promise<void> {
  const database = await initOfflineDB()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['dreams', 'syncQueue'], 'readwrite')
    const store = transaction.objectStore('dreams')

    const request = store.delete(localId)

    request.onsuccess = () => {
      console.log('[OfflineDB] Dream deleted:', localId)
    }

    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
}

export async function getAllOfflineDreams(): Promise<StoredDream[]> {
  const database = await initOfflineDB()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction('dreams', 'readonly')
    const store = transaction.objectStore('dreams')
    const request = store.getAll()

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// Sessions operations
export async function saveSessionOffline(session: Omit<StoredSession, 'id' | 'synced'>): Promise<void> {
  const database = await initOfflineDB()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction('sessions', 'readwrite')
    const store = transaction.objectStore('sessions')

    const storedSession: StoredSession = {
      ...session,
      synced: false
    }

    const request = store.put(storedSession)

    request.onsuccess = () => {
      console.log('[OfflineDB] Session saved:', session.sessionId)
    }

    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
}

export async function getSessionOffline(sessionId: string): Promise<StoredSession | undefined> {
  const database = await initOfflineDB()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction('sessions', 'readonly')
    const store = transaction.objectStore('sessions')
    const request = store.get(sessionId)

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// Sync queue operations
export async function getSyncQueue(): Promise<any[]> {
  const database = await initOfflineDB()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction('syncQueue', 'readonly')
    const store = transaction.objectStore('syncQueue')
    const request = store.getAll()

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function clearSyncQueue(): Promise<void> {
  const database = await initOfflineDB()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction('syncQueue', 'readwrite')
    const store = transaction.objectStore('syncQueue')
    const request = store.clear()

    request.onsuccess = () => {
      console.log('[OfflineDB] Sync queue cleared')
    }

    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
}

// Clear all offline data (for logout)
export async function clearAllOfflineData(): Promise<void> {
  const database = await initOfflineDB()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['dreams', 'sessions', 'syncQueue'], 'readwrite')

    transaction.objectStore('dreams').clear()
    transaction.objectStore('sessions').clear()
    transaction.objectStore('syncQueue').clear()

    transaction.oncomplete = () => {
      console.log('[OfflineDB] All offline data cleared')
      resolve()
    }
    transaction.onerror = () => reject(transaction.error)
  })
}

// Get offline storage stats
export async function getOfflineStats(): Promise<{
  totalDreams: number
  unsyncedDreams: number
  totalSessions: number
  syncQueueLength: number
}> {
  const database = await initOfflineDB()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['dreams', 'sessions', 'syncQueue'], 'readonly')

    const dreamsStore = transaction.objectStore('dreams')
    const sessionsStore = transaction.objectStore('sessions')
    const syncStore = transaction.objectStore('syncQueue')

    let totalDreams = 0
    let unsyncedDreams = 0
    let totalSessions = 0
    let syncQueueLength = 0

    dreamsStore.count().onsuccess = () => {
      totalDreams = dreamsStore.count().result
      const index = dreamsStore.index('synced')
      index.count(IDBKeyRange.only(false)).onsuccess = () => {
        unsyncedDreams = index.count(IDBKeyRange.only(false)).result
      }
    }

    sessionsStore.count().onsuccess = () => {
      totalSessions = sessionsStore.count().result
    }

    syncStore.count().onsuccess = () => {
      syncQueueLength = syncStore.count().result
    }

    transaction.oncomplete = () => {
      resolve({ totalDreams, unsyncedDreams, totalSessions, syncQueueLength })
    }
    transaction.onerror = () => reject(transaction.error)
  })
}
