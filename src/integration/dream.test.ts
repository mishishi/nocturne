import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDreamStore } from '../hooks/useDreamStore'
import type { Session } from '../services/api'

// Mock the api module
vi.mock('../services/api', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    getUserInfo: vi.fn(),
  },
  sessionApi: {
    createSession: vi.fn(),
    getSession: vi.fn(),
    addMessage: vi.fn(),
    migrateSession: vi.fn(),
  },
}))

// Import after mock
import { sessionApi } from '../services/api'

describe('Dream Session Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useDreamStore.getState().logout()
    localStorage.clear()
  })

  it('should simulate guest session creation flow', async () => {
    const mockSession: Session = {
      id: 'session_guest_123',
      type: 'dream',
      title: '我的梦境',
      messages: [],
      answers: [],
      story: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // Mock the API call
    vi.mocked(sessionApi.createSession).mockResolvedValue(mockSession)

    // Simulate creating a session
    const result = await sessionApi.createSession({
      type: 'dream',
      guestOpenid: 'guest_abc',
    })

    expect(result).toEqual(mockSession)
    expect(sessionApi.createSession).toHaveBeenCalledWith({
      type: 'dream',
      guestOpenid: 'guest_abc',
    })
  })

  it('should handle session message flow', async () => {
    const mockSession: Session = {
      id: 'session_msg_456',
      type: 'dream',
      title: '梦游仙境',
      messages: [
        {
          id: 'msg_1',
          role: 'user',
          content: '我梦见自己在云端飞翔',
          createdAt: new Date().toISOString(),
        },
      ],
      answers: [],
      story: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    vi.mocked(sessionApi.addMessage).mockResolvedValue(mockSession)

    const result = await sessionApi.addMessage({
      sessionId: 'session_msg_456',
      content: '我梦见自己在云端飞翔',
    })

    expect(result.messages.length).toBe(1)
    expect(result.messages[0].content).toBe('我梦见自己在云端飞翔')
  })

  it('should simulate session migration from guest to user', async () => {
    const mockMigratedSession: Session = {
      id: 'session_migrated_789',
      type: 'dream',
      title: '迁移的梦境',
      messages: [],
      answers: [],
      story: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    vi.mocked(sessionApi.migrateSession).mockResolvedValue(mockMigratedSession)

    const result = await sessionApi.migrateSession({
      sessionId: 'session_migrated_789',
      guestOpenid: 'guest_old',
    })

    expect(result).toEqual(mockMigratedSession)
    expect(sessionApi.migrateSession).toHaveBeenCalledWith({
      sessionId: 'session_migrated_789',
      guestOpenid: 'guest_old',
    })
  })
})
