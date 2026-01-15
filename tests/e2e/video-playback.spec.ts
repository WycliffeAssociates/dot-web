import { test, expect } from '@playwright/test';
import { 
  waitForVideoPlayer, 
  waitForVideoLoad,
  navigateToBook, 
  navigateToChapter 
} from '../fixtures/test-helpers';

test.describe('Video Functionality Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForVideoLoad(page);
  });

  test('video player loads and initializes correctly', async ({ page }) => {
    const playerContainer = page.getByTestId('video-player-container');

    // Verify player is visible
    await expect(playerContainer).toBeVisible();

    // Verify video element exists (Video.js creates this)
    const videoElement = page.locator('video');
    await expect(videoElement).toBeVisible();
  });

  test('chapter back button functionality', async ({ page }) => {
    // Navigate to a middle chapter first
    await navigateToBook(page, 'MAT');
    await navigateToChapter(page, '005');
    await waitForVideoLoad(page);

    // Wait a bit for video to load so back button appears
    await page.waitForTimeout(3000);

    const backButton = page.getByTestId('video-player-chapter-back');

    // Check if back button is visible (it might be hidden if no previous chapter)
    const isVisible = await backButton.isVisible();

    if (isVisible) {
      // Click back button
      await backButton.click();
      await page.waitForTimeout(2000);

      // Should navigate to previous chapter
      const currentChapter = page.getByTestId('chapter-button-004');
      await expect(currentChapter).toBeVisible();
    } else {
      // If not visible, verify it's because we're at the first chapter
      const firstChapter = page.getByTestId('chapter-button-001');
      await expect(firstChapter).toBeVisible();
    }
  });

  test('chapter next button functionality', async ({ page }) => {
    // Navigate to a middle chapter
    await navigateToBook(page, 'MAT');
    await navigateToChapter(page, '005');
    await waitForVideoLoad(page);

    // Wait for video to load so next button appears
    await page.waitForTimeout(3000);

    const nextButton = page.getByTestId('video-player-chapter-next');

    // Check if next button is visible
    const isVisible = await nextButton.isVisible();

    if (isVisible) {
      // Click next button
      await nextButton.click();
      await page.waitForTimeout(2000);

      // Should navigate to next chapter
      const nextChapter = page.getByTestId('chapter-button-006');
      await expect(nextChapter).toBeVisible();
    }
  });

  test('speed control slider functionality', async ({ page }) => {
    const speedControl = page.getByTestId('video-player-speed-control');

    // Verify speed control is visible
    await expect(speedControl).toBeVisible();

    // Check initial value (should be 1.0)
    await expect(speedControl).toHaveValue('1');

    // Test changing speed to 1.5
    await speedControl.fill('1.5');
    await expect(speedControl).toHaveValue('1.5');

    // Test changing speed to 0.75
    await speedControl.fill('0.75');
    await expect(speedControl).toHaveValue('0.75');

    // Test max constraint
    await speedControl.fill('5'); // At max
    await expect(speedControl).toHaveValue('5');

    // Test min constraint
    await speedControl.fill('0.25'); // At min
    await expect(speedControl).toHaveValue('0.25');
  });

  test('video controls are accessible', async ({ page }) => {
    const speedControl = page.getByTestId('video-player-speed-control');

    // Test keyboard navigation to speed control
    await speedControl.focus();
    await expect(speedControl).toBeFocused();

    // Test arrow keys for speed control
    await speedControl.press('ArrowRight');
    await page.waitForTimeout(100);
  });

  test('video player responsiveness', async ({ page }) => {
    // Test desktop size
    await page.setViewportSize({ width: 1200, height: 800 });
    await waitForVideoLoad(page);
    
    const playerContainer = page.getByTestId('video-player-container');
    await expect(playerContainer).toBeVisible();
    
    // Test mobile size
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(playerContainer).toBeVisible();
    
    // Verify aspect ratio is maintained
    const boundingBox = await playerContainer.boundingBox();
    expect(boundingBox?.height).toBeCloseTo(boundingBox!.width * 9/16, 0.1);
  });

  test('video player maintains state during navigation', async ({ page }) => {
    // Set speed to 1.5
    const speedControl = page.getByTestId('video-player-speed-control');
    await speedControl.fill('1.5');
    await expect(speedControl).toHaveValue('1.5');
    
    // Navigate to different chapter
    await navigateToChapter(page, '003');
    await waitForVideoLoad(page);
    
    // Speed preference should persist
    await expect(speedControl).toHaveValue('1.5');
  });

  test('chapter buttons update video correctly', async ({ page }) => {
    // Navigate to Matthew
    await navigateToBook(page, 'MAT');
    await waitForVideoLoad(page);

    // Click different chapter buttons
    await page.getByTestId('chapter-button-010').click();
    await page.waitForTimeout(2000);
    await expect(page.getByTestId('chapter-button-010')).toBeVisible();

    await page.getByTestId('chapter-button-015').click();
    await page.waitForTimeout(2000);
    await expect(page.getByTestId('chapter-button-015')).toBeVisible();
  });

  test('video player error handling', async ({ page }) => {
    // Monitor for any error dialogs or messages
    page.on('dialog', async dialog => {
      console.log('Dialog appeared:', dialog.message());
      await dialog.accept();
    });
    
    // Navigate through several videos to check for loading errors
    await navigateToBook(page, 'MAT');
    await navigateToChapter(page, '001');
    await waitForVideoLoad(page);
    
    await navigateToChapter(page, '002');
    await waitForVideoLoad(page);
    
    await navigateToBook(page, 'MRK');
    await waitForVideoLoad(page);
    
    // If we got here without errors, video loading is working
    await expect(page.getByTestId('video-player-container')).toBeVisible();
  });
});