import { prisma } from '../config/database.js'
import bcrypt from 'bcrypt'

const SALT_ROUNDS = 10

// WeChat config
const WECHAT_APPID = process.env.WECHAT_APPID || ''
const WECHAT_APPSECRET = process.env.WECHAT_APPSECRET || ''

// Simple JWT-like token (for demo - use real JWT in production)
function generateToken(userId) {
  const payload = Buffer.from(JSON.stringify({ userId, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 })).toString('base64')
  return `yeelin_${payload}`
}

export function verifyToken(token) {
  if (!token || !token.startsWith('yeelin_')) return null
  try {
    const payload = JSON.parse(Buffer.from(token.slice(7), 'base64').toString())
    if (payload.exp < Date.now()) return null
    return payload.userId
  } catch {
    return null
  }
}

export const authService = {
  /**
   * WeChat login - creates user if not exists
   */
  async wechatLogin(openid) {
    let user = await prisma.user.findUnique({ where: { openid } })

    if (!user) {
      user = await prisma.user.create({
        data: {
          openid,
          nickname: `梦境旅人${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`
        }
      })
    }

    // Update last login
    await prisma.user.update({
      where: { openid },
      data: { lastLogin: new Date() }
    })

    const token = generateToken(user.id)
    return {
      user: this.sanitizeUser(user),
      token
    }
  },

  /**
   * Phone + password login
   * Auto-register if user doesn't exist (seamless registration)
   */
  async phoneLogin(phone, password) {
    let user = await prisma.user.findUnique({ where: { phone } })

    // Auto-register if user doesn't exist
    if (!user) {
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)
      const openid = `phone_${phone}_${Date.now()}`
      user = await prisma.user.create({
        data: {
          openid,
          phone,
          passwordHash,
          nickname: `梦境旅人${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`,
          lastLogin: new Date()
        }
      })
      const token = generateToken(user.id)
      return {
        success: true,
        user: this.sanitizeUser(user),
        token
      }
    }

    // User exists but no passwordHash (WeChat user) - can't login with phone+password
    if (!user.passwordHash) {
      return { success: false, reason: '手机号或密码错误' }
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      return { success: false, reason: '手机号或密码错误' }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    })

    const token = generateToken(user.id)
    return {
      success: true,
      user: this.sanitizeUser(user),
      token
    }
  },

  /**
   * Register with phone + password
   */
  async register(phone, password, nickname) {
    // Check if phone exists
    const existing = await prisma.user.findUnique({ where: { phone } })
    if (existing) {
      return { success: false, reason: '该手机号已注册' }
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)

    // Generate unique openid for phone users
    const openid = `phone_${phone}_${Date.now()}`

    const user = await prisma.user.create({
      data: {
        openid,
        phone,
        passwordHash,
        nickname: nickname || `梦境旅人${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`
      }
    })

    const token = generateToken(user.id)
    return {
      success: true,
      user: this.sanitizeUser(user),
      token
    }
  },

  /**
   * Update user profile
   */
  async updateProfile(userId, { nickname, avatar }) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(nickname && { nickname }),
        ...(avatar && { avatar })
      }
    })
    return this.sanitizeUser(user)
  },

  /**
   * Get user by ID
   */
  async getUser(userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return null
    return this.sanitizeUser(user)
  },

  /**
   * Get user by openid
   */
  async getUserByOpenid(openid) {
    const user = await prisma.user.findUnique({ where: { openid } })
    if (!user) return null
    return this.sanitizeUser(user)
  },

  /**
   * Verify token and return user
   */
  async verifyToken(token) {
    const userId = verifyToken(token)
    if (!userId) return null
    return this.getUser(userId)
  },

  /**
   * Remove sensitive data from user object
   */
  sanitizeUser(user) {
    const { passwordHash, ...safeUser } = user
    return safeUser
  },

  /**
   * Generate WeChat OAuth authorization URL
   */
  getWeChatAuthUrl(redirectUri, state = '') {
    const scope = 'snsapi_base' // Only need openid, no user profile
    const authUrl = new URL('https://open.weixin.qq.com/connect/oauth2/authorize')
    authUrl.searchParams.set('appid', WECHAT_APPID)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('scope', scope)
    authUrl.searchParams.set('state', state)
    return authUrl.toString() + '#wechat_redirect'
  },

  /**
   * Exchange authorization code for openid
   */
  async exchangeCodeForOpenid(code) {
    if (!WECHAT_APPID || !WECHAT_APPSECRET) {
      throw new Error('WeChat appid or appsecret not configured')
    }

    const url = 'https://api.weixin.qq.com/sns/oauth2/access_token'
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      appid: WECHAT_APPID,
      secret: WECHAT_APPSECRET,
      code
    })

    const response = await fetch(`${url}?${params.toString()}`, {
      method: 'GET'
    })

    if (!response.ok) {
      throw new Error(`WeChat API error: ${response.status}`)
    }

    const data = await response.json()

    if (data.errcode) {
      throw new Error(`WeChat error: ${data.errmsg}`)
    }

    return {
      openid: data.openid,
      accessToken: data.access_token,
      expiresIn: data.expires_in
    }
  }
}
