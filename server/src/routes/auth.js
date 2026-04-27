import { authService } from '../services/authService.js'
import { authMiddleware } from '../middleware/auth.js'

export default async function authRoutes(fastify) {
  // POST /api/auth/wechat - 微信登录
  fastify.post('/auth/wechat', async (req, res) => {
    const { openid } = req.body

    if (!openid) {
      return res.status(400).send({ error: 'openid is required' })
    }

    try {
      const result = await authService.wechatLogin(openid)
      return {
        success: true,
        ...result
      }
    } catch (error) {
      console.error('WeChat login error:', error)
      return res.status(500).send({ error: '微信登录失败' })
    }
  })

  // POST /api/auth/phone-login - 手机号密码登录
  fastify.post('/auth/phone-login', async (req, res) => {
    const { phone, password } = req.body

    if (!phone || !password) {
      return res.status(400).send({ error: '手机号和密码不能为空' })
    }

    try {
      const result = await authService.phoneLogin(phone, password)
      if (!result.success) {
        return res.status(401).send(result)
      }
      return { success: true, ...result }
    } catch (error) {
      console.error('Phone login error:', error)
      return res.status(500).send({ error: '登录失败' })
    }
  })

  // POST /api/auth/register - 注册
  fastify.post('/auth/register', async (req, res) => {
    const { phone, password, nickname, inviteCode } = req.body

    if (!phone || !password) {
      return res.status(400).send({ error: '手机号和密码不能为空' })
    }

    if (password.length < 6) {
      return res.status(400).send({ success: false, reason: '密码至少6位' })
    }

    try {
      const result = await authService.register(phone, password, nickname)
      if (!result.success) {
        return res.status(400).send(result)
      }
      return { success: true, ...result }
    } catch (error) {
      console.error('Register error:', error)
      return res.status(500).send({ error: '注册失败' })
    }
  })

  // POST /api/auth/update-profile - 更新用户资料
  fastify.post('/auth/update-profile', {
    preHandler: async (req, res) => {
      await authMiddleware(req, res)
    }
  }, async (req, res) => {
    const { openid, nickname, avatar } = req.body

    if (!openid) {
      return res.status(400).send({ error: 'openid is required' })
    }

    // Verify the token user matches the openid being updated
    const tokenUser = await authService.getUser(req.userId)
    if (!tokenUser || tokenUser.openid !== openid) {
      return res.status(403).send({ success: false, reason: '无权操作' })
    }

    try {
      const user = await authService.updateProfile(openid, { nickname, avatar })
      return { success: true, user }
    } catch (error) {
      console.error('Update profile error:', error)
      return res.status(500).send({ error: '更新资料失败' })
    }
  })

  // GET /api/auth/user/:openid - 获取用户信息
  fastify.get('/auth/user/:openid', async (req, res) => {
    const { openid } = req.params

    if (!openid) {
      return res.status(400).send({ error: 'openid is required' })
    }

    try {
      const user = await authService.getUserByOpenid(openid)
      if (!user) {
        return res.status(404).send({ error: '用户不存在' })
      }
      return { success: true, user }
    } catch (error) {
      console.error('Get user error:', error)
      return res.status(500).send({ error: '获取用户信息失败' })
    }
  })

  // POST /api/auth/verify-token - 验证Token
  fastify.post('/auth/verify-token', async (req, res) => {
    const { token } = req.body

    if (!token) {
      return res.status(400).send({ error: 'token is required' })
    }

    try {
      const user = await authService.verifyToken(token)
      if (!user) {
        return res.status(401).send({ success: false, reason: 'Token无效或已过期' })
      }
      return { success: true, user }
    } catch (error) {
      console.error('Verify token error:', error)
      return res.status(500).send({ error: '验证失败' })
    }
  })
}
