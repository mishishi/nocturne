import { prisma } from '../config/database.js'
import { authMiddleware } from '../middleware/auth.js'
import { successResponse, errorResponse } from '../config/response.js'

// Helper: get today's date in YYYY-MM-DD format
function getTodayDate() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Helper: get yesterday's date in YYYY-MM-DD format
function getYesterdayDate() {
  const now = new Date()
  now.setDate(now.getDate() - 1)
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Helper: calculate consecutive days from today (or yesterday if today not checked in)
async function calculateConsecutiveDays(openid) {
  const today = getTodayDate()
  const yesterday = getYesterdayDate()

  // Get all check-ins for this user, ordered by date descending
  const checkIns = await prisma.checkIn.findMany({
    where: { openid },
    orderBy: { date: 'desc' }
  })

  if (checkIns.length === 0) {
    return 0
  }

  const checkedInDates = new Set(checkIns.map(c => c.date))

  // If checked in today, start counting from today
  // If not checked in today but checked in yesterday, start counting from yesterday
  // Otherwise, return 0
  let startDate = null
  if (checkedInDates.has(today)) {
    startDate = new Date(today)
  } else if (checkedInDates.has(yesterday)) {
    startDate = new Date(yesterday)
  } else {
    return 0
  }

  // Count consecutive days backwards from startDate
  let consecutiveDays = 0
  const current = new Date(startDate)

  while (true) {
    const year = current.getFullYear()
    const month = String(current.getMonth() + 1).padStart(2, '0')
    const day = String(current.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`

    if (checkedInDates.has(dateStr)) {
      consecutiveDays++
      current.setDate(current.getDate() - 1)
    } else {
      break
    }
  }

  return consecutiveDays
}

export default async function checkInRoutes(fastify) {
  // POST /api/checkin - Check in for today (需登录)
  fastify.post('/checkin', {
    preHandler: async (req, res) => {
      await authMiddleware(req, res)
    }
  }, async (req, res) => {
    const openid = req.userId // From auth middleware

    if (!openid) {
      return res.status(401).send(errorResponse('未授权', 'UNAUTHORIZED'))
    }

    const today = getTodayDate()

    try {
      // Check if already checked in today
      const existingCheckIn = await prisma.checkIn.findUnique({
        where: {
          openid_date: {
            openid,
            date: today
          }
        }
      })

      if (existingCheckIn) {
        // Already checked in today, return existing record
        const consecutiveDays = await calculateConsecutiveDays(openid)
        return res.send(successResponse({
          consecutiveDays,
          alreadyCheckedIn: true
        }))
      }

      // Create new check-in record
      const checkIn = await prisma.checkIn.create({
        data: {
          openid,
          date: today
        }
      })

      const consecutiveDays = await calculateConsecutiveDays(openid)

      return res.send(successResponse({
        consecutiveDays,
        alreadyCheckedIn: false
      }))
    } catch (error) {
      console.error('Check-in error:', error)
      return res.status(500).send(errorResponse('签到失败', 'SERVER_ERROR'))
    }
  })

  // GET /api/checkin/status - Get check-in status (需登录)
  fastify.get('/checkin/status', {
    preHandler: async (req, res) => {
      await authMiddleware(req, res)
    }
  }, async (req, res) => {
    const openid = req.userId // From auth middleware

    if (!openid) {
      return res.status(401).send(errorResponse('未授权', 'UNAUTHORIZED'))
    }

    const today = getTodayDate()

    try {
      // Check if checked in today
      const todayCheckIn = await prisma.checkIn.findUnique({
        where: {
          openid_date: {
            openid,
            date: today
          }
        }
      })

      const consecutiveDays = await calculateConsecutiveDays(openid)

      return res.send(successResponse({
        checkedInToday: !!todayCheckIn,
        consecutiveDays
      }))
    } catch (error) {
      console.error('Get check-in status error:', error)
      return res.status(500).send(errorResponse('获取签到状态失败', 'SERVER_ERROR'))
    }
  })

  // GET /api/checkin/history - Get check-in history (需登录)
  fastify.get('/checkin/history', {
    preHandler: async (req, res) => {
      await authMiddleware(req, res)
    }
  }, async (req, res) => {
    const openid = req.userId // From auth middleware

    if (!openid) {
      return res.status(401).send(errorResponse('未授权', 'UNAUTHORIZED'))
    }

    try {
      const checkIns = await prisma.checkIn.findMany({
        where: { openid },
        orderBy: { date: 'desc' },
        select: {
          id: true,
          date: true,
          createdAt: true
        },
        take: 365
      })

      return res.send(successResponse({ records: checkIns }))
    } catch (error) {
      console.error('Get check-in history error:', error)
      return res.status(500).send(errorResponse('获取签到记录失败', 'SERVER_ERROR'))
    }
  })
}
