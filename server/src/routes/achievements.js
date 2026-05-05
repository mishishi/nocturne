import { prisma } from '../config/database.js'
import { authMiddleware } from '../middleware/auth.js'
import { successResponse, errorResponse } from '../config/response.js'

export default async function achievementRoutes(fastify) {
  // GET /api/achievements - Get user's achievements (需登录)
  fastify.get('/achievements', {
    preHandler: async (req, res) => {
      await authMiddleware(req, res)
    }
  }, async (req, res) => {
    const userId = req.userId

    if (!userId) {
      return res.status(401).send(errorResponse('未授权', 'UNAUTHORIZED'))
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { medals: true }
      })

      return res.send(successResponse({
        medals: user?.medals || []
      }))
    } catch (error) {
      console.error('Get achievements error:', error)
      return res.status(500).send(errorResponse('获取成就失败', 'SERVER_ERROR'))
    }
  })

  // POST /api/achievements/sync - Sync achievements to server (需登录)
  // Body: { medals: string[] }
  fastify.post('/achievements/sync', {
    preHandler: async (req, res) => {
      await authMiddleware(req, res)
    }
  }, async (req, res) => {
    const userId = req.userId
    const { medals } = req.body

    if (!userId) {
      return res.status(401).send(errorResponse('未授权', 'UNAUTHORIZED'))
    }

    if (!Array.isArray(medals)) {
      return res.status(400).send(errorResponse('无效的成就数据', 'INVALID_DATA'))
    }

    try {
      // Merge with existing medals (server stores union of local and server)
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { medals: true }
      })

      const existingMedals = user?.medals || []
      const mergedMedals = [...new Set([...existingMedals, ...medals])]

      await prisma.user.update({
        where: { id: userId },
        data: { medals: mergedMedals }
      })

      return res.send(successResponse({
        medals: mergedMedals
      }))
    } catch (error) {
      console.error('Sync achievements error:', error)
      return res.status(500).send(errorResponse('同步成就失败', 'SERVER_ERROR'))
    }
  })
}
