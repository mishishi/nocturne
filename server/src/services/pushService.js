import webpush from 'web-push'
import { prisma } from '../config/database.js'

// VAPID keys - must be configured in environment variables in production
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || ''
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || ''
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@yeelin.app'

// Configure web-push if VAPID keys are available
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
}

/**
 * Send a push notification to a single subscriber
 * @param {object} prisma - Prisma client instance
 * @param {object} params - Notification parameters
 * @param {string} params.openid - Target user's openid
 * @param {string} params.title - Notification title
 * @param {string} params.body - Notification body
 * @param {string} [params.data] - Additional data to include in push
 * @returns {Promise<boolean>} - True if sent successfully
 */
async function sendPushNotification(prisma, { openid, title, body, data }) {
  const subscription = await prisma.pushSubscription.findFirst({
    where: { openid }
  })

  if (!subscription) {
    console.log(`[PushService] No subscription found for openid: ${openid}`)
    return false
  }

  const pushPayload = JSON.stringify({
    title,
    body,
    icon: '/icons/icon-192.svg',
    badge: '/icons/icon-96.png',
    data: {
      url: data?.url || '/notifications',
      ...data
    }
  })

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth
        }
      },
      pushPayload
    )
    console.log(`[PushService] Notification sent to ${openid}`)
    return true
  } catch (error) {
    console.error(`[PushService] Failed to send notification to ${openid}:`, error.message)

    // Handle invalid subscriptions (410 Gone or 404 Not Found)
    if (error.statusCode === 410 || error.statusCode === 404) {
      console.log(`[PushService] Removing invalid subscription for ${openid}`)
      await prisma.pushSubscription.deleteMany({
        where: { openid }
      })
    }

    return false
  }
}

/**
 * Send push notifications to multiple subscribers
 * @param {object} prisma - Prisma client instance
 * @param {string[]} openids - Array of target user openids
 * @param {object} notification - Notification content
 * @param {string} notification.title - Notification title
 * @param {string} notification.body - Notification body
 * @param {object} [notification.data] - Additional data
 * @returns {Promise<{sent: number, failed: number}>}
 */
async function sendPushNotificationToMany(prisma, openids, notification) {
  const results = await Promise.allSettled(
    openids.map(openid =>
      sendPushNotification(prisma, { openid, ...notification })
    )
  )

  let sent = 0
  let failed = 0

  results.forEach(result => {
    if (result.status === 'fulfilled' && result.value) {
      sent++
    } else {
      failed++
    }
  })

  return { sent, failed }
}

/**
 * Generate VAPID keys (run once in production)
 * @returns {object} - { publicKey, privateKey }
 */
function generateVapidKeys() {
  const keys = webpush.generateVAPIDKeys()
  return {
    publicKey: keys.publicKey,
    privateKey: keys.privateKey
  }
}

export { sendPushNotification, sendPushNotificationToMany, generateVapidKeys }
