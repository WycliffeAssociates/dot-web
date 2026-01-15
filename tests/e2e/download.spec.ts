import { test, expect } from '@playwright/test';
import { waitForVideoPlayer } from '../fixtures/test-helpers';

test.describe.skip('Download Functionality Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForVideoPlayer(page);
  });

  test('download form is accessible', async ({ page }) => {
    const downloadForm = page.locator('[data-testid="download-form"]');
    
    // Wait for form to be available (it might be in a menu or modal)
    await downloadForm.waitFor({ state: 'visible', timeout: 5000 });
    
    // Verify form elements are present
    await expect(page.locator('[data-testid="download-scope-radio-group"]')).toBeVisible();
  });

  test('download scope radio buttons work', async ({ page }) => {
    // Wait for download form to be visible
    await page.locator('[data-testid="download-form"]').waitFor({ state: 'visible', timeout: 5000 });
    
    const radioGroup = page.locator('[data-testid="download-scope-radio-group"]');
    
    // Check initial state
    const chapterOption = page.locator('[data-testid="download-scope-chapter"]');
    const bookOption = page.locator('[data-testid="download-scope-book"]');
    
    await expect(chapterOption).toBeChecked();
    await expect(bookOption).not.toBeChecked();
    
    // Switch to "Whole Book" option
    await bookOption.click();
    await expect(bookOption).toBeChecked();
    await expect(chapterOption).not.toBeChecked();
    
    // Switch back to "Just this video"
    await chapterOption.click();
    await expect(chapterOption).toBeChecked();
    await expect(bookOption).not.toBeChecked();
  });

  test('quality dropdown updates based on scope selection', async ({ page }) => {
    // Wait for download form
    await page.locator('[data-testid="download-form"]').waitFor({ state: 'visible', timeout: 5000 });
    
    // Initially should show single video quality select
    await expect(page.locator('[data-testid="download-quality-single-video"]')).toBeVisible();
    await expect(page.locator('[data-testid="download-quality-whole-book"]')).not.toBeVisible();
    
    // Switch to whole book
    await page.locator('[data-testid="download-scope-book"]').click();
    
    // Should now show whole book quality select
    await expect(page.locator('[data-testid="download-quality-whole-book"]')).toBeVisible();
    await expect(page.locator('[data-testid="download-quality-single-video"]')).not.toBeVisible();
    
    // Switch back to single video
    await page.locator('[data-testid="download-scope-chapter"]').click();
    
    // Should show single video quality select again
    await expect(page.locator('[data-testid="download-quality-single-video"]')).toBeVisible();
    await expect(page.locator('[data-testid="download-quality-whole-book"]')).not.toBeVisible();
  });

  test('quality dropdowns have options', async ({ page }) => {
    await page.locator('[data-testid="download-form"]').waitFor({ state: 'visible', timeout: 5000 });
    
    // Test single video quality dropdown
    const singleVideoSelect = page.locator('[data-testid="download-quality-single-video"]');
    await expect(singleVideoSelect).toBeVisible();
    
    // Open dropdown to check options
    await singleVideoSelect.click();
    await page.waitForTimeout(500);
    
    // Should have quality options (at least one option)
    const options = page.locator('[role="option"]');
    await expect(options.first()).toBeVisible();
    
    // Close dropdown
    await page.keyboard.press('Escape');
    
    // Test whole book quality dropdown
    await page.locator('[data-testid="download-scope-book"]').click();
    
    const wholeBookSelect = page.locator('[data-testid="download-quality-whole-book"]');
    await expect(wholeBookSelect).toBeVisible();
    
    // Open dropdown
    await wholeBookSelect.click();
    await page.waitForTimeout(500);
    
    // Should have book quality options
    const bookOptions = page.locator('[role="option"]');
    await expect(bookOptions.first()).toBeVisible();
  });

  test('download toggle switches work', async ({ page }) => {
    await page.locator('[data-testid="download-form"]').waitFor({ state: 'visible', timeout: 5000 });
    
    // Find toggle switches (they have specific labels)
    const downloadToDeviceToggle = page.getByLabel(' Download To Device');
    const saveOfflineToggle = page.getByLabel('Save offline');
    
    // Check initial state (both might be unchecked by default)
    await expect(downloadToDeviceToggle).toBeVisible();
    await expect(saveOfflineToggle).toBeVisible();
    
    // Test toggling "Download To Device"
    if (await downloadToDeviceToggle.isChecked() === false) {
      await downloadToDeviceToggle.click();
      await expect(downloadToDeviceToggle).toBeChecked();
    } else {
      await downloadToDeviceToggle.click();
      await expect(downloadToDeviceToggle).not.toBeChecked();
    }
    
    // Test toggling "Save offline"
    if (await saveOfflineToggle.isChecked() === false) {
      await saveOfflineToggle.click();
      await expect(saveOfflineToggle).toBeChecked();
    } else {
      await saveOfflineToggle.click();
      await expect(saveOfflineToggle).not.toBeChecked();
    }
  });

  test('download form preserves state across navigation', async ({ page }) => {
    await page.locator('[data-testid="download-form"]').waitFor({ state: 'visible', timeout: 5000 });
    
    // Set some download preferences
    await page.locator('[data-testid="download-scope-book"]').click();
    
    const downloadToDeviceToggle = page.getByLabel(' Download To Device');
    if (await downloadToDeviceToggle.isChecked() === false) {
      await downloadToDeviceToggle.click();
    }
    
    // Navigate to different chapter
    await page.locator('[data-testid="chapter-button-005"]').click();
    await page.waitForTimeout(2000);
    
    // Check if download form still exists and preferences are preserved
    await expect(page.locator('[data-testid="download-scope-book"]')).toBeChecked();
    await expect(downloadToDeviceToggle).toBeChecked();
  });

  test('download form accessibility', async ({ page }) => {
    await page.locator('[data-testid="download-form"]').waitFor({ state: 'visible', timeout: 5000 });
    
    // Check that radio buttons are keyboard accessible
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="download-scope-chapter"]')).toBeFocused();
    
    // Test arrow navigation in radio group
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('[data-testid="download-scope-book"]')).toBeFocused();
    
    // Test Space to select
    await page.keyboard.press('Space');
    await expect(page.locator('[data-testid="download-scope-book"]')).toBeChecked();
    
    // Check that dropdowns are keyboard accessible
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab'); // Navigate to dropdown
    await expect(page.locator('[data-testid="download-quality-whole-book"]')).toBeFocused();
    
    // Test Enter to open
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    
    // Check that options appear
    const options = page.locator('[role="option"]');
    await expect(options.first()).toBeVisible();
  });

  test('download form handles missing video data gracefully', async ({ page }) => {
    // This test ensures the form doesn't break when video data is missing or invalid
    await page.goto('/');
    await waitForVideoPlayer(page);
    
    // Wait for download form
    await page.locator('[data-testid="download-form"]').waitFor({ state: 'visible', timeout: 5000 });
    
    // Try to interact with form elements
    await expect(page.locator('[data-testid="download-scope-radio-group"]')).toBeVisible();
    await expect(page.locator('[data-testid="download-quality-single-video"]')).toBeVisible();
    
    // The form should not throw errors even if video data is incomplete
    await page.locator('[data-testid="download-scope-chapter"]').click();
    await page.locator('[data-testid="download-quality-single-video"]').click();
    
    // Should still be functional
    await expect(page.locator('[data-testid="download-scope-chapter"]')).toBeChecked();
  });
});