import { describe, it, expect, vi, beforeEach } from 'vitest'
import jwt from 'jsonwebtoken'

// Mock prisma before importing authService
const mockPrismaUser = {
  findUnique: vi.fn(),
  create: vi.fn(),
  update: vi.fn()
}

vi.mock('../../src/config/database.js', () => ({
  prisma: {
    user: mockPrismaUser,
    refreshToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn()
    }
  }
}))

// Import after mocking
const authService = (await import('../../src/services/authService.js')).authService
const { verifyToken } = await import('../../src/services/authService.js')

describe('AuthService JWT Token Tests', () => {
  const TEST_USER_ID = 'test-user-cuid-123'
  const TEST_OPENID = 'phone_test123'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('JWT Generation and Verification', () => {
    it('should generate a valid JWT token', async () => {
      mockPrismaUser.findUnique.mockResolvedValue({
        id: TEST_USER_ID,
        openid: TEST_OPENID
      })

      const token = await authService.generateAccessToken(TEST_USER_ID)

      expect(token).toBeTruthy()
      expect(typeof token).toBe('string')
      // JWT tokens start with 'eyJ'
      expect(token.startsWith('eyJ')).toBe(true)

      // Verify the token can be decoded
      const decoded = jwt.decode(token)
      expect(decoded.sub).toBe(TEST_USER_ID)
      expect(decoded.openid).toBe(TEST_OPENID)
      expect(decoded.type).toBe('access')
    })

    it('should generate JWT without openid if user not found', async () => {
      mockPrismaUser.findUnique.mockResolvedValue(null)

      const token = await authService.generateAccessToken(TEST_USER_ID)

      expect(token).toBeTruthy()
      const decoded = jwt.decode(token)
      expect(decoded.sub).toBe(TEST_USER_ID)
      expect(decoded.openid).toBeNull()
    })

    it('should verify a valid JWT token', () => {
      // Create a valid JWT manually
      const secret = process.env.JWT_SECRET || 'nocturne-jwt-secret-dev-change-in-production'
      const token = jwt.sign(
        { sub: TEST_USER_ID, openid: TEST_OPENID, type: 'access' },
        secret,
        { expiresIn: '1h' }
      )

      const userId = verifyToken(token)
      expect(userId).toBe(TEST_USER_ID)
    })

    it('should reject an invalid JWT token', () => {
      const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.payload'

      const userId = verifyToken(invalidToken)
      expect(userId).toBeNull()
    })

    it('should reject an expired JWT token', () => {
      const secret = process.env.JWT_SECRET || 'nocturne-jwt-secret-dev-change-in-production'
      // Create an already expired token
      const token = jwt.sign(
        { sub: TEST_USER_ID, openid: TEST_OPENID, type: 'access' },
        secret,
        { expiresIn: '-1h' } // Already expired
      )

      const userId = verifyToken(token)
      expect(userId).toBeNull()
    })

    it('should reject JWT with wrong secret', () => {
      const token = jwt.sign(
        { sub: TEST_USER_ID, openid: TEST_OPENID, type: 'access' },
        'wrong-secret',
        { expiresIn: '1h' }
      )

      const userId = verifyToken(token)
      expect(userId).toBeNull()
    })
  })

  describe('Legacy Token Backwards Compatibility', () => {
    it('should verify legacy HMAC token still works', () => {
      // The legacy token format is: yeelin_{base64_payload}.{signature}
      // We need to create a valid legacy token to test

      const TOKEN_SECRET = process.env.TOKEN_SECRET || 'nocturne-dev-secret-change-in-production'
      const TOKEN_PREFIX = 'yeelin_'
      const exp = Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
      const payload = Buffer.from(JSON.stringify({ userId: TEST_USER_ID, exp })).toString('base64')
      const signature = require('crypto')
        .createHmac('sha256', TOKEN_SECRET)
        .update(payload)
        .digest('hex')
      const legacyToken = `${TOKEN_PREFIX}${payload}.${signature}`

      const userId = verifyToken(legacyToken)
      expect(userId).toBe(TEST_USER_ID)
    })

    it('should verify legacy token with wrong signature fails', () => {
      const TOKEN_PREFIX = 'yeelin_'
      const exp = Date.now() + 7 * 24 * 60 * 60 * 1000
      const payload = Buffer.from(JSON.stringify({ userId: TEST_USER_ID, exp })).toString('base64')
      const wrongSignature = 'wrongsignature1234567890abcdef'
      const legacyToken = `${TOKEN_PREFIX}${payload}.${wrongSignature}`

      const userId = verifyToken(legacyToken)
      expect(userId).toBeNull()
    })

    it('should verify expired legacy token fails', () => {
      const TOKEN_SECRET = process.env.TOKEN_SECRET || 'nocturne-dev-secret-change-in-production'
      const TOKEN_PREFIX = 'yeelin_'
      const exp = Date.now() - 1000 // Already expired
      const payload = Buffer.from(JSON.stringify({ userId: TEST_USER_ID, exp })).toString('base64')
      const signature = require('crypto')
        .createHmac('sha256', TOKEN_SECRET)
        .update(payload)
        .digest('hex')
      const legacyToken = `${TOKEN_PREFIX}${payload}.${signature}`

      const userId = verifyToken(legacyToken)
      expect(userId).toBeNull()
    })
  })

  describe('Token Format Detection', () => {
    it('should prioritize JWT over legacy token (JWT starts with eyJ)', () => {
      // Even if a legacy token somehow starts with eyJ (extremely unlikely),
      // JWT verification is tried first
      const secret = process.env.JWT_SECRET || 'nocturne-jwt-secret-dev-change-in-production'
      const jwtToken = jwt.sign(
        { sub: TEST_USER_ID, openid: TEST_OPENID, type: 'access' },
        secret,
        { expiresIn: '1h' }
      )

      const userId = verifyToken(jwtToken)
      expect(userId).toBe(TEST_USER_ID)
    })

    it('should handle null/undefined tokens', () => {
      expect(verifyToken(null)).toBeNull()
      expect(verifyToken(undefined)).toBeNull()
      expect(verifyToken('')).toBeNull()
    })

    it('should handle malformed tokens', () => {
      expect(verifyToken('not-a-token-at-all')).toBeNull()
      expect(verifyToken('some.random.string')).toBeNull()
      expect(verifyToken('yeelin_')).toBeNull() // Incomplete legacy token
    })
  })
})
