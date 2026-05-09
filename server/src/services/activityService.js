import { prisma } from '../config/database.js'

// 随机城市列表用于匿名化
const CITIES = ['北京', '上海', '广州', '深圳', '成都', '杭州', '南京', '武汉', '西安', '重庆', '苏州', '天津', '长沙', '青岛', '大连']
const NICKNAMES = ['王同学', '陈小姐', '李先生', '赵同学', '周同学', '吴小姐', '孙同学', '郑同学']

/**
 * 获取最近用户活动用于社交证明
 */
export async function getRecentActivities(limit = 10) {
  const now = new Date()
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  try {
    // 并行查询多种活动
    const [sessions, wallPosts, checkIns] = await Promise.all([
      // 最近创建的 Session（开始探索）
      prisma.session.findMany({
        where: {
          createdAt: { gte: oneDayAgo }
        },
        select: {
          openid: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        take: 30
      }),

      // 最近发布的梦墙
      prisma.dreamWall.findMany({
        where: {
          createdAt: { gte: oneDayAgo }
        },
        select: {
          openid: true,
          nickname: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        take: 20
      }),

      // 最近的签到
      prisma.checkIn.findMany({
        where: {
          createdAt: { gte: oneDayAgo }
        },
        select: {
          userId: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        take: 30
      })
    ])

    // 格式化活动
    const activities = []

    // 添加 Session 活动（开始探索）
    for (const s of sessions) {
      activities.push({
        type: 'explore_start',
        openid: s.openid,
        createdAt: s.createdAt
      })
    }

    // 添加梦墙发布活动
    for (const p of wallPosts) {
      activities.push({
        type: 'story_published',
        openid: p.openid,
        nickname: p.nickname,
        createdAt: p.createdAt
      })
    }

    // 添加签到活动
    for (const c of checkIns) {
      activities.push({
        type: 'checkin',
        openid: c.userId,
        createdAt: c.createdAt
      })
    }

    // 按时间排序
    activities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

    // 取前 N 条，随机打乱
    const shuffled = activities.slice(0, limit * 2).sort(() => Math.random() - 0.5)
    const selected = shuffled.slice(0, limit)

    // 格式化输出
    return selected.map(activity => {
      const city = CITIES[Math.abs(hashCode(activity.openid)) % CITIES.length]
      const nickname = NICKNAMES[Math.abs(hashCode(activity.openid + '1')) % NICKNAMES.length]
      return {
        message: `${city}的${nickname}${getActionText(activity.type)}`,
        icon: getIconForActivity(activity.type)
      }
    })
  } catch (error) {
    console.error('Failed to get recent activities:', error)
    return []
  }
}

function hashCode(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return hash
}

function getActionText(type) {
  const texts = {
    explore_start: '刚开始探索',
    story_published: '发布了故事',
    checkin: '完成了签到'
  }
  return texts[type] || '产生了新活动'
}

function getIconForActivity(type) {
  const icons = {
    explore_start: '🌙',
    story_published: '📖',
    checkin: '🔥'
  }
  return icons[type] || '✨'
}
