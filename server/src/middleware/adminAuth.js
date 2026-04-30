import { prisma } from '../config/database.js'
import { authMiddleware } from './auth.js'
import { errorResponse } from '../config/response.js'

/**
 * Admin authentication middleware
 * Must be used after authMiddleware - verifies user is admin
 */
export async function adminMiddleware(req, res) {
  // First run standard auth
  await authMiddleware(req, res)

  // Check if auth middleware already sent an error response
  if (res.sent) return

  // Check if userId was set
  if (!req.userId) {
    return res.status(401).send(errorResponse('未授权', 'UNAUTHORIZED'))
  }

  // Verify user is admin
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { isAdmin: true }
  })

  if (!user?.isAdmin) {
    return res.status(403).send(errorResponse('无管理员权限', 'FORBIDDEN'))
  }
}

export default { adminMiddleware }
