/**
 * Centralized authentication utilities
 * All auth-related helpers should be placed here for easy maintenance
 */

import { storage } from '../services/storageService'

const TOKEN_COOKIE_NAME = 'access_token'
const REFRESH_TOKEN_KEY = 'refresh_token'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1'

/**
 * Verify token validity by calling backend API
 * Returns true if token is valid, false otherwise
 * Uses httpOnly cookie for auth, so credentials: 'include' is needed
 */
export async function verifyToken(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      method: 'GET',
      credentials: 'include'
    })
    return res.ok
  } catch {
    return false
  }
}

/**
 * Check if a valid authentication token exists
 * Uses localStorage flag as a quick check, but actual validation is done by verifyToken()
 * This is kept for backward compatibility where async can't be used.
 * For accurate results, use verifyToken() instead.
 */
export function hasValidToken(): boolean {
  return localStorage.getItem('yeelin_login_state') === '1'
}

/**
 * Mark user as logged in (called after successful login)
 */
export function markLogin(): void {
  localStorage.setItem('yeelin_login_state', '1')
}

/**
 * Mark user as logged out (called on logout)
 */
export function markLogout(): void {
  localStorage.removeItem('yeelin_login_state')
}

/**
 * Get the auth token value from Cookie
 * Returns null if token doesn't exist
 */
export function getAuthToken(): string | null {
  const cookies = document.cookie.split(';')
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=')
    if (name === TOKEN_COOKIE_NAME) {
      return decodeURIComponent(value)
    }
  }
  return null
}

/**
 * Set the auth token as Cookie
 */
export function setAuthToken(token: string, maxAgeDays = 7): void {
  document.cookie = `${TOKEN_COOKIE_NAME}=${encodeURIComponent(token)}; path=/; max-age=${maxAgeDays * 24 * 60 * 60}; samesite=lax`
}

/**
 * Clear the auth token Cookie
 */
export function clearAuthToken(): void {
  document.cookie = `${TOKEN_COOKIE_NAME}=; path=/; max-age=0`
}

/**
 * Get the refresh token from storage service
 */
export function getRefreshToken(): string | null {
  return storage.get(REFRESH_TOKEN_KEY)
}

/**
 * Set the refresh token (immediate write for critical auth data)
 */
export function setRefreshToken(token: string): void {
  storage.setImmediate(REFRESH_TOKEN_KEY, token)
}

/**
 * Clear the refresh token
 */
export function clearRefreshToken(): void {
  storage.remove(REFRESH_TOKEN_KEY)
}
