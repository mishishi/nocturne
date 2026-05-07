import { prisma } from '../config/database.js'
import { authService } from '../services/authService.js'
import { authMiddleware } from '../middleware/auth.js'
import { successResponse, errorResponse } from '../config/response.js'

// VAPID keys - in production, use environment variables
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U'

export default async function pushRoutes(fastify) {
  // POST /api/push/subscribe - 订阅推送通知 (需登录)
  fastify.post('/push/subscribe', {
    preHandler: async (req, res) => {
      await authMiddleware(req, res)
    }
  }, async (req, res) => {
    try {
      const { endpoint, keys } = req.body

      if (!endpoint || !keys?.p256dh || !keys?.auth) {
        return res.status(400).send(errorResponse('缺少订阅信息', 'INVALID_SUBSCRIPTION'))
      }

      // Get authenticated user
      const tokenUser = await authService.getUser(req.userId)
      if (!tokenUser) {
        return res.status(401).send(errorResponse('用户未找到', 'USER_NOT_FOUND'))
      }

      // Upsert subscription (update if exists, create if not)
      await prisma.pushSubscription.upsert({
        where: { endpoint },
        update: {
          openid: tokenUser.openid,
          p256dh: keys.p256dh,
          auth: keys.auth,
        },
        create: {
          openid: tokenUser.openid,
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
        }
      })

      return res.send(successResponse({ message: '订阅成功' }))
    } catch (error) {
      console.error('[Push] Subscribe error:', error)
      return res.status(500).send(errorResponse('服务器错误', 'SERVER_ERROR'))
    }
  })

  // POST /api/push/unsubscribe - 取消订阅 (需登录)
  fastify.post('/push/unsubscribe', {
    preHandler: async (req, res) => {
      await authMiddleware(req, res)
    }
  }, async (req, res) => {
    try {
      const { endpoint } = req.body

      if (!endpoint) {
        return res.status(400).send(errorResponse('缺少端点信息', 'MISSING_ENDPOINT'))
      }

      // Get authenticated user
      const tokenUser = await authService.getUser(req.userId)
      if (!tokenUser) {
        return res.status(401).send(errorResponse('用户未找到', 'USER_NOT_FOUND'))
      }

      // Delete subscription
      await prisma.pushSubscription.deleteMany({
        where: {
          endpoint,
          openid: tokenUser.openid
        }
      })

      return res.send(successResponse({ message: '取消订阅成功' }))
    } catch (error) {
      console.error('[Push] Unsubscribe error:', error)
      return res.status(500).send(errorResponse('服务器错误', 'SERVER_ERROR'))
    }
  })

  // POST /api/push/test - 发送测试通知 (需登录)
  fastify.post('/push/test', {
    preHandler: async (req, res) => {
      await authMiddleware(req, res)
    }
  }, async (req, res) => {
    try {
      // Get authenticated user
      const tokenUser = await authService.getUser(req.userId)
      if (!tokenUser) {
        return res.status(401).send(errorResponse('用户未找到', 'USER_NOT_FOUND'))
      }

      // Get user's subscription
      const subscription = await prisma.pushSubscription.findFirst({
        where: { openid: tokenUser.openid }
      })

      if (!subscription) {
        return res.status(404).send(errorResponse('未找到订阅', 'SUBSCRIPTION_NOT_FOUND'))
      }

      // In a real implementation, you would send a push notification here
      // using web-push library with the VAPID keys
      // For now, we just return success
      console.log('[Push] Would send test notification to:', subscription.endpoint)

      return res.send(successResponse({ message: '测试通知已发送' }))
    } catch (error) {
      console.error('[Push] Test error:', error)
      return res.status(500).send(errorResponse('服务器错误', 'SERVER_ERROR'))
    }
  })

  // GET /api/push/status - 获取订阅状态 (需登录)
  fastify.get('/push/status', {
    preHandler: async (req, res) => {
      await authMiddleware(req, res)
    }
  }, async (req, res) => {
    try {
      // Get authenticated user
      const tokenUser = await authService.getUser(req.userId)
      if (!tokenUser) {
        return res.status(401).send(errorResponse('用户未找到', 'USER_NOT_FOUND'))
      }

      const subscription = await prisma.pushSubscription.findFirst({
        where: { openid: tokenUser.openid }
      })

      return res.send(successResponse({
        subscribed: !!subscription,
        endpoint: subscription?.endpoint
      }))
    } catch (error) {
      console.error('[Push] Status error:', error)
      return res.status(500).send(errorResponse('服务器错误', 'SERVER_ERROR'))
    }
  })
}
