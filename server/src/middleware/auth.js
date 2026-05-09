import { verifyToken } from '../services/authService.js'

/**
 * Auth middleware - verifies token from Cookie or Bearer header
 * Priority: Cookie (httpOnly) > Authorization Header
 */
export async function authMiddleware(req, res) {
  // 优先从 httpOnly Cookie 获取 token
  const tokenFromCookie = req.cookies?.access_token

  // Fallback 到 Authorization Header（兼容旧版）
  let token = tokenFromCookie
  if (!token) {
    const authHeader = req.headers.authorization
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7)
    }
  }

  if (!token) {
    res.status(401).send({ error: '未授权，请先登录' })
    throw new Error('Unauthorized')
  }

  const userId = verifyToken(token)

  if (!userId) {
    res.status(401).send({ error: '登录已过期，请重新登录' })
    throw new Error('Unauthorized')
  }

  req.userId = userId
}
