import { verifyToken } from '../services/authService.js'

/**
 * Auth middleware - verifies Bearer token and attaches userId to request
 */
export async function authMiddleware(req, res) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).send({ error: '未授权，请先登录' })
    throw new Error('Unauthorized')
  }

  const token = authHeader.slice(7)
  const userId = verifyToken(token)

  if (!userId) {
    res.status(401).send({ error: '登录已过期，请重新登录' })
    throw new Error('Unauthorized')
  }

  req.userId = userId
}
