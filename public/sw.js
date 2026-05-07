/**
 * Service Worker for Nocturne Push Notifications
 * Handles push notification display and click actions
 */

const CACHE_NAME = 'nocturne-v1'

// Reminder state
let reminderTimeout = null
let reminderConfig = {
  enabled: false,
  time: '22:00'
}

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...')
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
          .map((name) => caches.delete(name))
      )
    })
  )
  self.clients.claim()
})

// Calculate next reminder time
function getNextReminderTime(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number)
  const now = new Date()
  const reminder = new Date()
  reminder.setHours(hours, minutes, 0, 0)

  // If time has passed today, schedule for tomorrow
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

  // Clear existing timeout
  if (reminderTimeout) {
    clearTimeout(reminderTimeout)
  }

  reminderTimeout = setTimeout(() => {
    showReminderNotification()
    // Reschedule for next day
    scheduleReminder()
  }, delay)
}

// Show reminder notification
async function showReminderNotification() {
  console.log('[SW] Showing reminder notification')

  const options = {
    body: '夜棂提醒你记录今天的梦境，不要让美好的梦悄悄溜走~',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
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
    icon: '/favicon.svg',
    badge: '/favicon.svg',
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

  // Default action or 'open' action - navigate to the appropriate page
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
      // Try to focus an existing window
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
      // Open a new window if none exists
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
  }
})
