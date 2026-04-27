import { prisma } from '../config/database.js'

// 积分规则
const POINTS = {
  poster: 5,
  moment: 5, // 实际+5+月光勋章，不额外加分
  link: 2,
  friend: 10
}

// 每日分享上限
const DAILY_LIMIT = {
  poster: 3,
  moment: 1,
  link: 5,
  friend: 2
}

// 每日积分上限
const MAX_POINTS_PER_DAY = 30

// 勋章定义
export const MEDALS = {
  moonlight: { id: 'moonlight', name: '月光勋章', icon: '🌙', description: '朋友圈首次分享' },
  newmoon: { id: 'newmoon', name: '新月勋章', icon: '🌑', description: '邀请好友成功' },
  meteor: { id: 'meteor', name: '流星成就', icon: '☄️', description: '连续分享7天' }
}

// 防刷：同一IP每日最大分享次数
const IP_DAILY_LIMIT = 50

export const shareService = {
  /**
   * 记录分享并返回奖励信息
   */
  async logShare(openid, type, clientIp = null) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // 获取用户当日分享统计
    const todayShares = await prisma.shareLog.count({
      where: {
        openid,
        createdAt: { gte: today }
      }
    })

    // 检查用户分享次数限制
    if (todayShares >= DAILY_LIMIT[type]) {
      return { success: false, reason: '分享次数已达今日上限' }
    }

    // 计算用户当日已获得积分
    let earnedToday = 0
    const todayShareLogs = await prisma.shareLog.findMany({
      where: { openid, createdAt: { gte: today } },
      select: { type: true }
    })
    for (const log of todayShareLogs) {
      earnedToday += parseInt(log.type === 'poster' ? POINTS.poster :
                              log.type === 'moment' ? POINTS.moment :
                              log.type === 'link' ? POINTS.link :
                              POINTS.friend) || 0
    }

    if (earnedToday >= MAX_POINTS_PER_DAY) {
      return { success: false, reason: '今日积分已达上限' }
    }

    // 记录分享
    const shareLog = await prisma.shareLog.create({
      data: { openid, type }
    })

    // 计算本次获得的积分
    const pointsEarned = Math.min(POINTS[type], MAX_POINTS_PER_DAY - earnedToday)

    // 更新用户积分
    const user = await prisma.user.update({
      where: { openid },
      data: { points: { increment: pointsEarned } }
    })

    // 检查连续分享天数
    const { consecutiveDays, medalsUnlocked } = await this.updateConsecutiveShares(openid)

    // 检查月光勋章（朋友圈首次分享）
    if (type === 'moment') {
      const hasMoonlight = user.medals.includes('moonlight')
      if (!hasMoonlight) {
        await prisma.user.update({
          where: { openid },
          data: { medals: { push: 'moonlight' } }
        })
        medalsUnlocked.push('moonlight')
      }
    }

    return {
      success: true,
      pointsEarned,
      totalPoints: user.points,
      consecutiveDays,
      medalsUnlocked,
      shareId: shareLog.id
    }
  },

  /**
   * 更新连续分享天数
   */
  async updateConsecutiveShares(openid) {
    const user = await prisma.user.findUnique({ where: { openid } })
    if (!user) return { consecutiveDays: 0, medalsUnlocked: [] }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    let newConsecutive = user.consecutiveShares
    const medalsUnlocked = []

    if (!user.lastShareDate) {
      // 首次分享
      newConsecutive = 1
    } else {
      const lastShare = new Date(user.lastShareDate)
      lastShare.setHours(0, 0, 0, 0)

      if (lastShare.getTime() === today.getTime()) {
        // 今天已分享，不增加
      } else if (lastShare.getTime() === yesterday.getTime()) {
        // 昨天分享了，连续天数+1
        newConsecutive = user.consecutiveShares + 1
      } else {
        // 间断，连续天数重置为1
        newConsecutive = 1
      }
    }

    // 检查流星成就（连续7天）
    if (newConsecutive >= 7 && !user.medals.includes('meteor')) {
      await prisma.user.update({
        where: { openid },
        data: { medals: { push: 'meteor' } }
      })
      medalsUnlocked.push('meteor')
    }

    // 更新连续天数和最后分享日期
    await prisma.user.update({
      where: { openid },
      data: {
        consecutiveShares: newConsecutive,
        lastShareDate: new Date()
      }
    })

    return { consecutiveDays: newConsecutive, medalsUnlocked }
  },

  /**
   * 获取用户分享统计
   */
  async getStats(openid) {
    const user = await prisma.user.findUnique({ where: { openid } })
    if (!user) {
      // 自动创建用户
      const newUser = await prisma.user.create({ data: { openid } })
      return {
        points: 0,
        medals: [],
        consecutiveShares: 0,
        inviteCode: this.generateInviteCode(openid)
      }
    }

    // 获取今日分享次数
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const todayShareCount = await prisma.shareLog.count({
      where: { openid, createdAt: { gte: today } }
    })

    return {
      points: user.points,
      medals: user.medals,
      consecutiveShares: user.consecutiveShares,
      lastShareDate: user.lastShareDate?.toISOString() || null,
      todayShareCount,
      inviteCode: this.generateInviteCode(openid)
    }
  },

  /**
   * 生成邀请码
   */
  generateInviteCode(openid) {
    // 基于openid和时间戳生成简单邀请码
    const timestamp = Date.now().toString(36)
    const hash = openid.slice(-4).toUpperCase()
    return `NL${hash}${timestamp.slice(-4)}`.toUpperCase()
  },

  /**
   * 创建邀请记录
   */
  async createInvite(inviterOpenid) {
    const inviteCode = this.generateInviteCode(inviterOpenid)

    return prisma.invite.create({
      data: {
        inviterOpenid,
        inviteCode
      }
    })
  },

  /**
   * 使用邀请码（好友接受邀请）
   */
  async useInvite(inviteCode, inviteeOpenid) {
    const invite = await prisma.invite.findUnique({
      where: { inviteCode }
    })

    if (!invite) {
      return { success: false, reason: '邀请码无效' }
    }

    if (invite.status === 'COMPLETED') {
      return { success: false, reason: '邀请码已使用' }
    }

    if (invite.inviterOpenid === inviteeOpenid) {
      return { success: false, reason: '不能邀请自己' }
    }

    // 更新邀请状态
    await prisma.invite.update({
      where: { id: invite.id },
      data: {
        inviteeOpenid,
        status: 'COMPLETED',
        completedAt: new Date()
      }
    })

    // 给邀请者加积分和新月勋章
    const inviter = await prisma.user.findUnique({
      where: { openid: invite.inviterOpenid }
    })

    if (!inviter.medals.includes('newmoon')) {
      await prisma.user.update({
        where: { openid: invite.inviterOpenid },
        data: {
          points: { increment: 20 },
          medals: { push: 'newmoon' }
        }
      })
    } else {
      await prisma.user.update({
        where: { openid: invite.inviterOpenid },
        data: { points: { increment: 20 } }
      })
    }

    return {
      success: true,
      inviterOpenid: invite.inviterOpenid
    }
  },

  /**
   * 好友首次记录故事后，给邀请者额外奖励
   */
  async rewardInviteOnFirstDream(inviterOpenid) {
    // 检查是否已有完成的故事
    const completedSessions = await prisma.session.count({
      where: {
        openid: inviterOpenid,
        status: 'COMPLETED'
      }
    })

    if (completedSessions === 1) {
      // 好友第一个故事完成，给邀请者额外奖励
      await prisma.user.update({
        where: { openid: inviterOpenid },
        data: {
          points: { increment: 10 }
        }
      })
      return { success: true, extraPoints: 10 }
    }

    return { success: false }
  }
}
