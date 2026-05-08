import { prisma } from '../config/database.js'

export const featureFlagService = {
  /**
   * 获取所有特性开关
   */
  async getAllFlags() {
    const flags = await prisma.featureFlag.findMany({
      orderBy: { key: 'asc' }
    })
    return flags
  },

  /**
   * 根据 key 获取单个特性开关
   */
  async getFlagByKey(key) {
    const flag = await prisma.featureFlag.findUnique({
      where: { key }
    })
    return flag
  },

  /**
   * 检查特性开关是否启用（支持灰度发布）
   * @param {string} key - 特性开关 key
   * @param {string} userId - 用户 ID（用于灰度分组）
   * @returns {boolean}
   */
  async isEnabled(key, userId = null) {
    const flag = await prisma.featureFlag.findUnique({
      where: { key }
    })

    if (!flag || !flag.enabled) {
      return false
    }

    // 如果没有灰度发布配置，直接返回 enabled 状态
    if (flag.rolloutPercent === null || flag.rolloutPercent === undefined) {
      return flag.enabled
    }

    // 灰度发布：基于用户 ID 的一致性哈希
    if (userId && flag.rolloutPercent > 0 && flag.rolloutPercent < 100) {
      const hash = this.hashCode(userId)
      const bucket = hash % 100
      return bucket < flag.rolloutPercent
    }

    return flag.enabled
  },

  /**
   * 创建或更新特性开关
   */
  async upsertFlag(key, enabled, rolloutPercent = null, description = null) {
    const flag = await prisma.featureFlag.upsert({
      where: { key },
      update: {
        enabled,
        rolloutPercent,
        description
      },
      create: {
        key,
        enabled,
        rolloutPercent,
        description
      }
    })
    return flag
  },

  /**
   * 删除特性开关
   */
  async deleteFlag(key) {
    await prisma.featureFlag.delete({
      where: { key }
    })
  },

  /**
   * 简单的一致性哈希（用于灰度分组）
   */
  hashCode(str) {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    return Math.abs(hash)
  }
}
