import { useState, useEffect, useCallback } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { pushApi } from '../services/api'

interface PushNotificationState {
  permission: NotificationPermission | 'unsupported' | 'unknown'
  subscription: PushSubscription | null
  reminderEnabled: boolean
  reminderTime: string // HH:mm format
  isSubscribed: boolean
}

interface PushNotificationActions {
  setPermission: (permission: NotificationPermission | 'unsupported' | 'unknown') => void
  setSubscription: (subscription: PushSubscription | null) => void
  setReminderEnabled: (enabled: boolean) => void
  setReminderTime: (time: string) => void
}

type PushNotificationStore = PushNotificationState & PushNotificationActions

export const usePushNotificationStore = create<PushNotificationStore>()(
  persist(
    (set) => ({
      permission: 'unknown',
      subscription: null,
      reminderEnabled: false,
      reminderTime: '22:00',
      isSubscribed: false,

      setPermission: (permission) => set({ permission }),
      setSubscription: (subscription) => set({ subscription, isSubscribed: !!subscription }),
      setReminderEnabled: (enabled) => set({ reminderEnabled: enabled }),
      setReminderTime: (time) => set({ reminderTime: time }),
    }),
    {
      name: 'yeelin-push-storage',
    }
  )
)

// VAPID public key - should match server-side key
const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function usePushNotification() {
  const {
    permission,
    subscription,
    reminderEnabled,
    reminderTime,
    isSubscribed,
    setPermission,
    setSubscription,
    setReminderEnabled,
    setReminderTime,
  } = usePushNotificationStore()

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check if service worker and push are supported
  const isSupported = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window

  // Initialize permission and subscription status
  useEffect(() => {
    if (!isSupported) {
      setPermission('unsupported')
      return
    }

    // Check current permission
    if (Notification.permission) {
      setPermission(Notification.permission)
    }

    // Check existing subscription
    const checkSubscription = async () => {
      try {
        const registration = await navigator.serviceWorker.ready
        const existingSubscription = await registration.pushManager.getSubscription()
        setSubscription(existingSubscription)
      } catch (e) {
        console.error('[Push] Error checking subscription:', e)
      }
    }

    checkSubscription()
  }, [isSupported, setPermission, setSubscription])

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError('您的浏览器不支持推送通知')
      return false
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await Notification.requestPermission()
      setPermission(result)

      if (result === 'granted') {
        return true
      } else {
        setError('您已拒绝通知权限')
        return false
      }
    } catch (e) {
      console.error('[Push] Error requesting permission:', e)
      setError('请求权限失败')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [isSupported, setPermission])

  // Subscribe to push notifications
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError('您的浏览器不支持推送通知')
      return false
    }

    if (Notification.permission !== 'granted') {
      const granted = await requestPermission()
      if (!granted) return false
    }

    setIsLoading(true)
    setError(null)

    try {
      const registration = await navigator.serviceWorker.ready

      const pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      // Send subscription to server
      const result = await pushApi.subscribe(pushSubscription.toJSON())

      if (!result.success) {
        throw new Error('Failed to send subscription to server')
      }

      setSubscription(pushSubscription)
      return true
    } catch (e) {
      console.error('[Push] Error subscribing:', e)
      setError('订阅推送通知失败')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [isSupported, requestPermission, setSubscription])

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!subscription) return true

    setIsLoading(true)
    setError(null)

    try {
      // Get endpoint to send unsubscribe request
      const endpoint = subscription.endpoint

      // Tell server to delete subscription
      await pushApi.unsubscribe(endpoint)

      // Unsubscribe from push manager
      await subscription.unsubscribe()

      setSubscription(null)
      return true
    } catch (e) {
      console.error('[Push] Error unsubscribing:', e)
      setError('取消订阅失败')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [subscription, setSubscription])

  // Toggle reminder
  const toggleReminder = useCallback(async (enabled: boolean) => {
    setReminderEnabled(enabled)

    if (enabled) {
      // Schedule the reminder notification
      await scheduleReminder(reminderTime)
    } else {
      // Cancel the scheduled reminder
      await cancelReminder()
    }
  }, [reminderTime, setReminderEnabled])

  // Set reminder time
  const updateReminderTime = useCallback(async (time: string) => {
    setReminderTime(time)

    if (reminderEnabled) {
      // Reschedule with new time
      await scheduleReminder(time)
    }
  }, [reminderEnabled, setReminderTime])

  // Schedule a daily reminder notification
  const scheduleReminder = useCallback(async (time: string): Promise<boolean> => {
    if (!isSupported) return false

    try {
      const registration = await navigator.serviceWorker.ready

      // Store reminder config in service worker
      registration.active?.postMessage({
        type: 'SCHEDULE_REMINDER',
        data: {
          enabled: true,
          time: time,
        },
      })

      return true
    } catch (e) {
      console.error('[Push] Error scheduling reminder:', e)
      return false
    }
  }, [isSupported])

  // Cancel scheduled reminder
  const cancelReminder = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false

    try {
      const registration = await navigator.serviceWorker.ready

      registration.active?.postMessage({
        type: 'CANCEL_REMINDER',
      })

      return true
    } catch (e) {
      console.error('[Push] Error canceling reminder:', e)
      return false
    }
  }, [isSupported])

  // Send a test notification (for debugging)
  const sendTestNotification = useCallback(async (): Promise<boolean> => {
    if (!isSubscribed) {
      setError('请先订阅推送通知')
      return false
    }

    try {
      const result = await pushApi.sendTest()
      return result.success
    } catch (e) {
      console.error('[Push] Error sending test notification:', e)
      setError('发送测试通知失败')
      return false
    }
  }, [isSubscribed])

  return {
    permission,
    subscription,
    reminderEnabled,
    reminderTime,
    isSubscribed,
    isSupported,
    isLoading,
    error,
    requestPermission,
    subscribe,
    unsubscribe,
    toggleReminder,
    updateReminderTime,
    sendTestNotification,
  }
}
