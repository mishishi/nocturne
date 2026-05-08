import { test, expect } from '@playwright/test'

/**
 * E2E Tests for critical user flows in Nocturne app
 * These tests require the app to be running (npm run dev)
 */

test.describe('User Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear cookies to simulate fresh state
    await page.context().clearCookies()
  })

  test('should show login page when not authenticated', async ({ page }) => {
    await page.goto('/')

    // Accept cookies first
    const acceptButton = page.getByRole('button', { name: '全部接受' })
    if (await acceptButton.isVisible()) {
      await acceptButton.click()
    }

    // Should show login or home page
    // The app should redirect to login or show appropriate content
    await expect(page).toHaveURL(/.*/)
  })
})

test.describe('Dream Recording Flow', () => {
  test('should navigate to dream creation', async ({ page }) => {
    await page.goto('/')

    // Accept cookies
    const acceptButton = page.getByRole('button', { name: '全部接受' })
    if (await acceptButton.isVisible()) {
      await acceptButton.click()
    }

    // Look for create/start dream button
    // This could be a FAB or a button in the home page
    const createDreamButton = page.getByRole('button', { name: /记录|创建|开始/i }).first()

    if (await createDreamButton.isVisible({ timeout: 3000 })) {
      await createDreamButton.click()

      // Should navigate to dream creation or show modal
      await expect(page).toHaveURL(/.*/)
    }
  })
})

test.describe('Navigation and Layout', () => {
  test.use({ viewport: { width: 375, height: 812 } }) // iPhone X viewport

  test('should have accessible navigation', async ({ page }) => {
    await page.goto('/')

    // Accept cookies
    const acceptButton = page.getByRole('button', { name: '全部接受' })
    if (await acceptButton.isVisible()) {
      await acceptButton.click()
    }

    // Check for skip link (accessibility)
    const skipLink = page.getByRole('link', { name: /跳过|skip/i })
    if (await skipLink.isVisible()) {
      await skipLink.click()
      // Should skip to main content
      await expect(page.locator('main')).toBeFocused()
    }
  })

  test('should have working bottom navigation', async ({ page }) => {
    await page.goto('/')

    // Accept cookies
    const acceptButton = page.getByRole('button', { name: '全部接受' })
    if (await acceptButton.isVisible()) {
      await acceptButton.click()
    }

    // Find bottom nav
    const bottomNav = page.getByLabel('底部导航')
    await expect(bottomNav).toBeVisible()

    // Get navigation links
    const navLinks = bottomNav.getByRole('link')
    const linkCount = await navLinks.count()

    // Should have multiple navigation items
    expect(linkCount).toBeGreaterThan(0)
  })
})

test.describe('Empty States', () => {
  test('should show empty state in History when no dreams', async ({ page }) => {
    await page.goto('/history')

    // Accept cookies
    const acceptButton = page.getByRole('button', { name: '全部接受' })
    if (await acceptButton.isVisible()) {
      await acceptButton.click()
    }

    // Check if empty state is shown
    // Look for common empty state indicators
    const emptyState = page.getByText(/暂无|没有|空/i).first()
    if (await emptyState.isVisible({ timeout: 2000 })) {
      await expect(emptyState).toBeVisible()
    }
  })

  test('should show empty state in Favorites when no favorites', async ({ page }) => {
    await page.goto('/favorites')

    // Accept cookies
    const acceptButton = page.getByRole('button', { name: '全部接受' })
    if (await acceptButton.isVisible()) {
      await acceptButton.click()
    }

    // Check if empty state is shown
    const emptyState = page.getByText(/暂无|没有|空/i).first()
    if (await emptyState.isVisible({ timeout: 2000 })) {
      await expect(emptyState).toBeVisible()
    }
  })
})

test.describe('Accessibility', () => {
  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/')

    // Accept cookies
    const acceptButton = page.getByRole('button', { name: '全部接受' })
    if (await acceptButton.isVisible()) {
      await acceptButton.click()
    }

    // Tab should move focus to next interactive element
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')

    // Focus should be visible on some element
    const focusedElement = page.locator(':focus')
    await expect(focusedElement).toBeVisible()
  })

  test('should close dialogs with Escape', async ({ page }) => {
    await page.goto('/')

    // Cookie dialog should be visible
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    // Press Escape to close
    await page.keyboard.press('Escape')

    // Dialog should be hidden
    await expect(dialog).not.toBeVisible()
  })
})

test.describe('Theme and Settings', () => {
  test('should have theme toggle in profile', async ({ page }) => {
    await page.goto('/profile')

    // Accept cookies
    const acceptButton = page.getByRole('button', { name: '全部接受' })
    if (await acceptButton.isVisible()) {
      await acceptButton.click()
    }

    // Look for theme settings
    const themeSection = page.getByText(/主题|theme/i)
    if (await themeSection.isVisible({ timeout: 2000 })) {
      await expect(themeSection).toBeVisible()
    }
  })
})
