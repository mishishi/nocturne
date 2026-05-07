/**
 * Service Worker for Nocturne
 * Full offline support with intelligent caching strategies
 */

const CACHE_NAME = 'nocturne-v2'

// Reminder state
let reminderTimeout = null
let reminderConfig = {
  enabled: false,
  time: '22:00'
}

// Essential assets to cache immediately on install (App Shell)
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
]

// Install event - precache essential assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...')
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Precaching essential assets')
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[SW] Precache failed, will retry later:', err)
      })
    })
  )
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...')
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name)
            return caches.delete(name)
          })
      )
    }).then(() => {
      console.log('[SW] Claiming clients')
      self.clients.claim()
    })
  )
})

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') return

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) return

  // Skip WebSocket connections
  if (url.protocol === 'ws:' || url.protocol === 'wss:') return

  // Determine caching strategy based on request type
  if (isApiRequest(url)) {
    // API requests: Network First, fallback to cache
    event.respondWith(networkFirstWithCacheFallback(request))
  } else if (isStaticAsset(url)) {
    // Static assets: Cache First, fallback to network
    event.respondWith(cacheFirstWithNetworkFallback(request))
  } else if (isDocumentRequest(request)) {
    // HTML pages: Network First with soft cache
    event.respondWith(networkFirstWithCacheFallback(request))
  } else {
    // Default: Network First
    event.respondWith(networkFirstWithCacheFallback(request))
  }
})

// Check if request is an API call
function isApiRequest(url) {
  return url.pathname.startsWith('/api/') ||
         url.hostname === 'api.nocturne.app' ||
         url.pathname.includes('.json')
}

// Check if request is for static assets
function isStaticAsset(url) {
  const staticExtensions = ['.js', '.css', '.woff', '.woff2', '.ttf', '.otf', '.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.webmanifest']
  return staticExtensions.some(ext => url.pathname.endsWith(ext)) ||
         url.pathname.startsWith('/icons/') ||
         url.pathname.startsWith('/fonts/')
}

// Check if request is for HTML documents
function isDocumentRequest(request) {
  return request.headers.get('accept')?.includes('text/html') ||
         request.destination === 'document'
}

// Network First - Try network, fallback to cache
async function networkFirstWithCacheFallback(request) {
  const cache = await caches.open(CACHE_NAME)

  try {
    const networkResponse = await fetch(request)

    // Only cache successful responses
    if (networkResponse.ok) {
      // Clone response before caching (stream can only be consumed once)
      cache.put(request, networkResponse.clone())
    }

    return networkResponse
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url)

    const cachedResponse = await cache.match(request)
    if (cachedResponse) {
      console.log('[SW] Cache hit:', request.url)
      return cachedResponse
    }

    // Return offline page for navigation requests
    if (request.destination === 'document') {
      const offlinePage = await cache.match('/')
      if (offlinePage) return offlinePage
    }

    // Return a basic offline response for API requests
    if (isApiRequest(new URL(request.url))) {
      return new Response(JSON.stringify({
        success: false,
        error: 'offline',
        message: '当前处于离线状态'
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    throw error
  }
}

// Cache First - Try cache, fallback to network
async function cacheFirstWithNetworkFallback(request) {
  const cache = await caches.open(CACHE_NAME)

  const cachedResponse = await cache.match(request)
  if (cachedResponse) {
    // Return cached response immediately, update cache in background
    fetchAndCache(request)
    return cachedResponse
  }

  // No cache, fetch from network
  try {
    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  } catch (error) {
    console.error('[SW] Cache and network failed for:', request.url)
    throw error
  }
}

// Background cache update
async function fetchAndCache(request) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME)
      await cache.put(request, response)
    }
  } catch (e) {
    // Silently fail background updates
  }
}

// Calculate next reminder time
function getNextReminderTime(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number)
  const now = new Date()
  const reminder = new Date()
  reminder.setHours(hours, minutes, 0, 0)

  if (reminder <= now) {
    reminder.setDate(reminder.getDate() + 1)
  }

  return reminder.getTime()
}

// Schedule daily reminder
function scheduleReminder() {
  if (!reminderConfig.enabled) return

  const nextTime = getNextReminderTime(reminderConfig.time)
  const delay = nextTime - Date.now()

  console.log(`[SW] Scheduling reminder for ${new Date(nextTime).toLocaleString()}, delay: ${delay}ms`)

  if (reminderTimeout) {
    clearTimeout(reminderTimeout)
  }

  reminderTimeout = setTimeout(() => {
    showReminderNotification()
    scheduleReminder()
  }, delay)
}

// Show reminder notification
async function showReminderNotification() {
  console.log('[SW] Showing reminder notification')

  const options = {
    body: '夜棂提醒你记录今天的梦境，不要让美好的梦悄悄溜走~',
    icon: '/icons/icon-192.svg',
    badge: '/icons/icon-192.svg',
    tag: 'dream-reminder',
    vibrate: [100, 50, 100],
    requireInteraction: false,
    data: {
      type: 'reminder',
      url: '/dream'
    },
    actions: [
      {
        action: 'open',
        title: '去记录'
      },
      {
        action: 'dismiss',
        title: '稍后'
      }
    ]
  }

  await self.registration.showNotification('🌙 梦境提醒', options)
}

// Push notification event
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event)

  let data = {
    title: '夜棂',
    body: '你有一条新消息',
    icon: '/icons/icon-192.svg',
    badge: '/icons/icon-192.svg',
    tag: 'nocturne-notification',
    data: {}
  }

  if (event.data) {
    try {
      const payload = event.data.json()
      data = {
        title: payload.title || data.title,
        body: payload.body || data.body,
        icon: payload.icon || data.icon,
        badge: payload.badge || data.badge,
        tag: payload.tag || data.tag,
        data: payload.data || {}
      }
    } catch (e) {
      console.error('[SW] Error parsing push data:', e)
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    data: data.data,
    vibrate: [100, 50, 100],
    requireInteraction: false,
    actions: [
      {
        action: 'open',
        title: '查看'
      },
      {
        action: 'dismiss',
        title: '忽略'
      }
    ]
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event)

  event.notification.close()

  const action = event.action
  const data = event.notification.data

  if (action === 'dismiss') {
    return
  }

  let url = '/'

  if (data.url) {
    url = data.url
  } else if (data.type === 'friend_request') {
    url = '/friends'
  } else if (data.type === 'comment' || data.type === 'like') {
    url = '/wall'
  } else if (data.type === 'reminder') {
    url = '/dream'
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus()
          client.postMessage({
            type: 'NOTIFICATION_CLICK',
            data: data
          })
          return
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url)
      }
    })
  )
})

// Handle messages from the main app
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data)

  if (!event.data) return

  const { type, data } = event.data

  if (type === 'SKIP_WAITING') {
    self.skipWaiting()
  } else if (type === 'SCHEDULE_REMINDER') {
    console.log('[SW] Scheduling reminder:', data)
    reminderConfig = {
      enabled: data.enabled,
      time: data.time || '22:00'
    }
    scheduleReminder()
  } else if (type === 'CANCEL_REMINDER') {
    console.log('[SW] Canceling reminder')
    reminderConfig.enabled = false
    if (reminderTimeout) {
      clearTimeout(reminderTimeout)
      reminderTimeout = null
    }
  } else if (type === 'CACHE_URLS') {
    // Allow app to request specific URLs to be cached
    console.log('[SW] Caching URLs:', data)
    caches.open(CACHE_NAME).then(cache => {
      cache.addAll(data.urls)
    })
  } else if (type === 'GET_VERSION') {
    // Report SW version
    event.source.postMessage({
      type: 'SW_VERSION',
      version: CACHE_NAME
    })
  }
})

// Background Sync support (for offline data submission)
self.addEventListener('sync', (event) => {
  console.log('[SW] Sync event:', event.tag)

  if (event.tag === 'sync-dreams') {
    event.waitUntil(syncOfflineDreams())
  }
})

// Sync offline dreams when back online
async function syncOfflineDreams() {
  // This will be called when the app comes back online
  // The actual sync logic is in the main app, which should have stored
  // pending actions in IndexedDB
  console.log('[SW] Background sync triggered')
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({ type: 'SYNC_REQUIRED' })
    })
  })
}
