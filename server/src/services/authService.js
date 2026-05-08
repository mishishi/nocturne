import { prisma } from '../config/database.js'
import bcrypt from 'bcrypt'
import crypto from 'crypto'

const SALT_ROUNDS = 10

// WeChat config
const WECHAT_APPID = process.env.WECHAT_APPID || ''
const WECHAT_APPSECRET = process.env.WECHAT_APPSECRET || ''

// Token security
const TOKEN_SECRET = process.env.TOKEN_SECRET || 'nocturne-dev-secret-change-in-production'
const TOKEN_PREFIX = 'yeelin_'
const TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000 // 7 days

// Generate HMAC-signed token
function generateToken(userId) {
  const exp = Date.now() + TOKEN_EXPIRY
  const payload = Buffer.from(JSON.stringify({ userId, exp })).toString('base64')
  const signature = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(payload)
    .digest('hex')
  return `${TOKEN_PREFIX}${payload}.${signature}`
}

// Verify HMAC-signed token
export function verifyToken(token) {
  if (!token || !token.startsWith(TOKEN_PREFIX)) return null
  try {
    const withoutPrefix = token.slice(TOKEN_PREFIX.length)
    const lastDotIndex = withoutPrefix.lastIndexOf('.')
    if (lastDotIndex === -1) return null

    const payload = withoutPrefix.slice(0, lastDotIndex)
    const signature = withoutPrefix.slice(lastDotIndex + 1)

    // Verify signature
    const expectedSig = crypto
      .createHmac('sha256', TOKEN_SECRET)
      .update(payload)
      .digest('hex')
    if (signature !== expectedSig) return null

    const { userId, exp } = JSON.parse(Buffer.from(payload, 'base64').toString())
    if (exp < Date.now()) return null
    return userId
  } catch {
    return null
  }
}

// Generate anonymous identifier (SHA256 hash, no plaintext info in openid)
function generateAnonymousId(type, value) {
  return crypto
    .createHash('sha256')
    .update(`${type}:${value}:nocturne-salt-v1`)
    .digest('hex')
    .slice(0, 24)
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
      const openid = `phone_${generateAnonymousId('phone', phone)}`
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

    // Generate unique openid for phone users (anonymous identifier)
    const openid = `phone_${generateAnonymousId('phone', phone)}`

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
   * Get user by phone
   */
  async getUserByPhone(phone) {
    return prisma.user.findUnique({ where: { phone } })
  },

  /**
   * Get user by email
   */
  async getUserByEmail(email) {
    return prisma.user.findUnique({ where: { email: email.toLowerCase() } })
  },

  /**
   * Email + password login
   */
  async emailLogin(email, password) {
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })

    if (!user) {
      return { success: false, reason: '邮箱或密码错误' }
    }

    if (!user.passwordHash) {
      return { success: false, reason: '该账号未设置密码，请使用微信登录' }
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      return { success: false, reason: '邮箱或密码错误' }
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
   * Register with email + password
   */
  async emailRegister(email, password, nickname) {
    const normalizedEmail = email.toLowerCase()

    // Check if email exists
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } })
    if (existing) {
      return { success: false, reason: '该邮箱已注册' }
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)
    // Generate anonymous identifier for email (hash instead of plaintext)
    const openid = `email_${generateAnonymousId('email', normalizedEmail)}`

    const user = await prisma.user.create({
      data: {
        openid,
        email: normalizedEmail,
        emailVerified: false,
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
   * Send email verification code (demo version - returns fixed code)
   */
  async sendEmailCode(email, purpose) {
    // Demo version: always return fixed code
    // Real version: generate random 6-digit code, send via email service, store in Redis with 5min expiry
    console.log(`[Email Code Demo] To: ${email}, Purpose: ${purpose}, Code: 123456`)
    return { code: '123456' }
  },

  /**
   * Verify email code (demo version)
   */
  async verifyEmailCode(email, code, purpose) {
    // Demo version: only verify code === '123456'
    // Real version: verify code from Redis, check expiry and purpose
    if (code !== '123456') {
      return { success: false, reason: '验证码错误' }
    }
    return { success: true }
  },

  /**
   * Bind email to existing user account
   */
  async bindEmail(userId, email, code) {
    const normalizedEmail = email.toLowerCase()

    // Verify code first
    if (code !== '123456') {
      return { success: false, reason: '验证码错误' }
    }

    // Check if email already in use
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } })
    if (existing && existing.id !== userId) {
      return { success: false, reason: '该邮箱已被其他账号使用' }
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        email: normalizedEmail,
        emailVerified: true
      }
    })

    return {
      success: true,
      user: this.sanitizeUser(user)
    }
  },

  /**
   * Change password for logged-in user
   */
  async changePassword(userId, oldPassword, newPassword) {
    const user = await prisma.user.findUnique({ where: { id: userId } })

    if (!user) {
      return { success: false, reason: '用户不存在' }
    }

    if (!user.passwordHash) {
      return { success: false, reason: '该账号未设置密码' }
    }

    // Verify old password
    const valid = await bcrypt.compare(oldPassword, user.passwordHash)
    if (!valid) {
      return { success: false, reason: '原密码错误' }
    }

    // Update password
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS)
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash }
    })

    return { success: true }
  },

  /**
   * Send password reset code (demo version - returns fixed code)
   */
  async sendResetCode(phone) {
    // Demo version: always return fixed code
    // Real version: generate random 6-digit code, store in Redis with 5min expiry
    return { code: '123456' }
  },

  /**
   * Reset password with verification code (demo version)
   */
  async resetPassword(phone, code, newPassword) {
    // Demo version: only verify code === '123456'
    // Real version: verify code from Redis, check expiry
    if (code !== '123456') {
      throw new Error('验证码错误')
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS)
    await prisma.user.update({
      where: { phone },
      data: { passwordHash }
    })

    return { success: true }
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
