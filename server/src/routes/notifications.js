import { prisma } from '../config/database.js'
import { authService } from '../services/authService.js'
import { authMiddleware } from '../middleware/auth.js'

export default async function notificationRoutes(fastify) {
  // GET /api/notifications - 获取通知列表 (需登录)
  fastify.get('/notifications', {
    preHandler: async (req, res) => {
      await authMiddleware(req, res)
    }
  }, async (req, res) => {
    try {
      const { page = 1, limit = 20 } = req.query
      const pageNum = parseInt(page)
      const limitNum = parseInt(limit)

      // Get authenticated user
      const tokenUser = await authService.getUser(req.userId)
      if (!tokenUser) {
        return res.status(401).send({ success: false, reason: '用户未找到' })
      }

      // Calculate date 30 days ago
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      // Query notifications where openid = current user AND createdAt > 30 days ago
      const skip = (pageNum - 1) * limitNum
      const notifications = await prisma.notification.findMany({
        where: {
          openid: tokenUser.openid,
          createdAt: { gte: thirtyDaysAgo }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum
      })

      const total = await prisma.notification.count({
        where: {
          openid: tokenUser.openid,
          createdAt: { gte: thirtyDaysAgo }
        }
      })

      // Get user's lastViewedNotificationsAt
      const user = await prisma.user.findUnique({
        where: { openid: tokenUser.openid },
        select: { lastViewedNotificationsAt: true }
      })

      // Count notifications where createdAt > lastViewedNotificationsAt
      const unreadCount = await prisma.notification.count({
        where: {
          openid: tokenUser.openid,
          createdAt: {
            gte: thirtyDaysAgo,
            ...(user.lastViewedNotificationsAt ? { gt: user.lastViewedNotificationsAt } : {})
          }
        }
      })

      return res.status(200).send({
        success: true,
        notifications: notifications.map(n => ({
          id: n.id,
          type: n.type,
          fromOpenid: n.fromOpenid,
          fromNickname: n.fromNickname,
          targetId: n.targetId,
          targetTitle: n.targetTitle,
          message: n.message,
          isRead: n.isRead,
          createdAt: n.createdAt
        })),
        unreadCount,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          hasMore: skip + notifications.length < total
        }
      })
    } catch (error) {
      return res.status(500).send({ success: false, reason: '服务器错误' })
    }
  })

  // GET /api/notifications/unread-count - 获取未读数 (需登录)
  fastify.get('/notifications/unread-count', {
    preHandler: async (req, res) => {
      await authMiddleware(req, res)
    }
  }, async (req, res) => {
    try {
      // Get authenticated user
      const tokenUser = await authService.getUser(req.userId)
      if (!tokenUser) {
        return res.status(401).send({ success: false, reason: '用户未找到' })
      }

      // Calculate date 30 days ago
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      // Get user's lastViewedNotificationsAt
      const user = await prisma.user.findUnique({
        where: { openid: tokenUser.openid },
        select: { lastViewedNotificationsAt: true }
      })

      // Count notifications where createdAt > lastViewedNotificationsAt
      const unreadCount = await prisma.notification.count({
        where: {
          openid: tokenUser.openid,
          createdAt: {
            gte: thirtyDaysAgo,
            ...(user.lastViewedNotificationsAt ? { gt: user.lastViewedNotificationsAt } : {})
          }
        }
      })

      return res.status(200).send({
        success: true,
        unreadCount
      })
    } catch (error) {
      return res.status(500).send({ success: false, reason: '服务器错误' })
    }
  })

  // POST /api/notifications/mark-read - 全部已读 (需登录)
  fastify.post('/notifications/mark-read', {
    preHandler: async (req, res) => {
      await authMiddleware(req, res)
    }
  }, async (req, res) => {
    try {
      // Get authenticated user
      const tokenUser = await authService.getUser(req.userId)
      if (!tokenUser) {
        return res.status(401).send({ success: false, reason: '用户未找到' })
      }

      // Update User.lastViewedNotificationsAt = now()
      await prisma.user.update({
        where: { id: tokenUser.id },
        data: { lastViewedNotificationsAt: new Date() }
      })

      return res.status(200).send({
        success: true
      })
    } catch (error) {
      return res.status(500).send({ success: false, reason: '服务器错误' })
    }
  })

  // POST /api/notifications/:notificationId/read - 单条已读 (需登录)
  fastify.post('/notifications/:notificationId/read', {
    preHandler: async (req, res) => {
      await authMiddleware(req, res)
    }
  }, async (req, res) => {
    try {
      const { notificationId } = req.params

      // Get authenticated user
      const tokenUser = await authService.getUser(req.userId)
      if (!tokenUser) {
        return res.status(401).send({ success: false, reason: '用户未找到' })
      }

      // Find notification
      const notification = await prisma.notification.findFirst({
        where: {
          id: notificationId,
          openid: tokenUser.openid
        }
      })

      if (!notification) {
        return res.status(404).send({ success: false, reason: '通知不存在' })
      }

      // Mark as read
      await prisma.notification.update({
        where: { id: notificationId },
        data: { isRead: true }
      })

      return res.status(200).send({
        success: true
      })
    } catch (error) {
      return res.status(500).send({ success: false, reason: '服务器错误' })
    }
  })
}
