import { prisma } from '../config/database.js'
import { authService } from '../services/authService.js'
import { authMiddleware } from '../middleware/auth.js'
import { successResponse, errorResponse } from '../config/response.js'

export default async function authRoutes(fastify) {
  // GET /api/auth/wechat/authorize - 生成微信授权链接并跳转
  fastify.get('/auth/wechat/authorize', async (req, res) => {
    const { redirect_uri } = req.query

    if (!redirect_uri) {
      return res.status(400).send(errorResponse('缺少 redirect_uri', 'MISSING_PARAMS'))
    }

    // 回调地址是后端的 callback 接口
    const callbackUrl = `${process.env.BASE_URL || 'http://localhost:4000'}/api/auth/wechat/callback`
    // 传给 callback 的原始跳转地址，用于最终重定向
    const state = Buffer.from(JSON.stringify({ redirect_uri })).toString('base64')

    const authUrl = authService.getWeChatAuthUrl(callbackUrl, state)
    return res.redirect(authUrl)
  })

  // GET /api/auth/wechat/callback - 微信回调，处理 code 换 openid
  fastify.get('/auth/wechat/callback', async (req, res) => {
    const { code, state } = req.query

    if (!code) {
      return res.status(400).send(errorResponse('缺少 code', 'MISSING_PARAMS'))
    }

    try {
      // 用 code 换 openid
      const { openid } = await authService.exchangeCodeForOpenid(code)

      // 登录或创建用户
      const { user, token } = await authService.wechatLogin(openid)

      // 解析原始 redirect_uri
      let redirectUri = '/'
      try {
        if (state) {
          const decoded = JSON.parse(Buffer.from(state, 'base64').toString())
          redirectUri = decoded.redirect_uri || '/'
        }
      } catch {
        // ignore parse errors
      }

      // 拼接 token 到 URL 参数
      const finalUrl = new URL(redirectUri, process.env.FRONTEND_URL || 'http://localhost:4001')
      finalUrl.searchParams.set('wechat_token', token)
      finalUrl.searchParams.set('wechat_user', JSON.stringify(user))

      return res.redirect(finalUrl.toString())
    } catch (error) {
      console.error('WeChat callback error:', error)
      // 出错也重定向到前端，让前端展示错误
      const errorUrl = new URL(process.env.FRONTEND_URL || 'http://localhost:4001')
      errorUrl.searchParams.set('wechat_error', '1')
      return res.redirect(errorUrl.toString())
    }
  })

  // POST /api/auth/wechat - 微信登录（旧接口，保留用于直接 openid 登录）
  fastify.post('/auth/wechat', async (req, res) => {
    const { openid } = req.body

    if (!openid) {
      return res.status(400).send(errorResponse('缺少 openid', 'MISSING_PARAMS'))
    }

    try {
      const result = await authService.wechatLogin(openid)
      return successResponse(result)
    } catch (error) {
      console.error('WeChat login error:', error)
      return res.status(500).send(errorResponse('微信登录失败', 'SERVER_ERROR'))
    }
  })

  // POST /api/auth/phone-login - 手机号密码登录
  fastify.post('/auth/phone-login', {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: '1 minute'
      }
    }
  }, async (req, res) => {
    const { phone, password } = req.body

    if (!phone || !password) {
      return res.status(400).send(errorResponse('手机号和密码不能为空', 'MISSING_PARAMS'))
    }

    try {
      const result = await authService.phoneLogin(phone, password)
      if (!result.success) {
        return res.status(401).send(errorResponse(result.reason || '登录失败', 'AUTH_FAILED'))
      }
      return successResponse(result)
    } catch (error) {
      console.error('Phone login error:', error)
      return res.status(500).send(errorResponse('登录失败', 'SERVER_ERROR'))
    }
  })

  // POST /api/auth/register - 注册
  fastify.post('/auth/register', {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: '1 minute'
      }
    }
  }, async (req, res) => {
    const { phone, password, nickname, inviteCode } = req.body

    if (!phone || !password) {
      return res.status(400).send(errorResponse('手机号和密码不能为空', 'MISSING_PARAMS'))
    }

    if (password.length < 6) {
      return res.status(400).send(errorResponse('密码至少6位', 'VALIDATION_ERROR'))
    }

    try {
      const result = await authService.register(phone, password, nickname)
      if (!result.success) {
        return res.status(400).send(errorResponse(result.reason || '注册失败', 'REGISTER_FAILED'))
      }
      return successResponse(result)
    } catch (error) {
      console.error('Register error:', error)
      return res.status(500).send(errorResponse('注册失败', 'SERVER_ERROR'))
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
      return res.status(400).send(errorResponse('缺少 openid', 'MISSING_PARAMS'))
    }

    // Verify the token user matches the openid being updated
    const tokenUser = await authService.getUser(req.userId)
    if (!tokenUser || tokenUser.openid !== openid) {
      return res.status(403).send(errorResponse('无权操作', 'UNAUTHORIZED'))
    }

    try {
      const user = await authService.updateProfile(openid, { nickname, avatar })
      return successResponse({ user })
    } catch (error) {
      console.error('Update profile error:', error)
      return res.status(500).send(errorResponse('更新资料失败', 'SERVER_ERROR'))
    }
  })

  // GET /api/auth/user/:openid - 获取用户信息
  fastify.get('/auth/user/:openid', async (req, res) => {
    const { openid } = req.params

    if (!openid) {
      return res.status(400).send(errorResponse('缺少 openid', 'MISSING_PARAMS'))
    }

    try {
      const user = await authService.getUserByOpenid(openid)
      if (!user) {
        return res.status(404).send(errorResponse('用户不存在', 'NOT_FOUND'))
      }
      return successResponse({ user })
    } catch (error) {
      console.error('Get user error:', error)
      return res.status(500).send(errorResponse('获取用户信息失败', 'SERVER_ERROR'))
    }
  })

  // POST /api/auth/verify-token - 验证Token
  fastify.post('/auth/verify-token', async (req, res) => {
    const { token } = req.body

    if (!token) {
      return res.status(400).send(errorResponse('缺少 token', 'MISSING_PARAMS'))
    }

    try {
      const user = await authService.verifyToken(token)
      if (!user) {
        return res.status(401).send(errorResponse('Token无效或已过期', 'TOKEN_INVALID'))
      }
      return successResponse({ user })
    } catch (error) {
      console.error('Verify token error:', error)
      return res.status(500).send(errorResponse('验证失败', 'SERVER_ERROR'))
    }
  })

  // POST /api/auth/send-reset-code - 发送密码重置验证码
  fastify.post('/auth/send-reset-code', async (req, res) => {
    const { phone } = req.body

    if (!phone) {
      return res.status(400).send(errorResponse('手机号不能为空', 'MISSING_PARAMS'))
    }

    if (!/^1[3-9]\d{9}$/.test(phone)) {
      return successResponse({ success: false, message: '手机号格式不正确' })
    }

    try {
      const user = await authService.getUserByPhone(phone)
      if (!user) {
        return successResponse({ success: false, message: '该手机号未注册' })
      }
      await authService.sendResetCode(phone)
      return successResponse({ success: true, message: '验证码已发送' })
    } catch (error) {
      console.error('Send reset code error:', error)
      return res.status(500).send(errorResponse('发送验证码失败', 'SERVER_ERROR'))
    }
  })

  // POST /api/auth/reset-password - 重置密码
  fastify.post('/auth/reset-password', async (req, res) => {
    const { phone, code, password } = req.body

    if (!phone || !code || !password) {
      return res.status(400).send(errorResponse('参数不完整', 'MISSING_PARAMS'))
    }

    if (!/^1[3-9]\d{9}$/.test(phone)) {
      return successResponse({ success: false, message: '手机号格式不正确' })
    }

    if (code !== '123456') {
      return successResponse({ success: false, message: '验证码错误' })
    }

    if (password.length < 6) {
      return successResponse({ success: false, message: '密码至少6位' })
    }

    try {
      await authService.resetPassword(phone, code, password)
      return successResponse({ success: true, message: '密码重置成功' })
    } catch (error) {
      console.error('Reset password error:', error)
      return res.status(500).send(errorResponse('重置密码失败', 'SERVER_ERROR'))
    }
  })

  // POST /api/auth/export-data - 导出用户数据 (GDPR数据 portability)
  fastify.post('/auth/export-data', {
    preHandler: async (req, res) => {
      await authMiddleware(req, res)
    }
  }, async (req, res) => {
    try {
      // 1. Get user info via authService to get openid
      const user = await authService.getUser(req.userId)
      if (!user) {
        return res.status(401).send(errorResponse('用户不存在', 'USER_NOT_FOUND'))
      }
      const { openid } = user

      // 2. All sessions (dreams) with answers and story
      const sessions = await prisma.session.findMany({
        where: { openid },
        include: { answers: true, story: true },
        orderBy: { createdAt: 'asc' }
      })

      // 3. Wall posts with comments
      const wallPosts = await prisma.dreamWall.findMany({
        where: { openid },
        include: {
          comments: {
            select: { id: true, content: true, isAnonymous: true, createdAt: true }
          }
        },
        orderBy: { createdAt: 'asc' }
      })

      // 4. Friends (accepted only)
      const friends = await prisma.friend.findMany({
        where: { userId: user.id, status: 'ACCEPTED' },
        include: { friend: true },
        orderBy: { createdAt: 'asc' }
      })

      // 5. Share logs
      const shareLogs = await prisma.shareLog.findMany({
        where: { openid },
        orderBy: { createdAt: 'asc' }
      })

      // Build export JSON
      const exportData = {
        exportedAt: new Date().toISOString(),
        appVersion: '1.0.0',
        user: {
          openid: user.openid,
          nickname: user.nickname || null,
          phone: user.phone || null,
          createdAt: user.firstSeen.toISOString(),
          isMember: user.isMember || false,
          points: user.points || 0,
          medals: user.medals || []
        },
        dreams: sessions.map(s => ({
          id: s.id,
          createdAt: s.createdAt.toISOString(),
          status: s.status,
          answers: s.answers.map(a => a.content),
          story: s.story ? {
            id: s.story.id,
            content: s.story.content,
            title: s.story.title
          } : null
        })),
        wallPosts: wallPosts.map(w => ({
          id: w.id,
          storyTitle: w.storyTitle,
          storySnippet: w.storySnippet,
          isAnonymous: w.isAnonymous,
          likeCount: w.likeCount || 0,
          commentCount: w.comments.length,
          createdAt: w.createdAt.toISOString(),
          comments: w.comments.map(c => ({
            id: c.id,
            content: c.content,
            isAnonymous: c.isAnonymous,
            createdAt: c.createdAt.toISOString()
          }))
        })),
        friends: friends.map(f => ({
          friendOpenid: f.friend.openid,
          friendNickname: f.friend.nickname || null,
          status: f.status,
          createdAt: f.createdAt.toISOString()
        })),
        shareLogs: shareLogs.map(s => ({
          type: s.type,
          createdAt: s.createdAt.toISOString()
        }))
      }

      const json = JSON.stringify(exportData, null, 2)
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')

      res.header('Content-Type', 'application/json')
      res.header('Content-Disposition', `attachment; filename="yeelin_data_${today}.json"`)
      return res.send(json)
    } catch (error) {
      console.error('Export data error:', error)
      return res.status(500).send(errorResponse('导出失败', 'SERVER_ERROR'))
    }
  })
}
