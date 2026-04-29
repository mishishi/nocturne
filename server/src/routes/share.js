import { shareService } from '../services/shareService.js'
import { authMiddleware } from '../middleware/auth.js'
import { authService } from '../services/authService.js'
import { successResponse, errorResponse } from '../config/response.js'

export default async function shareRoutes(fastify) {
  // POST /api/share/log - 记录分享 (需登录)
  fastify.post('/share/log', {
    preHandler: async (req, res) => {
      await authMiddleware(req, res)
    }
  }, async (req, res) => {
    const { openid, type } = req.body

    // Verify the openid matches the token user
    const tokenUser = await authService.getUser(req.userId)
    if (!tokenUser || tokenUser.openid !== openid) {
      return res.status(403).send(errorResponse('无权操作', 'UNAUTHORIZED'))
    }

    if (!openid || !type) {
      return res.status(400).send(errorResponse('缺少必要参数', 'MISSING_PARAMS'))
    }

    const validTypes = ['poster', 'moment', 'link', 'friend']
    if (!validTypes.includes(type)) {
      return res.status(400).send(errorResponse('无效的分享类型', 'INVALID_TYPE'))
    }

    // 获取客户端IP（用于防刷）
    const clientIp = req.ip || req.connection?.remoteAddress || null

    try {
      const result = await shareService.logShare(openid, type, clientIp)
      return successResponse(result)
    } catch (error) {
      console.error('Share log error:', error)
      return res.status(500).send(errorResponse('服务器错误', 'SERVER_ERROR'))
    }
  })

  // GET /api/share/stats - 获取用户分享统计 (需登录)
  fastify.get('/share/stats/:openid', {
    preHandler: async (req, res) => {
      await authMiddleware(req, res)
    }
  }, async (req, res) => {
    const { openid } = req.params

    // Verify the openid matches the token user
    const tokenUser = await authService.getUser(req.userId)
    if (!tokenUser || tokenUser.openid !== openid) {
      return res.status(403).send(errorResponse('无权操作', 'UNAUTHORIZED'))
    }

    if (!openid) {
      return res.status(400).send(errorResponse('缺少 openid', 'MISSING_PARAMS'))
    }

    try {
      const stats = await shareService.getStats(openid)
      return successResponse(stats)
    } catch (error) {
      console.error('Get stats error:', error)
      return res.status(500).send(errorResponse('服务器错误', 'SERVER_ERROR'))
    }
  })

  // POST /api/share/invite - 创建邀请 (需登录)
  fastify.post('/share/invite', {
    preHandler: async (req, res) => {
      await authMiddleware(req, res)
    }
  }, async (req, res) => {
    const { openid } = req.body

    // Verify the openid matches the token user
    const tokenUser = await authService.getUser(req.userId)
    if (!tokenUser || tokenUser.openid !== openid) {
      return res.status(403).send(errorResponse('无权操作', 'UNAUTHORIZED'))
    }

    if (!openid) {
      return res.status(400).send(errorResponse('缺少 openid', 'MISSING_PARAMS'))
    }

    try {
      const invite = await shareService.createInvite(openid)
      return successResponse({
        inviteCode: invite.inviteCode,
        inviteUrl: `https://yeelin.app/invite/${invite.inviteCode}`
      })
    } catch (error) {
      console.error('Create invite error:', error)
      return res.status(500).send(errorResponse('服务器错误', 'SERVER_ERROR'))
    }
  })

  // POST /api/share/use-invite - 使用邀请码 (需登录)
  fastify.post('/share/use-invite', {
    preHandler: async (req, res) => {
      await authMiddleware(req, res)
    }
  }, async (req, res) => {
    const { inviteCode, openid } = req.body

    // Verify the openid matches the token user
    const tokenUser = await authService.getUser(req.userId)
    if (!tokenUser || tokenUser.openid !== openid) {
      return res.status(403).send(errorResponse('无权操作', 'UNAUTHORIZED'))
    }

    if (!inviteCode || !openid) {
      return res.status(400).send(errorResponse('缺少必要参数', 'MISSING_PARAMS'))
    }

    try {
      const result = await shareService.useInvite(inviteCode, openid)
      return successResponse(result)
    } catch (error) {
      console.error('Use invite error:', error)
      return res.status(500).send(errorResponse('服务器错误', 'SERVER_ERROR'))
    }
  })
}
