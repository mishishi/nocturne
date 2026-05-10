/**
 * Notification Service
 * 统一的通知创建服务，解决 createNotification 重复定义问题
 */

import { sendPushNotification } from './pushService.js'

// 通知类型到标题的映射
const NOTIFICATION_TITLES = {
  friend_request: '新的好友请求',
  friend_accept: '好友申请已通过',
  like: '收到点赞',
  comment: '收到评论'
}

// 通知类型到目标 URL 的映射
const NOTIFICATION_URLS = {
  friend_request: '/friends',
  friend_accept: '/friends',
  like: '/story/',
  comment: '/story/'
}

/**
 * 创建通知（fire-and-forget 模式）
 * @param {object} prisma - Prisma client instance
 * @param {object} params - 通知参数
 * @param {string} params.openid - 接收通知的用户 openid
 * @param {string} params.type - 通知类型
 * @param {string} params.fromOpenid - 触发通知的用户 openid
 * @param {string} params.fromNickname - 触发通知的用户昵称
 * @param {string|null} params.targetId - 目标 ID（如帖子 ID）
 * @param {string|null} params.targetTitle - 目标标题
 * @param {string} params.message - 通知消息内容
 */
async function createNotification(prisma, { openid, type, fromOpenid, fromNickname, targetId, targetTitle, message }) {
  // Skip self-notification
  if (openid === fromOpenid) return null

  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  // Create DB record
  const notification = await prisma.notification.create({
    data: {
      openid,
      type,
      fromOpenid,
      fromNickname,
      targetId,
      targetTitle,
      message,
      expiresAt
    }
  })

  // Send push notification (fire-and-forget, don't await)
  const title = NOTIFICATION_TITLES[type] || '新通知'
  const url = (NOTIFICATION_URLS[type] || '/notifications') + (targetId || '')

  sendPushNotification(prisma, {
    openid,
    title,
    body: message,
    data: { url, notificationId: notification.id }
  }).catch(err => {
    console.error('[NotificationService] Push notification failed:', err.message)
  })

  return notification
}

export { createNotification }
