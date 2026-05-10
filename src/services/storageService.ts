/**
 * StorageService - 内存缓存 + 防抖写入的 localStorage 抽象层
 *
 * 优点:
 * - 减少主线程阻塞 (同步→异步批量)
 * - 防抖写入避免频繁磁盘操作
 * - 提供统一的错误处理
 */

type StorageType = 'localStorage' | 'sessionStorage'

class StorageService {
  private cache: Map<string, string> = new Map()
  private pendingWrites: Map<string, ReturnType<typeof setTimeout>> = new Map()
  private storage: Storage
  private prefix: string

  constructor(type: StorageType = 'localStorage', prefix = 'yeelin_') {
    this.storage = type === 'localStorage' ? localStorage : sessionStorage
    this.prefix = prefix
    // 初始化时预热缓存
    this.warmCache()
  }

  /**
   * 预热缓存 - 启动时批量读取所有前缀的 key
   */
  private warmCache(): void {
    try {
      for (let i = 0; i < this.storage.length; i++) {
        const key = this.storage.key(i)
        if (key?.startsWith(this.prefix)) {
          const value = this.storage.getItem(key)
          if (value !== null) {
            this.cache.set(key, value)
          }
        }
      }
    } catch (e) {
      console.warn('[StorageService] Failed to warm cache:', e)
    }
  }

  /**
   * 获取值 (优先从缓存)
   */
  get(key: string): string | null {
    const fullKey = this.prefix + key
    if (this.cache.has(fullKey)) {
      return this.cache.get(fullKey) || null
    }
    try {
      const value = this.storage.getItem(fullKey)
      this.cache.set(fullKey, value || '')
      return value
    } catch (e) {
      console.warn(`[StorageService] Failed to get ${key}:`, e)
      return null
    }
  }

  /**
   * 设置值 (防抖写入)
   * @param key 键名
   * @param value 值
   * @param debounceMs 防抖延迟，默认 300ms
   * @param immediate 是否立即写入 (用于关键数据如 token)
   */
  set(key: string, value: string, debounceMs = 300, immediate = false): void {
    const fullKey = this.prefix + key
    this.cache.set(fullKey, value)

    if (immediate) {
      this.writeToStorage(fullKey, value)
      return
    }

    // 防抖
    clearTimeout(this.pendingWrites.get(fullKey))
    this.pendingWrites.set(
      fullKey,
      setTimeout(() => {
        this.writeToStorage(fullKey, value)
        this.pendingWrites.delete(fullKey)
      }, debounceMs)
    )
  }

  /**
   * 立即写入存储 (用于关键数据)
   */
  setImmediate(key: string, value: string): void {
    const fullKey = this.prefix + key
    this.cache.set(fullKey, value)
    this.writeToStorage(fullKey, value)
  }

  /**
   * 删除值
   */
  remove(key: string): void {
    const fullKey = this.prefix + key
    this.cache.delete(fullKey)
    clearTimeout(this.pendingWrites.get(fullKey))
    this.pendingWrites.delete(fullKey)
    try {
      this.storage.removeItem(fullKey)
    } catch (e) {
      console.warn(`[StorageService] Failed to remove ${key}:`, e)
    }
  }

  /**
   * 批量写入
   */
  setMany(items: Record<string, string>, debounceMs = 300): void {
    Object.entries(items).forEach(([key, value]) => {
      this.set(key, value, debounceMs)
    })
  }

  /**
   * 清空所有前缀的项
   */
  clear(): void {
    const keysToRemove: string[] = []
    this.cache.forEach((_, key) => {
      if (key.startsWith(this.prefix)) {
        keysToRemove.push(key)
      }
    })
    keysToRemove.forEach(key => {
      this.cache.delete(key)
      this.pendingWrites.delete(key)
      clearTimeout(this.pendingWrites.get(key))
      try {
        this.storage.removeItem(key)
      } catch (e) {
        console.warn(`[StorageService] Failed to remove ${key}:`, e)
      }
    })
  }

  /**
   * 刷新所有待处理的写入 (页面卸载前调用)
   */
  flush(): void {
    this.pendingWrites.forEach((timeout, key) => {
      clearTimeout(timeout)
      const value = this.cache.get(key)
      if (value !== undefined) {
        this.writeToStorage(key, value)
      }
    })
    this.pendingWrites.clear()
  }

  private writeToStorage(key: string, value: string): void {
    try {
      this.storage.setItem(key, value)
    } catch (e) {
      console.warn(`[StorageService] Failed to write ${key}:`, e)
    }
  }

  /**
   * 获取 JSON 解析后的值
   */
  getJSON<T>(key: string): T | null {
    const value = this.get(key)
    if (!value) return null
    try {
      return JSON.parse(value) as T
    } catch {
      return null
    }
  }

  /**
   * 设置 JSON 值
   */
  setJSON<T>(key: string, value: T, debounceMs = 300, immediate = false): void {
    this.set(key, JSON.stringify(value), debounceMs, immediate)
  }
}

// 单例实例
export const storage = new StorageService('localStorage', 'yeelin_')
export const session = new StorageService('sessionStorage', 'yeelin_')

// Zustand persist 存储适配器
import type { StateStorage } from 'zustand/middleware'

export const storageAdapter: StateStorage = {
  getItem: (name: string): string | null => {
    return storage.get(name)
  },
  setItem: (name: string, value: string): void => {
    storage.set(name, value)
  },
  removeItem: (name: string): void => {
    storage.remove(name)
  },
}

// 页面卸载前刷新待写入
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    storage.flush()
  })
}
