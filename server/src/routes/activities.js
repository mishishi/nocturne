import { getRecentActivities } from '../services/activityService.js'
import { successResponse } from '../config/response.js'

export default async function activityRoutes(fastify) {
  // Get recent activities for social proof notifications
  fastify.get('/activities/recent', async (request, reply) => {
    try {
      const limit = parseInt(request.query.limit) || 10
      const activities = await getRecentActivities(limit)
      return successResponse({ activities })
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '获取活动失败'
        }
      })
    }
  })
}
