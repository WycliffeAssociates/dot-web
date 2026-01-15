import { test, expect } from '@playwright/test';
import { waitForVideoPlayer, checkNoConsoleErrors } from '../fixtures/test-helpers';

test.describe('Page Load Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Setup console error checking
    await checkNoConsoleErrors(page);
  });

  test('home page renders successfully', async ({ page }) => {
    await page.goto('/');
    
    // Check page title
    await expect(page).toHaveTitle(/DOT/);
    
    // Wait for video player to load
    await waitForVideoPlayer(page);
    
    // Check that main elements are visible
    await expect(page.getByTestId('header-logo')).toBeVisible();
    await expect(page.getByTestId('header-theme-toggle')).toBeVisible();
    await expect(page.getByTestId('header-menu-toggle')).toBeVisible();
    await expect(page.getByTestId('video-player-container')).toBeVisible();
    await expect(page.getByTestId('book-navigation-container')).toBeVisible();
    await expect(page.getByTestId('chapter-list-container')).toBeVisible();
  });

  test('video list loads from Brightcove API', async ({ page }) => {
    await page.goto('/');
    
    // Wait for video player and book list to load
    await waitForVideoPlayer(page);
    await page.getByTestId('book-navigation-container').waitFor({ state: 'visible' });
    
    // Check that multiple books are loaded
    const bookButtons = page.getByTestId(/^book-button-/);
    await expect(bookButtons).toHaveCount(27); // 27 books in New Testament
    
    // Check that chapters are loaded for the default book
    const chapterButtons = page.getByTestId(/^chapter-button-/);
    await expect(chapterButtons.first()).toBeVisible();
  });

  test('no console errors on page load', async ({ page }) => {
    await page.goto('/');
    
    // Check for any console errors during page load
    await checkNoConsoleErrors(page);
  });

  test('page loads with correct metadata', async ({ page }) => {
    await page.goto('/');
    
    // Check page structure
    await expect(page.locator('html')).toHaveAttribute('lang');
    await expect(page.locator('head meta[name="viewport"]')).toHaveAttribute('content', /width=device-width/);
  });

  test('responsive design works correctly', async ({ page }) => {
    await page.goto('/');
    
    // Test desktop view
    await page.setViewportSize({ width: 1200, height: 800 });
    await waitForVideoPlayer(page);
    await expect(page.getByTestId('video-player-container')).toBeVisible();
    
    // Test mobile view  
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone size
    await expect(page.getByTestId('video-player-container')).toBeVisible();
    await expect(page.getByTestId('header-menu-toggle')).toBeVisible();
  });
});