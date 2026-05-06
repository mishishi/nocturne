import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useDreamWallContext, storeDreamWallContext, clearDreamWallContext } from './useDreamWallContext'

// Mock useLocation
const mockLocation = {
  pathname: '/wall',
  search: '',
  hash: '',
  state: null as any,
  key: 'default'
}

vi.mock('react-router-dom', () => ({
  useLocation: () => mockLocation,
}))

describe('useDreamWallContext', () => {
  beforeEach(() => {
    // Clear sessionStorage before each test
    sessionStorage.clear()
    mockLocation.state = null
  })

  describe('storeDreamWallContext', () => {
    it('should store context in sessionStorage', () => {
      const ctx = {
        fromDreamWall: true,
        sessionId: 'session_123',
        storyTitle: 'Test Story',
        storyFull: 'Full story content',
        authorOpenid: 'user_123',
        postId: 'post_456',
        dreamSnippet: 'Test dream snippet',
      }

      storeDreamWallContext(ctx)
      const stored = sessionStorage.getItem('dreamwall_context')
      expect(stored).toBeTruthy()
      expect(JSON.parse(stored!)).toEqual(ctx)
    })
  })

  describe('clearDreamWallContext', () => {
    it('should remove context from sessionStorage', () => {
      const ctx = {
        fromDreamWall: true,
        sessionId: 'session_123',
        storyTitle: 'Test Story',
        storyFull: null,
        authorOpenid: null,
        postId: null,
        dreamSnippet: null,
      }

      storeDreamWallContext(ctx)
      clearDreamWallContext()
      const stored = sessionStorage.getItem('dreamwall_context')
      expect(stored).toBeNull()
    })
  })

  describe('useDreamWallContext - without location state', () => {
    it('should return default context when no location state and no sessionStorage', () => {
      mockLocation.state = null

      const { result } = renderHook(() => useDreamWallContext())

      expect(result.current).toEqual({
        fromDreamWall: false,
        sessionId: null,
        storyTitle: null,
        storyFull: null,
        authorOpenid: null,
        postId: null,
        dreamSnippet: null,
      })
    })

    it('should return context from sessionStorage when location state is missing', () => {
      mockLocation.state = null
      const ctx = {
        fromDreamWall: true,
        sessionId: 'session_789',
        storyTitle: 'Stored Story',
        storyFull: 'Stored content',
        authorOpenid: 'user_789',
        postId: 'post_789',
        dreamSnippet: 'Stored dream snippet',
      }
      storeDreamWallContext(ctx)

      const { result } = renderHook(() => useDreamWallContext())

      expect(result.current).toEqual(ctx)
    })
  })

  describe('useDreamWallContext - with location state', () => {
    it('should prioritize location state over sessionStorage', () => {
      const locationCtx = {
        fromDreamWall: true,
        sessionId: 'session_from_location',
        storyTitle: 'From Location',
        storyFull: 'Location content',
        authorOpenid: 'user_location',
        postId: 'post_location',
        dreamSnippet: 'Location dream snippet',
      }
      mockLocation.state = locationCtx

      // Also set sessionStorage with different data
      storeDreamWallContext({
        fromDreamWall: true,
        sessionId: 'session_from_storage',
        storyTitle: 'From Storage',
        storyFull: 'Storage content',
        authorOpenid: 'user_storage',
        postId: 'post_storage',
        dreamSnippet: 'Storage dream snippet',
      })

      const { result } = renderHook(() => useDreamWallContext())

      expect(result.current.sessionId).toBe('session_from_location')
      expect(result.current.storyTitle).toBe('From Location')
    })

    it('should return context from location state with all fields', () => {
      mockLocation.state = {
        fromDreamWall: true,
        sessionId: 'session_123',
        storyTitle: 'My Dream Story',
        storyFull: 'Once upon a time...',
        authorOpenid: 'author_456',
        postId: 'post_789',
        dreamSnippet: 'My dream snippet',
      }

      const { result } = renderHook(() => useDreamWallContext())

      expect(result.current).toEqual({
        fromDreamWall: true,
        sessionId: 'session_123',
        storyTitle: 'My Dream Story',
        storyFull: 'Once upon a time...',
        authorOpenid: 'author_456',
        postId: 'post_789',
        dreamSnippet: 'My dream snippet',
      })
    })

    it('should handle partial location state with nulls', () => {
      mockLocation.state = {
        fromDreamWall: true,
        sessionId: 'session_123',
        dreamSnippet: null,
        // storyTitle and storyFull intentionally missing
      }

      const { result } = renderHook(() => useDreamWallContext())

      expect(result.current).toEqual({
        fromDreamWall: true,
        sessionId: 'session_123',
        storyTitle: null,
        storyFull: null,
        authorOpenid: null,
        postId: null,
        dreamSnippet: null,
      })
    })
  })

  describe('error handling', () => {
    it('should handle malformed JSON in sessionStorage gracefully', () => {
      mockLocation.state = null
      sessionStorage.setItem('dreamwall_context', 'invalid-json{')

      const { result } = renderHook(() => useDreamWallContext())

      expect(result.current.fromDreamWall).toBe(false)
      expect(result.current.sessionId).toBeNull()
    })
  })
})
