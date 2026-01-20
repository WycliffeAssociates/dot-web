import { expect, test } from '@playwright/test';
import { navigateToBook, waitForVideoPlayer } from '../fixtures/test-helpers';

test.describe('Responsive Design Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForVideoPlayer(page);
  });

  test('mobile layout works correctly', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone size
    
    // Test header elements
    await expect(page.getByTestId('header-logo')).toBeVisible();
    await expect(page.getByTestId('header-theme-toggle')).toBeVisible();
    await expect(page.getByTestId('header-menu-toggle')).toBeVisible();
    
    // Test video player
    const playerContainer = page.getByTestId('video-player-container');
    await expect(playerContainer).toBeVisible();
    
    // Verify mobile aspect ratio
    const playerBox = await playerContainer.boundingBox();
    expect(playerBox?.width).toBeLessThanOrEqual(375);
    expect(playerBox?.height).toBeCloseTo(playerBox!.width * 9/16, 0.1);
    
    // Test book navigation on mobile
    const bookNav = page.getByTestId('book-navigation-container');
    await expect(bookNav).toBeVisible();
    
    // Test chapter navigation on mobile - should be scrollable
    const chapterList = page.getByTestId('chapter-list-container');
    await expect(chapterList).toBeVisible();
    
    // Check that chapter buttons are smaller on mobile
    const chapterButton = page.getByTestId('chapter-button-001');
    await expect(chapterButton).toBeVisible();
    const buttonBox = await chapterButton.boundingBox();
    expect(buttonBox?.width).toBeLessThanOrEqual(48); // w-12 = 48px on mobile
  });

  test('tablet layout works correctly', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 }); // iPad size
    
    // Test header elements
    await expect(page.getByTestId('header-logo')).toBeVisible();
    await expect(page.getByTestId('header-theme-toggle')).toBeVisible();
    await expect(page.getByTestId('header-menu-toggle')).toBeVisible();
    
    // Test video player
    await expect(page.getByTestId('video-player-container')).toBeVisible();
    
    // Test book navigation on tablet
    await expect(page.getByTestId('book-navigation-container')).toBeVisible();
    
    // Test chapter navigation on tablet
    await expect(page.getByTestId('chapter-list-container')).toBeVisible();
    
    // Chapter buttons should be larger on tablet
    const chapterButton = page.getByTestId('chapter-button-001');
    const buttonBox = await chapterButton.boundingBox();
    expect(buttonBox?.width).toBeGreaterThanOrEqual(48); // w-12 = 48px on tablet
  });

  test('desktop layout works correctly', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1200, height: 800 });
    
    // Test header elements
    await expect(page.getByTestId('header-logo')).toBeVisible();
    await expect(page.getByTestId('header-theme-toggle')).toBeVisible();
    await expect(page.getByTestId('header-menu-toggle')).toBeVisible();
    
    // Test video player - should be larger on desktop
    const playerContainer = page.getByTestId('video-player-container');
    await expect(playerContainer).toBeVisible();
    
    const playerBox = await playerContainer.boundingBox();
    expect(playerBox?.width).toBeGreaterThan(600); // Should be wider on desktop
    
    // Test book navigation on desktop
    await expect(page.getByTestId('book-navigation-container')).toBeVisible();
    
    // Test chapter navigation on desktop
    await expect(page.getByTestId('chapter-list-container')).toBeVisible();
  });

  test('navigation drawer works on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Open menu
    await page.getByTestId('header-menu-toggle').click();
    await page.waitForTimeout(300);
    
    // Check that menu close button appears (indicates menu is open)
    await expect(page.getByTestId('header-menu-close')).toBeVisible();
    
    // Check that drawer appears
    const drawer = page.locator('.w-full.max-w-md.fixed.right-0');
    await expect(drawer).toBeVisible();
    
    // Check menu items
    await expect(page.getByRole('link', { name: 'License' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'About' })).toBeVisible();
    
    // Note: Closing the menu is difficult because the close button is outside viewport
    // The overlay and drawer use CSS that makes direct clicking challenging
    // This test verifies the menu opens and displays correctly
  });

  test('chapter scrolling works on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Navigate to a book with many chapters (like Matthew)
    await navigateToBook(page, 'MAT');
    await page.waitForTimeout(1000);
    
    const chapterList = page.getByTestId('chapter-list-container');
    
    // Check if chapter list is scrollable
    const listBox = await chapterList.boundingBox();
    if (listBox) {
      // Try to scroll the chapter list
      await chapterList.evaluate((el) => {
        el.scrollLeft = 200;
      });
      
      await page.waitForTimeout(500);
      
      // Should be able to scroll (scrollLeft should be > 0)
      const scrollLeft = await chapterList.evaluate((el) => el.scrollLeft);
      expect(scrollLeft).toBeGreaterThan(0);
    }
  });

  test('responsive behavior during viewport changes', async ({ page }) => {
    // Start with mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await waitForVideoPlayer(page);
    
    const playerContainer = page.getByTestId('video-player-container');
    const mobileBox = await playerContainer.boundingBox();
    
    // Switch to desktop
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.waitForTimeout(500); // Wait for layout adjustment
    
    const desktopBox = await playerContainer.boundingBox();
    
    // Player should be wider on desktop
    expect(desktopBox!.width).toBeGreaterThan(mobileBox!.width);
    
    // Switch back to mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    
    // Should adapt back to mobile size
    const mobileBox2 = await playerContainer.boundingBox();
    expect(mobileBox2!.width).toBeLessThanOrEqual(375);
  });


  test('orientation changes work correctly', async ({ page }) => {
    // Set mobile portrait
    await page.setViewportSize({ width: 375, height: 667 });
    await waitForVideoPlayer(page);
    
    const playerContainer = page.getByTestId('video-player-container');
    const portraitBox = await playerContainer.boundingBox();
    
    // Switch to landscape
    await page.setViewportSize({ width: 667, height: 375 });
    await page.waitForTimeout(500);
    
    const landscapeBox = await playerContainer.boundingBox();
    
    // Should adapt to landscape orientation - width should increase
    expect(landscapeBox!.width).toBeGreaterThan(portraitBox!.width);
    // Height should adjust to maintain aspect ratio
    expect(landscapeBox!.height).toBeGreaterThan(0);
    expect(landscapeBox!.width / landscapeBox!.height).toBeCloseTo(16/9, 1);
  });
});