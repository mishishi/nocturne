import { shareService } from '../services/shareService.js'
import { authMiddleware } from '../middleware/auth.js'
import { authService } from '../services/authService.js'

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
      return res.status(403).send({ success: false, reason: '无权操作' })
    }

    if (!openid || !type) {
      return res.status(400).send({ error: 'openid and type are required' })
    }

    const validTypes = ['poster', 'moment', 'link', 'friend']
    if (!validTypes.includes(type)) {
      return res.status(400).send({ error: 'Invalid share type' })
    }

    // 获取客户端IP（用于防刷）
    const clientIp = req.ip || req.connection?.remoteAddress || null

    try {
      const result = await shareService.logShare(openid, type, clientIp)
      return result
    } catch (error) {
      console.error('Share log error:', error)
      return res.status(500).send({ error: 'Failed to log share' })
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
      return res.status(403).send({ success: false, reason: '无权操作' })
    }

    if (!openid) {
      return res.status(400).send({ error: 'openid is required' })
    }

    try {
      const stats = await shareService.getStats(openid)
      return stats
    } catch (error) {
      console.error('Get stats error:', error)
      return res.status(500).send({ error: 'Failed to get stats' })
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
      return res.status(403).send({ success: false, reason: '无权操作' })
    }

    if (!openid) {
      return res.status(400).send({ error: 'openid is required' })
    }

    try {
      const invite = await shareService.createInvite(openid)
      return {
        success: true,
        inviteCode: invite.inviteCode,
        inviteUrl: `https://yeelin.app/invite/${invite.inviteCode}`
      }
    } catch (error) {
      console.error('Create invite error:', error)
      return res.status(500).send({ error: 'Failed to create invite' })
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
      return res.status(403).send({ success: false, reason: '无权操作' })
    }

    if (!inviteCode || !openid) {
      return res.status(400).send({ error: 'inviteCode and openid are required' })
    }

    try {
      const result = await shareService.useInvite(inviteCode, openid)
      return result
    } catch (error) {
      console.error('Use invite error:', error)
      return res.status(500).send({ error: 'Failed to use invite' })
    }
  })
}
