import { authMiddleware } from '../middleware/auth.js'
import { successResponse, errorResponse } from '../config/response.js'
import {
  getMetrics,
  getSlowEndpoints,
  getMetricsSummary
} from '../services/metricsService.js'

export default async function metricsRoutes(fastify) {
  // GET /api/metrics/summary - Get overall metrics summary
  fastify.get('/metrics/summary', {
    preHandler: async (req, res) => {
      await authMiddleware(req, res)
    }
  }, async (req, res) => {
    const { startDate, endDate } = req.query

    if (!startDate || !endDate) {
      return res.status(400).send(errorResponse('缺少日期参数', 'MISSING_PARAMS'))
    }

    try {
      const summary = await getMetricsSummary({ startDate, endDate })
      return successResponse(summary)
    } catch (error) {
      console.error('Get metrics summary error:', error)
      return res.status(500).send(errorResponse('获取监控汇总失败', 'SERVER_ERROR'))
    }
  })

  // GET /api/metrics/trend - Get metrics trend over time
  fastify.get('/metrics/trend', {
    preHandler: async (req, res) => {
      await authMiddleware(req, res)
    }
  }, async (req, res) => {
    const { startDate, endDate, interval = 'hour' } = req.query

    if (!startDate || !endDate) {
      return res.status(400).send(errorResponse('缺少日期参数', 'MISSING_PARAMS'))
    }

    if (!['hour', 'day'].includes(interval)) {
      return res.status(400).send(errorResponse('无效的间隔参数', 'VALIDATION_ERROR'))
    }

    try {
      const trend = await getMetrics({ startDate, endDate, interval })
      return successResponse(trend)
    } catch (error) {
      console.error('Get metrics trend error:', error)
      return res.status(500).send(errorResponse('获取监控趋势失败', 'SERVER_ERROR'))
    }
  })

  // GET /api/metrics/slow - Get top slowest endpoints
  fastify.get('/metrics/slow', {
    preHandler: async (req, res) => {
      await authMiddleware(req, res)
    }
  }, async (req, res) => {
    const { startDate, endDate, limit = 10, endpoint } = req.query

    if (!startDate || !endDate) {
      return res.status(400).send(errorResponse('缺少日期参数', 'MISSING_PARAMS'))
    }

    try {
      const slowEndpoints = await getSlowEndpoints({
        startDate,
        endDate,
        limit: parseInt(limit, 10),
        endpoint: endpoint || null
      })
      return successResponse(slowEndpoints)
    } catch (error) {
      console.error('Get slow endpoints error:', error)
      return res.status(500).send(errorResponse('获取慢接口失败', 'SERVER_ERROR'))
    }
  })
}
