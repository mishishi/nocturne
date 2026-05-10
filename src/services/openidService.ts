/**
 * openidService - 统一管理 yeelin_openid
 *
 * 替代直接 localStorage 访问，提供：
 * - 统一的读写接口
 * - 内存缓存（通过 storageService）
 * - Guest openid 自动创建
 */

import { storage } from './storageService'

const OPENID_KEY = 'openid'

export const openidService = {
  /**
   * 获取 openid
   */
  get(): string | null {
    return storage.get(OPENID_KEY)
  },

  /**
   * 设置 openid (立即写入，认证数据需要)
   */
  set(openid: string): void {
    storage.setImmediate(OPENID_KEY, openid)
  },

  /**
   * 删除 openid (登出时调用)
   */
  remove(): void {
    storage.remove(OPENID_KEY)
  },

  /**
   * 获取 openid，不存在则创建新的 guest openid
   */
  getOrCreate(): string {
    const existing = this.get()
    if (existing) return existing
    const newOpenid = `web_${crypto.randomUUID()}`
    this.set(newOpenid)
    return newOpenid
  }
}
