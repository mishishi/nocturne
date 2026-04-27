import { prisma } from '../config/database.js'

export const friendService = {
  /**
   * 发送好友请求
   */
  async addFriend(userId, friendId) {
    // 不能添加自己
    if (userId === friendId) {
      return { success: false, reason: '不能添加自己为好友' }
    }

    // 检查是否已经是好友或已有待处理请求
    const existing = await prisma.friend.findFirst({
      where: {
        OR: [
          { userId, friendId },
          { userId: friendId, friendId: userId }
        ]
      }
    })

    if (existing) {
      if (existing.status === 'ACCEPTED') {
        return { success: false, reason: '已经是好友了' }
      }
      if (existing.status === 'PENDING') {
        return { success: false, reason: '已发送过好友请求' }
      }
      if (existing.status === 'BLOCKED') {
        return { success: false, reason: '无法添加此好友' }
      }
    }

    // 创建好友请求
    const friend = await prisma.friend.create({
      data: { userId, friendId, status: 'PENDING' }
    })

    return { success: true, friend }
  },

  /**
   * 接受好友请求
   */
  async acceptFriend(userId, friendId) {
    const request = await prisma.friend.findFirst({
      where: { userId: friendId, friendId: userId, status: 'PENDING' }
    })

    if (!request) {
      return { success: false, reason: '没有待处理的好友请求' }
    }

    // 使用事务确保原子性
    await prisma.$transaction([
      // 更新请求状态为已接受
      prisma.friend.update({
        where: { id: request.id },
        data: { status: 'ACCEPTED' }
      }),
      // 创建或更新反向好友关系
      prisma.friend.upsert({
        where: { userId_friendId: { userId, friendId } },
        update: { status: 'ACCEPTED' },
        create: { userId, friendId, status: 'ACCEPTED' }
      })
    ])

    return { success: true }
  },

  /**
   * 拒绝好友请求
   */
  async rejectFriend(userId, friendId) {
    const request = await prisma.friend.findFirst({
      where: { userId: friendId, friendId: userId, status: 'PENDING' }
    })

    if (!request) {
      return { success: false, reason: '没有待处理的好友请求' }
    }

    await prisma.friend.delete({
      where: { id: request.id }
    })

    return { success: true }
  },

  /**
   * 删除/拉黑好友
   */
  async removeFriend(userId, friendId) {
    // 删除双向好友关系
    await prisma.friend.deleteMany({
      where: {
        OR: [
          { userId, friendId },
          { userId: friendId, friendId: userId }
        ]
      }
    })

    return { success: true }
  },

  /**
   * 获取好友列表
   */
  async getFriends(userId) {
    const friends = await prisma.friend.findMany({
      where: {
        OR: [
          { userId, status: 'ACCEPTED' },
          { friendId: userId, status: 'ACCEPTED' }
        ]
      },
      include: {
        user: true,
        friend: true
      }
    })

    // 格式化好友数据
    return friends.map(f => {
      // 判断当前用户是发起方还是接收方
      const isInitiator = f.userId === userId
      const friendUser = isInitiator ? f.friend : f.user
      return {
        id: f.id,
        friendId: friendUser.id,
        nickname: friendUser.nickname,
        avatar: friendUser.avatar,
        isMember: friendUser.isMember,
        memberSince: friendUser.memberSince,
        friendsSince: f.createdAt
      }
    })
  },

  /**
   * 获取待处理的好友请求
   */
  async getPendingRequests(userId) {
    // 我收到的请求（别人发给我的）
    const received = await prisma.friend.findMany({
      where: { friendId: userId, status: 'PENDING' },
      include: { user: true }
    })

    // 我发出的请求（我发给别人的）
    const sent = await prisma.friend.findMany({
      where: { userId, status: 'PENDING' },
      include: { friend: true }
    })

    return {
      received: received.map(r => ({
        id: r.id,
        fromId: r.user.id,
        nickname: r.user.nickname,
        avatar: r.user.avatar,
        createdAt: r.createdAt
      })),
      sent: sent.map(s => ({
        id: s.id,
        toId: s.friend.id,
        nickname: s.friend.nickname,
        avatar: s.friend.avatar,
        createdAt: s.createdAt
      }))
    }
  },

  /**
   * 拉黑用户
   */
  async blockUser(userId, blockedId) {
    // 删除现有关系
    await prisma.friend.deleteMany({
      where: {
        OR: [
          { userId, friendId: blockedId },
          { userId: blockedId, friendId: userId }
        ]
      }
    })

    // 创建拉黑关系
    await prisma.friend.create({
      data: { userId, friendId: blockedId, status: 'BLOCKED' }
    })

    return { success: true }
  },

  /**
   * 搜索用户（通过昵称或手机号）
   */
  async searchUsers(query, excludeId) {
    if (!query || query.length < 2) {
      return []
    }

    const users = await prisma.user.findMany({
      where: {
        AND: [
          { id: { not: excludeId } },
          {
            OR: [
              { nickname: { contains: query } },
              { phone: { contains: query } }
            ]
          }
        ]
      },
      select: {
        id: true,
        nickname: true,
        avatar: true,
        isMember: true
      },
      take: 20
    })

    return users
  },

  /**
   * 获取好友数量
   */
  async getFriendCount(userId) {
    const count = await prisma.friend.count({
      where: {
        OR: [
          { userId, status: 'ACCEPTED' },
          { friendId: userId, status: 'ACCEPTED' }
        ]
      }
    })
    return count
  }
}
