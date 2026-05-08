import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDreamStore } from '../hooks/useDreamStore'

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

describe('Auth Integration', () => {
  beforeEach(() => {
    // Reset store state before each test
    useDreamStore.getState().logout()
    localStorage.clear()
  })

  it('should handle login flow', async () => {
    const { result } = renderHook(() => useDreamStore())

    // Initially not logged in
    expect(result.current.user).toBeNull()
    expect(result.current.token).toBeNull()

    // Simulate login - normally this would call authApi.login
    // For integration test, we directly test store behavior
    const mockUser = {
      id: 'user_123',
      openid: 'openid_123',
      nickname: '测试用户',
      avatar: null,
      points: 100,
      isMember: false,
    }

    act(() => {
      useDreamStore.getState().setUser(mockUser, 'test_token_abc123')
    })

    expect(result.current.user).toEqual(mockUser)
    expect(result.current.token).toBe('test_token_abc123')
  })

  it('should persist auth state across store instances', () => {
    // Set user in one "instance"
    const mockUser = {
      id: 'user_456',
      openid: 'openid_456',
      nickname: '另一个用户',
      avatar: null,
      points: 50,
      isMember: true,
    }

    useDreamStore.getState().setUser(mockUser, 'token_456')

    // Create new "instance" - with Zustand, state is shared
    const newResult = renderHook(() => useDreamStore())
    expect(newResult.result.current.user).toEqual(mockUser)
  })

  it('should clear state on logout', () => {
    const mockUser = {
      id: 'user_789',
      openid: 'openid_789',
      nickname: '登出用户',
      avatar: null,
      points: 0,
      isMember: false,
    }

    act(() => {
      useDreamStore.getState().setUser(mockUser, 'token_789')
    })

    act(() => {
      useDreamStore.getState().logout()
    })

    const result = renderHook(() => useDreamStore())
    expect(result.result.current.user).toBeNull()
    expect(result.result.current.token).toBeNull()
  })
})
