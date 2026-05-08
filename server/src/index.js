import Fastify from 'fastify'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import fastifyCookie from '@fastify/cookie'
import * as Sentry from '@sentry/node'
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
import libraryRoutes from './routes/library.js'
import pushRoutes from './routes/push.js'
import featureFlagRoutes from './routes/featureFlags.js'

// Initialize Sentry for error monitoring
// Only enable if SENTRY_DSN is configured
let sentryEnabled = false
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.1,
  })
  sentryEnabled = true
}

import logger from './utils/logger.js'

const fastify = Fastify({ logger })

// Register plugins
await fastify.register(cors, { origin: true })
await fastify.register(fastifyCookie, {
  parseOptions: {}
})
await fastify.register(rateLimit, {
  max: 200,
  timeWindow: '1 minute',
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise fall back to IP
    const userId = req.userId
    if (userId) {
      return `user:${userId}`
    }
    return `ip:${req.ip || 'unknown'}`
  },
  errorResponseBuilder: (req, context) => ({
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: `请求过于频繁，请 ${Math.ceil(context.ttl / 1000)} 秒后再试`
    }
  }),
  addHeadersOnExceeding: {
    'x-ratelimit-limit': true,
    'x-ratelimit-remaining': true,
    'x-ratelimit-reset': true
  },
  addHeaders: {
    'x-ratelimit-limit': true,
    'x-ratelimit-remaining': true,
    'x-ratelimit-reset': true,
    'retry-after': true
  }
})

// Auto-wrap responses without timestamp (兜底措施)
fastify.addHook('onSend', async (req, res, payload) => {
  if (typeof payload === 'object' && payload !== null && 'success' in payload && !('timestamp' in payload)) {
    return successResponse(payload)
  }
  return payload
})

// Request duration tracking
fastify.addHook('onRequest', async (req) => {
  req.startTime = Date.now()
})

fastify.addHook('onResponse', async (req, res) => {
  const duration = Date.now() - (req.startTime || Date.now())
  const slowThreshold = parseInt(process.env.SLOW_REQUEST_THRESHOLD || '1000', 10)

  const logData = {
    action: 'request',
    method: req.method,
    url: req.url.split('?')[0], // 去掉 query string
    status: res.statusCode,
    duration,
    ip: req.ip
  }

  if (duration > slowThreshold) {
    // 慢请求记录 warn 级别
    logger.warn(logData, `Slow request: ${req.method} ${req.url} - ${duration}ms`)
  } else {
    // 正常请求记录 info 级别
    logger.info(logData)
  }
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
fastify.register(libraryRoutes, { prefix: '/api' })
fastify.register(pushRoutes, { prefix: '/api' })
fastify.register(featureFlagRoutes, { prefix: '/api' })

// Error handler
fastify.setErrorHandler((err, req, res) => {
  fastify.log.error(err)

  // Capture error with Sentry if configured
  if (sentryEnabled) {
    Sentry.captureException(err, {
      extra: {
        url: req.url,
        method: req.method,
      },
    })
  }

  res.status(500).send({ error: err.message || 'Internal server error' })
})

const start = async () => {
  try {
    await connectDB()
    await fastify.listen({ port: process.env.PORT || 4000 })
    logger.info({ action: 'server-start', port: process.env.PORT || 4000 }, `Server running on port ${process.env.PORT || 4000}`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()
