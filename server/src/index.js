import Fastify from 'fastify'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import { connectDB } from './config/database.js'
import { successResponse } from './config/response.js'
import sessionRoutes from './routes/sessions.js'
import shareRoutes from './routes/share.js'
import authRoutes from './routes/auth.js'
import friendRoutes from './routes/friends.js'
import dreamWallRoutes from './routes/dreamWall.js'
import storyFeedbackRoutes from './routes/storyFeedback.js'
import notificationRoutes from './routes/notifications.js'
import messageRoutes from './routes/messages.js'
import checkInRoutes from './routes/checkIn.js'
import achievementRoutes from './routes/achievements.js'
import adminRoutes from './routes/admin.js'

const fastify = Fastify({ logger: true })

// Register plugins
await fastify.register(cors, { origin: true })
await fastify.register(rateLimit, {
  max: 999999,
  timeWindow: '1 minute',
  keyGenerator: (req) => req.ip || 'unknown',
  errorResponseBuilder: (req, context) => ({
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: `请求过于频繁，请 ${Math.ceil(context.ttl / 1000)} 秒后再试`
    }
  })
})

// Auto-wrap responses without timestamp (兜底措施)
fastify.addHook('onSend', async (req, res, payload) => {
  if (typeof payload === 'object' && payload !== null && 'success' in payload && !('timestamp' in payload)) {
    return successResponse(payload)
  }
  return payload
})

// Register routes
fastify.register(sessionRoutes, { prefix: '/api' })
fastify.register(shareRoutes, { prefix: '/api' })
fastify.register(authRoutes, { prefix: '/api' })
fastify.register(friendRoutes, { prefix: '/api' })
fastify.register(dreamWallRoutes, { prefix: '/api' })
fastify.register(storyFeedbackRoutes, { prefix: '/api' })
fastify.register(notificationRoutes, { prefix: '/api' })
fastify.register(messageRoutes, { prefix: '/api' })
fastify.register(checkInRoutes, { prefix: '/api' })
fastify.register(achievementRoutes, { prefix: '/api' })
fastify.register(adminRoutes, { prefix: '/api' })

// Error handler
fastify.setErrorHandler((err, req, res) => {
  fastify.log.error(err)
  res.status(500).send({ error: err.message || 'Internal server error' })
})

const start = async () => {
  try {
    await connectDB()
    await fastify.listen({ port: process.env.PORT || 4000 })
    console.log(`Server running on port ${process.env.PORT || 4000}`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()
