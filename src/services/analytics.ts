/**
 * Analytics Service
 * 埋点分析服务 - 基于自托管 Umami
 */

export interface AnalyticsEvent {
  name: string
  data?: Record<string, string | number | boolean>
}

export interface PageViewPayload {
  url: string
  title?: string
  referrer?: string
}

class AnalyticsService {
  private endpoint: string = ''
  private websiteId: string = ''
  private isEnabled: boolean = false
  private queue: AnalyticsEvent[] = []
  private readonly QUEUE_LIMIT = 10
  private readonly STORAGE_KEY = 'nocturne_analytics_queue'

  constructor() {
    this.loadFromStorage()
  }

  /**
   * 配置分析服务
   */
  configure(options: { endpoint: string; websiteId: string }) {
    this.endpoint = options.endpoint.replace(/\/$/, '')
    this.websiteId = options.websiteId
    this.isEnabled = !!this.endpoint && !!this.websiteId
    console.log(`[Analytics] Configured: ${this.isEnabled ? 'enabled' : 'disabled'}`)
  }

  /**
   * 发送 Pageview
   */
  trackPageView(payload: PageViewPayload) {
    if (!this.isEnabled) return

    const data = {
      url: payload.url,
      title: payload.title || '',
      referrer: payload.referrer || ''
    }

    this.sendToUmami('pageview', data)
  }

  /**
   * 发送事件
   */
  trackEvent(name: string, data?: Record<string, string | number | boolean>) {
    if (!this.isEnabled) return

    this.sendToUmami(name, data || {})
  }

  /**
   * 发送数据到 Umami
   */
  private sendToUmami(name: string, data: Record<string, string | number | boolean>) {
    // 添加到队列
    this.queue.push({ name, data })
    this.saveToStorage()

    // 如果队列超过限制，先刷新
    if (this.queue.length >= this.QUEUE_LIMIT) {
      this.flush()
      return
    }

    // 延迟发送，批量处理
    setTimeout(() => {
      this.flush()
    }, 1000)
  }

  /**
   * 刷新队列，发送所有事件
   */
  async flush() {
    if (!this.isEnabled || this.queue.length === 0) return

    const eventsToSend = [...this.queue]
    this.queue = []
    this.saveToStorage()

    for (const event of eventsToSend) {
      try {
        await this.sendEvent(event.name, event.data || {})
      } catch (error) {
        // 发送失败，重新加入队列
        this.queue.push(event)
        this.saveToStorage()
        console.error('[Analytics] Failed to send event:', error)
        break
      }
    }
  }

  /**
   * 实际发送事件到 Umami
   */
  private async sendEvent(
    name: string,
    data: Record<string, string | number | boolean>
  ): Promise<void> {
    const payload = {
      website: this.websiteId,
      name,
      data
    }

    await fetch(`${this.endpoint}/api/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
  }

  /**
   * 获取当前页面路径
   */
  getCurrentPath(): string {
    return window.location.pathname + window.location.search
  }

  /**
   * 获取当前页面标题
   */
  getCurrentTitle(): string {
    return document.title || ''
  }

  /**
   * 保存队列到 localStorage
   */
  private saveToStorage() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.queue.slice(-this.QUEUE_LIMIT)))
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * 从 localStorage 恢复队列
   */
  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (stored) {
        this.queue = JSON.parse(stored)
      }
    } catch {
      this.queue = []
    }
  }
}

export const analyticsService = new AnalyticsService()

// 预设事件名称
export const AnalyticsEvents = {
  // 页面相关
  PAGE_VIEW: 'page_view',

  // 梦境相关
  DREAM_CREATED: 'dream_created',
  STORY_GENERATED: 'story_generated',
  STORY_SHARED: 'story_shared',

  // 梦墙相关
  WALL_POST_PUBLISHED: 'wall_post_published',
  WALL_POST_LIKED: 'wall_post_liked',
  WALL_POST_COMMENTED: 'wall_post_commented',
  WALL_POST_FAVORITED: 'wall_post_favorited',

  // 签到相关
  CHECK_IN_COMPLETED: 'check_in_completed',

  // 成就相关
  ACHIEVEMENT_UNLOCKED: 'achievement_unlocked',

  // 设置相关
  THEME_CHANGED: 'theme_changed',
  LANGUAGE_CHANGED: 'language_changed',

  // 用户相关
  LOGIN_COMPLETED: 'login_completed',
  LOGOUT_COMPLETED: 'logout_completed'
} as const

export type AnalyticsEventName = typeof AnalyticsEvents[keyof typeof AnalyticsEvents]
