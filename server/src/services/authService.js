import { prisma } from '../config/database.js'
import bcrypt from 'bcrypt'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'

const SALT_ROUNDS = 10

// WeChat config
const WECHAT_APPID = process.env.WECHAT_APPID || ''
const WECHAT_APPSECRET = process.env.WECHAT_APPSECRET || ''

// JWT token security (industry standard)
function getJwtSecret() {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('FATAL: JWT_SECRET environment variable is required')
  }
  if (secret.length < 32) {
    throw new Error('FATAL: JWT_SECRET must be at least 32 characters')
  }
  return secret
}

const JWT_SECRET = getJwtSecret()
const JWT_EXPIRY = '2h' // 2 hour access token

// Legacy HMAC token security (backwards compatibility)
function getTokenSecret() {
  const secret = process.env.TOKEN_SECRET
  if (!secret) {
    throw new Error('FATAL: TOKEN_SECRET environment variable is required')
  }
  return secret
}

const TOKEN_SECRET = getTokenSecret()
const TOKEN_PREFIX = 'yeelin_'
const TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000 // 7 days (legacy)

// Refresh token security
function getRefreshTokenSecret() {
  const secret = process.env.REFRESH_TOKEN_SECRET
  if (!secret) {
    throw new Error('FATAL: REFRESH_TOKEN_SECRET environment variable is required')
  }
  if (secret.length < 32) {
    throw new Error('FATAL: REFRESH_TOKEN_SECRET must be at least 32 characters')
  }
  return secret
}

const REFRESH_TOKEN_SECRET = getRefreshTokenSecret()
const REFRESH_TOKEN_PREFIX = 'yeelin_refresh_'
const REFRESH_TOKEN_EXPIRY = 30 * 24 * 60 * 60 * 1000 // 30 days

// Generate JWT token (industry standard)
function generateJWT(userId, openid) {
  return jwt.sign(
    { sub: userId, openid, type: 'access' },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  )
}

// Verify JWT token
function verifyJWT(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    return decoded.sub
  } catch {
    return null
  }
}

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

// Generate refresh token (random string stored in DB)
async function generateRefreshToken(userId) {
  const token = crypto.randomBytes(64).toString('hex')
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY)

  // Store in database
  const refreshToken = await prisma.refreshToken.create({
    data: {
      token,
      userId,
      expiresAt
    }
  })

  return token
}

// Verify refresh token
async function verifyRefreshToken(token) {
  if (!token || !token.startsWith(REFRESH_TOKEN_PREFIX)) return null

  try {
    const actualToken = token.slice(REFRESH_TOKEN_PREFIX.length)

    const refreshToken = await prisma.refreshToken.findUnique({
      where: { token: actualToken }
    })

    if (!refreshToken) return null
    if (refreshToken.expiresAt < new Date()) {
      // Token expired, delete it
      await prisma.refreshToken.delete({ where: { id: refreshToken.id } })
      return null
    }

    return refreshToken.userId
  } catch {
    return null
  }
}

// Revoke a single refresh token
async function revokeRefreshToken(token) {
  if (!token || !token.startsWith(REFRESH_TOKEN_PREFIX)) return false

  try {
    const actualToken = token.slice(REFRESH_TOKEN_PREFIX.length)
    await prisma.refreshToken.deleteMany({
      where: { token: actualToken }
    })
    return true
  } catch {
    return false
  }
}

// Revoke all refresh tokens for a user
async function revokeAllUserRefreshTokens(userId) {
  await prisma.refreshToken.deleteMany({
    where: { userId }
  })
}

// Verify token (dual-track: JWT first, then legacy HMAC for backwards compatibility)
export function verifyToken(token) {
  if (!token) return null

  // 1. Try JWT (industry standard)
  if (token.startsWith('eyJ')) {
    const userId = verifyJWT(token)
    if (userId) return userId
  }

  // 2. Fallback to legacy HMAC token
  if (token.startsWith(TOKEN_PREFIX)) {
    try {
      const withoutPrefix = token.slice(TOKEN_PREFIX.length)
      const lastDotIndex = withoutPrefix.lastIndexOf('.')
      if (lastDotIndex === -1) return null

      const payload = withoutPrefix.slice(0, lastDotIndex)
      const signature = withoutPrefix.slice(lastDotIndex + 1)

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

  return null
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
   * Generate new JWT access token for user
   * Uses industry-standard JWT instead of legacy HMAC token
   */
  async generateAccessToken(userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    const openid = user?.openid || null
    return generateJWT(userId, openid)
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

    const token = await this.generateAccessToken(user.id)
    const refreshToken = await this.createRefreshToken(user.id)
    return {
      user: this.sanitizeUser(user),
      token,
      refreshToken
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
      const token = await this.generateAccessToken(user.id)
      const refreshToken = await this.createRefreshToken(user.id)
      return {
        success: true,
        user: this.sanitizeUser(user),
        token,
        refreshToken
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

    const token = await this.generateAccessToken(user.id)
    const refreshToken = await this.createRefreshToken(user.id)
    return {
      success: true,
      user: this.sanitizeUser(user),
      token,
      refreshToken
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

    const token = await this.generateAccessToken(user.id)
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

    const token = await this.generateAccessToken(user.id)
    const refreshToken = await this.createRefreshToken(user.id)
    return {
      success: true,
      user: this.sanitizeUser(user),
      token,
      refreshToken
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

    const token = await this.generateAccessToken(user.id)
    const refreshToken = await this.createRefreshToken(user.id)
    return {
      success: true,
      user: this.sanitizeUser(user),
      token,
      refreshToken
    }
  },

  /**
   * Generate a secure random 6-digit code
   */
  generateSecureCode() {
    return Math.floor(100000 + Math.random() * 900000).toString()
  },

  /**
   * Store verification code in database
   */
  async storeVerificationCode(identifier, purpose, code) {
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes

    // Delete any existing unused codes for this identifier and purpose
    await prisma.verificationCode.deleteMany({
      where: {
        OR: [
          { phone: identifier, purpose, used: false },
          { email: identifier, purpose, used: false }
        ]
      }
    })

    // Create new code
    const isPhone = identifier.includes('@') === false
    await prisma.verificationCode.create({
      data: {
        code,
        ...(isPhone ? { phone: identifier } : { email: identifier }),
        purpose,
        expiresAt
      }
    })

    return code
  },

  /**
   * Verify and consume code from database
   */
  async verifyAndConsumeCode(identifier, code, purpose) {
    const isPhone = identifier.includes('@') === false

    const record = await prisma.verificationCode.findFirst({
      where: {
        code,
        purpose,
        used: false,
        expiresAt: { gt: new Date() },
        ...(isPhone ? { phone: identifier } : { email: identifier })
      }
    })

    if (!record) {
      return { success: false, reason: '验证码错误或已过期' }
    }

    // Mark as used
    await prisma.verificationCode.update({
      where: { id: record.id },
      data: { used: true }
    })

    return { success: true }
  },

  /**
   * Send email verification code
   */
  async sendEmailCode(email, purpose) {
    const normalizedEmail = email.toLowerCase()
    const code = this.generateSecureCode()

    // In production, you would send the email here
    // For now, store in DB and log (development only)
    await this.storeVerificationCode(normalizedEmail, purpose, code)

    console.log(`[DEV] Email verification code for ${normalizedEmail}: ${code}`)

    return { code } // Return code for development; remove in production
  },

  /**
   * Verify email code
   */
  async verifyEmailCode(email, code, purpose) {
    const normalizedEmail = email.toLowerCase()
    return this.verifyAndConsumeCode(normalizedEmail, code, purpose)
  },

  /**
   * Bind email to existing user account
   */
  async bindEmail(userId, email, code) {
    const normalizedEmail = email.toLowerCase()

    // Verify code first
    const verifyResult = await this.verifyAndConsumeCode(normalizedEmail, code, 'email_verification')
    if (!verifyResult.success) {
      return verifyResult
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
   * Send password reset code
   */
  async sendResetCode(phone) {
    const code = this.generateSecureCode()
    await this.storeVerificationCode(phone, 'password_reset', code)

    console.log(`[DEV] Password reset code for ${phone}: ${code}`)

    return { code } // Return code for development; remove in production
  },

  /**
   * Reset password with verification code
   */
  async resetPassword(phone, code, newPassword) {
    const verifyResult = await this.verifyAndConsumeCode(phone, code, 'password_reset')
    if (!verifyResult.success) {
      throw new Error(verifyResult.reason)
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS)
    await prisma.user.update({
      where: { phone },
      data: { passwordHash }
    })

    return { success: true }
  },

  /**
   * Generate refresh token for user
   */
  async createRefreshToken(userId) {
    const token = crypto.randomBytes(64).toString('hex')
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY)

    await prisma.refreshToken.create({
      data: {
        token,
        userId,
        expiresAt
      }
    })

    return `${REFRESH_TOKEN_PREFIX}${token}`
  },

  /**
   * Verify refresh token and return user
   */
  async verifyRefreshToken(token) {
    if (!token || !token.startsWith(REFRESH_TOKEN_PREFIX)) return null

    try {
      const actualToken = token.slice(REFRESH_TOKEN_PREFIX.length)

      const refreshToken = await prisma.refreshToken.findUnique({
        where: { token: actualToken }
      })

      if (!refreshToken) return null
      if (refreshToken.expiresAt < new Date()) {
        await prisma.refreshToken.delete({ where: { id: refreshToken.id } })
        return null
      }

      return refreshToken.userId
    } catch {
      return null
    }
  },

  /**
   * Revoke refresh token
   */
  async revokeRefreshToken(token) {
    if (!token || !token.startsWith(REFRESH_TOKEN_PREFIX)) return false

    try {
      const actualToken = token.slice(REFRESH_TOKEN_PREFIX.length)
      await prisma.refreshToken.deleteMany({
        where: { token: actualToken }
      })
      return true
    } catch {
      return false
    }
  },

  /**
   * Revoke all refresh tokens for user (logout from all devices)
   */
  async revokeAllUserRefreshTokens(userId) {
    await prisma.refreshToken.deleteMany({
      where: { userId }
    })
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
