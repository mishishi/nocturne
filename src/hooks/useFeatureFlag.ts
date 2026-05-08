import { useState, useEffect, useCallback } from 'react'
import { featureFlagsService, FeatureFlag } from '../services/featureFlags'

/**
 * 特性开关 Hook
 * @param key - 特性开关的 key
 * @param options - 配置选项
 */
export function useFeatureFlag(key: string, options?: {
  fallback?: boolean        // 查询失败时的默认值，默认为 false
  revalidateOnMount?: boolean // 每次挂载时重新验证，默认为 true
}) {
  const { fallback = false, revalidateOnMount = true } = options || {}

  const [enabled, setEnabled] = useState<boolean>(fallback)
  const [flag, setFlag] = useState<FeatureFlag | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(revalidateOnMount)
  const [error, setError] = useState<Error | null>(null)

  const fetchFlag = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await featureFlagsService.checkFlag(key)
      setEnabled(result)

      // Also fetch full flag data for metadata
      const flags = await featureFlagsService.getAllFlags()
      const fullFlag = flags.find(f => f.key === key)
      if (fullFlag) {
        setFlag(fullFlag)
      }
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to fetch feature flag'))
      setEnabled(fallback)
    } finally {
      setIsLoading(false)
    }
  }, [key, fallback])

  useEffect(() => {
    if (revalidateOnMount) {
      fetchFlag()
    }
  }, [fetchFlag, revalidateOnMount])

  return {
    enabled,
    flag,
    isLoading,
    error,
    refetch: fetchFlag
  }
}

/**
 * 批量获取特性开关 Hook
 */
export function useFeatureFlags(keys: string[]) {
  const [flags, setFlags] = useState<Map<string, boolean>>(new Map())
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchFlags = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const allFlags = await featureFlagsService.getAllFlags()
        const flagMap = new Map<string, boolean>()

        keys.forEach(key => {
          const flag = allFlags.find(f => f.key === key)
          flagMap.set(key, flag?.enabled ?? false)
        })

        setFlags(flagMap)
      } catch (e) {
        setError(e instanceof Error ? e : new Error('Failed to fetch feature flags'))
        // Set defaults on error
        const defaultMap = new Map<string, boolean>()
        keys.forEach(key => defaultMap.set(key, false))
        setFlags(defaultMap)
      } finally {
        setIsLoading(false)
      }
    }

    if (keys.length > 0) {
      fetchFlags()
    }
  }, [keys.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps

  const getFlag = useCallback((key: string): boolean => {
    return flags.get(key) ?? false
  }, [flags])

  return {
    flags,
    getFlag,
    isLoading,
    error
  }
}

/**
 * 刷新所有特性开关缓存
 */
export function useRefreshFeatureFlags() {
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false)

  const refresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      featureFlagsService.clearCache()
      await featureFlagsService.getAllFlags()
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  return { refresh, isRefreshing }
}
