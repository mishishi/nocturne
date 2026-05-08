import { useEffect, useCallback, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { analyticsService, AnalyticsEventName, PageViewPayload } from '../services/analytics'

/**
 * 页面浏览追踪 Hook
 * 自动追踪路由变化
 */
export function usePageTracking() {
  const location = useLocation()
  const previousPath = useRef<string>('')

  useEffect(() => {
    const payload: PageViewPayload = {
      url: location.pathname + location.search,
      title: document.title,
      referrer: previousPath.current || '/'
    }

    analyticsService.trackPageView(payload)
    previousPath.current = payload.url
  }, [location])
}

/**
 * 事件追踪 Hook
 */
export function useAnalytics() {
  /**
   * 追踪事件
   */
  const track = useCallback((
    event: AnalyticsEventName,
    data?: Record<string, string | number | boolean>
  ) => {
    analyticsService.trackEvent(event, data)
  }, [])

  /**
   * 追踪页面浏览
   */
  const trackPageView = useCallback((payload?: PageViewPayload) => {
    analyticsService.trackPageView({
      url: payload?.url || analyticsService.getCurrentPath(),
      title: payload?.title || analyticsService.getCurrentTitle()
    })
  }, [])

  return {
    track,
    trackPageView
  }
}

/**
 * 刷新分析数据（发送队列中待发的事件）
 */
export function useAnalyticsFlush() {
  const flush = useCallback(() => {
    return analyticsService.flush()
  }, [])

  return { flush }
}

/**
 * 页面离开时刷新分析数据
 */
export function usePageTrackingOnUnmount() {
  useEffect(() => {
    const handleBeforeUnload = () => {
      analyticsService.flush()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      analyticsService.flush()
    }
  }, [])
}
