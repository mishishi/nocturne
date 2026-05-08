export interface FeatureFlag {
  key: string
  enabled: boolean
  rolloutPercent: number | null
  description: string | null
}

export interface FeatureFlagResponse {
  success: boolean
  data: FeatureFlag[]
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1'

class FeatureFlagsService {
  private cache: Map<string, { flag: FeatureFlag; timestamp: number }> = new Map()
  private cacheTimeout = 60 * 1000 // 1 minute cache

  /**
   * 获取所有特性开关
   */
  async getAllFlags(): Promise<FeatureFlag[]> {
    try {
      const response = await fetch(`${API_BASE}/config/feature-flags`, {
        credentials: 'include'
      })
      const data = await response.json() as FeatureFlagResponse
      if (data.success && data.data) {
        // Update cache
        data.data.forEach((flag: FeatureFlag) => {
          this.cache.set(flag.key, { flag, timestamp: Date.now() })
        })
        return data.data
      }
      return []
    } catch (error) {
      console.error('[FeatureFlags] Failed to get flags:', error)
      return []
    }
  }

  /**
   * 检查单个特性开关状态
   */
  async checkFlag(key: string): Promise<boolean> {
    // Check cache first
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.flag.enabled
    }

    try {
      const response = await fetch(`${API_BASE}/config/feature-flags/${encodeURIComponent(key)}`, {
        credentials: 'include'
      })
      const data = await response.json() as { success: boolean; data: { key: string; enabled: boolean } }
      if (data.success && data.data) {
        const result = data.data.enabled
        // Update cache
        const cachedFlag = this.cache.get(key)
        this.cache.set(key, {
          flag: cachedFlag ? { ...cachedFlag.flag, enabled: result } : { key, enabled: result, rolloutPercent: null, description: null },
          timestamp: Date.now()
        })
        return result
      }
      return false
    } catch (error) {
      console.error('[FeatureFlags] Failed to check flag:', error)
      return false
    }
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * 清除单个 flag 缓存
   */
  clearFlagCache(key: string): void {
    this.cache.delete(key)
  }
}

export const featureFlagsService = new FeatureFlagsService()
