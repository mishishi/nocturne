import { featureFlagService } from '../services/featureFlagService.js'
import { adminMiddleware } from '../middleware/adminAuth.js'
import { successResponse, errorResponse } from '../config/response.js'

/**
 * 特性开关路由
 */
async function featureFlagRoutes(fastify, options) {
  // 获取所有特性开关（公开接口）
  fastify.get('/config/feature-flags', {
    schema: {
      description: '获取所有特性开关',
      tags: ['config'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  key: { type: 'string' },
                  enabled: { type: 'boolean' },
                  rolloutPercent: { type: ['integer', 'null'] },
                  description: { type: ['string', 'null'] }
                }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const flags = await featureFlagService.getAllFlags()
      return successResponse(flags)
    } catch (e) {
      console.error('[FeatureFlags] Failed to get flags:', e)
      return reply.status(500).send(errorResponse('获取特性开关失败', 'SERVER_ERROR'))
    }
  })

  // 检查单个特性开关状态（支持灰度）
  fastify.get('/config/feature-flags/:key', {
    schema: {
      description: '检查特性开关状态',
      tags: ['config'],
      params: {
        type: 'object',
        properties: {
          key: { type: 'string' }
        },
        required: ['key']
      }
    }
  }, async (request, reply) => {
    try {
      const { key } = request.params
      const userId = request.userId || null // 从 auth 中间件获取

      const enabled = await featureFlagService.isEnabled(key, userId)
      return successResponse({ key, enabled })
    } catch (e) {
      console.error('[FeatureFlags] Failed to check flag:', e)
      return reply.status(500).send(errorResponse('检查特性开关失败', 'SERVER_ERROR'))
    }
  })

  // 管理员：创建或更新特性开关
  fastify.post('/admin/feature-flags', {
    preHandler: async (req, res) => {
      await adminMiddleware(req, res)
    },
    schema: {
      description: '创建或更新特性开关（管理员）',
      tags: ['admin'],
      body: {
        type: 'object',
        properties: {
          key: { type: 'string' },
          enabled: { type: 'boolean' },
          rolloutPercent: { type: ['integer', 'null'] },
          description: { type: ['string', 'null'] }
        },
        required: ['key', 'enabled']
      }
    }
  }, async (request, reply) => {
    try {
      const { key, enabled, rolloutPercent, description } = request.body
      const flag = await featureFlagService.upsertFlag(key, enabled, rolloutPercent, description)
      return successResponse(flag)
    } catch (e) {
      console.error('[FeatureFlags] Failed to upsert flag:', e)
      return reply.status(500).send(errorResponse('更新特性开关失败', 'SERVER_ERROR'))
    }
  })

  // 管理员：删除特性开关
  fastify.delete('/admin/feature-flags/:key', {
    preHandler: async (req, res) => {
      await adminMiddleware(req, res)
    },
    schema: {
      description: '删除特性开关（管理员）',
      tags: ['admin'],
      params: {
        type: 'object',
        properties: {
          key: { type: 'string' }
        },
        required: ['key']
      }
    }
  }, async (request, reply) => {
    try {
      const { key } = request.params
      await featureFlagService.deleteFlag(key)
      return successResponse({ deleted: true })
    } catch (e) {
      console.error('[FeatureFlags] Failed to delete flag:', e)
      return reply.status(500).send(errorResponse('删除特性开关失败', 'SERVER_ERROR'))
    }
  })
}

export default featureFlagRoutes
