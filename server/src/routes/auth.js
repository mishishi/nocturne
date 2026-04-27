import { authService } from '../services/authService.js'
import { authMiddleware } from '../middleware/auth.js'

export default async function authRoutes(fastify) {
  // GET /api/auth/wechat/authorize - 生成微信授权链接并跳转
  fastify.get('/auth/wechat/authorize', async (req, res) => {
    const { redirect_uri } = req.query

    if (!redirect_uri) {
      return res.status(400).send({ error: 'redirect_uri is required' })
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
      return res.status(400).send({ error: 'code is required' })
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
