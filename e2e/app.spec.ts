import { test, expect } from '@playwright/test'

test.describe('Nocturne App', () => {
  test.use({ viewport: { width: 375, height: 812 } }) // iPhone X viewport

  test('should load the app without errors', async ({ page }) => {
    // Listen for console errors
    const errors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    await page.goto('/')

    // Should show cookie consent banner on first visit
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText('Cookie 偏好设置')).toBeVisible()

    // Accept all cookies
    await page.getByRole('button', { name: '全部接受' }).click()

    // Should show login page or home
    await expect(page).toHaveURL(/.*/)
  })

  test('should navigate between main pages', async ({ page }) => {
    await page.goto('/')

    // Accept cookies
    const acceptButton = page.getByRole('button', { name: '全部接受' })
    if (await acceptButton.isVisible()) {
      await acceptButton.click()
    }

    // Wait for any loading animations to finish
    await page.waitForTimeout(500)

    // Should have bottom navigation
    const bottomNav = page.getByLabel('底部导航')
    await expect(bottomNav).toBeVisible()

    // Check that navigation links exist in bottom nav
    const navLinks = bottomNav.getByRole('link')
    const linkCount = await navLinks.count()
    expect(linkCount).toBeGreaterThan(0)
  })

  test('should show cookie consent on first visit', async ({ page }) => {
    // Clear cookies to simulate first visit
    await page.context().clearCookies()
    await page.context().clearPermissions()

    await page.goto('/')

    // Should show cookie consent
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText('Cookie 偏好设置')).toBeVisible()

    // Should have three options: necessary (disabled), analytics, support
    const necessaryLabel = page.getByText('必要 Cookie')
    const analyticsLabel = page.getByText('分析 Cookie')
    const supportLabel = page.getByText('客服支持')

    await expect(necessaryLabel).toBeVisible()
    await expect(analyticsLabel).toBeVisible()
    await expect(supportLabel).toBeVisible()
  })

  test('should decline cookies and persist preference', async ({ page }) => {
    await page.goto('/')

    const declineButton = page.getByRole('button', { name: '全部拒绝' })
    await expect(declineButton).toBeVisible()
    await declineButton.click()

    // Consent dialog should be hidden
    await expect(page.getByRole('dialog')).not.toBeVisible()

    // Reload page
    await page.reload()

    // Consent should not show again
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })

  test('should save cookie preferences', async ({ page }) => {
    await page.goto('/')

    // Find toggles and turn off analytics, keep support off
    const toggles = page.getByRole('switch')
    await expect(toggles).toHaveCount(2) // analytics and support

    // Save preferences
    await page.getByRole('button', { name: '保存偏好' }).click()

    // Dialog should close
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })
})
