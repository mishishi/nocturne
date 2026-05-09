/**
 * Centralized authentication utilities
 * All auth-related helpers should be placed here for easy maintenance
 */

const TOKEN_COOKIE_NAME = 'access_token'
const REFRESH_TOKEN_KEY = 'refresh_token'

/**
 * Check if a valid authentication token exists in Cookie
 * Returns true only if token is present (not expired - browser handles expiry via max-age)
 */
export function hasValidToken(): boolean {
  return document.cookie.split(';').some(c => c.trim().startsWith(`${TOKEN_COOKIE_NAME}=`))
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
 * Get the refresh token from localStorage
 */
export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

/**
 * Set the refresh token in localStorage
 */
export function setRefreshToken(token: string): void {
  localStorage.setItem(REFRESH_TOKEN_KEY, token)
}

/**
 * Clear the refresh token from localStorage
 */
export function clearRefreshToken(): void {
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}
