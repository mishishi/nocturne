/**
 * Notification Service
 * 统一的通知创建服务，解决 createNotification 重复定义问题
 */

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

  return prisma.notification.create({
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
}

export { createNotification }
