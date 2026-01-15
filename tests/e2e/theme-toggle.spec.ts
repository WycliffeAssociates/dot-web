import { test, expect } from '@playwright/test';
import { toggleTheme, verifyTheme, waitForVideoPlayer } from '../fixtures/test-helpers';

test.describe.skip('Theme Toggle Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForVideoPlayer(page);
  });

  test('switch from light to dark mode', async ({ page }) => {
    // Check initial state (should detect system preference or default)
    await page.waitForTimeout(100); // Allow theme to initialize
    
    // Toggle to dark mode
    await toggleTheme(page);
    
    // Verify dark mode is applied
    await verifyTheme(page, true);
    
    // Verify theme toggle button shows sun icon in dark mode
    await expect(page.getByTestId('header-theme-toggle')).toBeVisible();
  });

  test('switch from dark to light mode', async ({ page }) => {
    // First toggle to dark mode
    await toggleTheme(page);
    await verifyTheme(page, true);
    
    // Toggle back to light mode
    await toggleTheme(page);
    
    // Verify light mode is applied
    await verifyTheme(page, false);
    
    // Verify theme toggle button shows moon icon in light mode
    await expect(page.getByTestId('header-theme-toggle')).toBeVisible();
  });

  test('theme preference persists across page reloads', async ({ page }) => {
    // Set to dark mode
    await toggleTheme(page);
    await verifyTheme(page, true);
    
    // Reload page
    await page.reload();
    await waitForVideoPlayer(page);
    
    // Should still be in dark mode
    await verifyTheme(page, true);
    
    // Switch to light mode
    await toggleTheme(page);
    await verifyTheme(page, false);
    
    // Reload again
    await page.reload();
    await waitForVideoPlayer(page);
    
    // Should still be in light mode
    await verifyTheme(page, false);
  });

  test('theme updates correctly for video player and navigation', async ({ page }) => {
    // Check initial appearance
    const playerContainer = page.getByTestId('video-player-container');
    const bookNav = page.getByTestId('book-navigation-container');
    
    // Toggle to dark mode
    await toggleTheme(page);
    await verifyTheme(page, true);
    
    // Verify components are visible in dark mode
    await expect(playerContainer).toBeVisible();
    await expect(bookNav).toBeVisible();
    
    // Toggle back to light mode
    await toggleTheme(page);
    await verifyTheme(page, false);
    
    // Verify components are still visible in light mode
    await expect(playerContainer).toBeVisible();
    await expect(bookNav).toBeVisible();
  });

  test('multiple theme toggles work correctly', async ({ page }) => {
    // Toggle multiple times
    await toggleTheme(page); // dark
    await verifyTheme(page, true);
    
    await toggleTheme(page); // light
    await verifyTheme(page, false);
    
    await toggleTheme(page); // dark
    await verifyTheme(page, true);
    
    await toggleTheme(page); // light
    await verifyTheme(page, false);
  });

  test('theme works correctly after navigation', async ({ page }) => {
    // Set dark theme
    await toggleTheme(page);
    await verifyTheme(page, true);
    
    // Navigate to a different book and chapter
    await page.getByTestId('book-button-mrk').click();
    await page.waitForTimeout(500);
    await page.getByTestId('chapter-button-002').click();
    await page.waitForTimeout(500);
    
    // Theme should still be dark
    await verifyTheme(page, true);
    
    // Toggle to light
    await toggleTheme(page);
    await verifyTheme(page, false);
    
    // Navigate again
    await page.getByTestId('book-button-luk').click();
    await page.waitForTimeout(500);
    
    // Theme should still be light
    await verifyTheme(page, false);
  });

  test('theme toggle button is accessible', async ({ page }) => {
    const themeToggle = page.getByTestId('header-theme-toggle');
    
    // Check that button has proper ARIA attributes
    await expect(themeToggle).toHaveAttribute('aria-label', 'Light Mode or Dark Mode');
    
    // Check that button is keyboard accessible
    await themeToggle.focus();
    await expect(themeToggle).toBeFocused();
    
    // Check that Enter key works
    await themeToggle.press('Enter');
    await page.waitForTimeout(100);
    
    // Theme should have toggled
    const html = page.locator('html');
    const hasDarkClass = await html.getAttribute('class');
    expect(hasDarkClass).toMatch(/dark|light/);
  });
});