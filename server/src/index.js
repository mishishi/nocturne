import Fastify from 'fastify'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import fastifyCookie from '@fastify/cookie'
import * as Sentry from '@sentry/node'
import { connectDB } from './config/database.js'
import { successResponse, errorResponse } from './config/response.js'
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
import metricsRoutes from './routes/metrics.js'
import activityRoutes from './routes/activities.js'
import { recordMetric } from './services/metricsService.js'
import { startCleanupScheduler } from './services/cleanupService.js'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'

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

const fastify = Fastify({
  logger,
  genReqId: (req) => req.headers['x-request-id'] || crypto.randomUUID()
})

// Register plugins
await fastify.register(cors, {
  origin: process.env.FRONTEND_URL || 'http://localhost:4001',
  credentials: true
})
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

// Register Swagger for API documentation
await fastify.register(swagger, {
  openapi: {
    info: {
      title: '夜棂 (Nocturne) API',
      description: 'AI 梦境分享应用后端 API 文档',
      version: '1.0.0'
    },
    servers: [
      {
        url: 'http://localhost:4000',
        description: '本地开发服务器'
      },
      {
        url: process.env.FRONTEND_URL?.replace('/$', '') || 'https://api.nocturne.app',
        description: '生产服务器'
      }
    ],
    tags: [
      { name: 'auth', description: '认证相关接口' },
      { name: 'sessions', description: '梦境会话接口' },
      { name: 'wall', description: '梦墙接口' },
      { name: 'friends', description: '好友关系接口' },
      { name: 'messages', description: '私信接口' },
      { name: 'share', description: '分享积分接口' },
      { name: 'achievements', description: '成就接口' },
      { name: 'notifications', description: '通知接口' },
      { name: 'checkin', description: '签到接口' },
      { name: 'admin', description: '管理接口' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  }
})

await fastify.register(swaggerUi, {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: true
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
  // Log endpoint path only (strip query string to avoid logging sensitive data)
  const endpoint = req.url.split('?')[0]
  req.log.info({ requestId: req.id }, `--> ${req.method} ${endpoint}`)
})

// Add request ID to response headers
fastify.addHook('onSend', async (req, res, payload) => {
  res.header('x-request-id', req.id)
  return payload
})

// Mask IP for logging (keep last octet for debugging, mask rest)
function maskIp(ip) {
  if (!ip) return 'unknown'
  // IPv4: mask first 3 octets (e.g., 192.168.1.xxx)
  const parts = ip.split('.')
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`
  }
  // IPv6: mask first 4 groups
  const hexParts = ip.split(':')
  if (hexParts.length >= 4) {
    return `${hexParts[0]}:${hexParts[1]}:${hexParts[2]}:${hexParts[3]}:xxxx:xxxx:xxxx:xxxx`
  }
  return 'masked'
}

fastify.addHook('onResponse', async (req, res) => {
  const duration = Date.now() - (req.startTime || Date.now())
  const slowThreshold = parseInt(process.env.SLOW_REQUEST_THRESHOLD || '1000', 10)
  const endpoint = req.url.split('?')[0] // 去掉 query string

  const logData = {
    action: 'request',
    requestId: req.id,
    method: req.method,
    url: endpoint,
    status: res.statusCode,
    duration,
    ip: maskIp(req.ip)
  }

  // 记录到数据库（异步，不阻塞响应）
  recordMetric({
    endpoint,
    method: req.method,
    duration,
    status: res.statusCode
  }).catch(() => {}) // 忽略写入错误

  if (duration > slowThreshold) {
    // 慢请求记录 warn 级别
    req.log.warn({ requestId: req.id }, `Slow request: ${req.method} ${endpoint} - ${duration}ms`)
  } else {
    // 正常请求记录 info 级别
    req.log.info({ requestId: req.id }, `<-- ${req.method} ${endpoint} ${res.statusCode} ${duration}ms`)
  }
})

// Register routes (API v1)
fastify.register(sessionRoutes, { prefix: '/api/v1' })
fastify.register(shareRoutes, { prefix: '/api/v1' })
fastify.register(authRoutes, { prefix: '/api/v1' })
fastify.register(friendRoutes, { prefix: '/api/v1' })
fastify.register(dreamWallRoutes, { prefix: '/api/v1' })
fastify.register(storyFeedbackRoutes, { prefix: '/api/v1' })
fastify.register(notificationRoutes, { prefix: '/api/v1' })
fastify.register(messageRoutes, { prefix: '/api/v1' })
fastify.register(checkInRoutes, { prefix: '/api/v1' })
fastify.register(achievementRoutes, { prefix: '/api/v1' })
fastify.register(adminRoutes, { prefix: '/api/v1' })
fastify.register(libraryRoutes, { prefix: '/api/v1' })
fastify.register(pushRoutes, { prefix: '/api/v1' })
fastify.register(featureFlagRoutes, { prefix: '/api/v1' })
fastify.register(metricsRoutes, { prefix: '/api/v1' })
fastify.register(activityRoutes, { prefix: '/api/v1' })

// Health check endpoints
fastify.get('/health', async () => {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.APP_VERSION || '1.0.0'
  }
})

fastify.get('/ready', async (req, res) => {
  try {
    // Check database connection
    const { prisma } = await import('./config/database.js')
    await prisma.$queryRaw`SELECT 1`

    return {
      ready: true,
      timestamp: new Date().toISOString(),
      dependencies: {
        database: 'ok'
      }
    }
  } catch (error) {
    res.status(503)
    return {
      ready: false,
      timestamp: new Date().toISOString(),
      dependencies: {
        database: 'error'
      },
      error: error.message
    }
  }
})

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

  res.status(500).send(errorResponse(err.message || 'Internal server error', 'SERVER_ERROR'))
})

const start = async () => {
  try {
    await connectDB()
    // 启动数据清理定时任务
    startCleanupScheduler()
    await fastify.listen({ port: process.env.PORT || 4000 })
    logger.info({ action: 'server-start', port: process.env.PORT || 4000 }, `Server running on port ${process.env.PORT || 4000}`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()
