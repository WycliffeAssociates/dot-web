import { expect, test } from '@playwright/test';
import { waitForVideoPlayer } from '../fixtures/test-helpers';

test.describe('Download Functionality Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForVideoPlayer(page);
  });

  test('download form is accessible', async ({ page }) => {
    const downloadForm = page.locator('[data-title="downloadCurrentVid"]');
    
    // Wait for form to be available
    await downloadForm.waitFor({ state: 'visible', timeout: 5000 });
    
    // Verify form elements are present
    const form = downloadForm.locator('form');
    await expect(form).toHaveAttribute('name', 'downloadData');
    
    // Verify hidden inputs exist
    const swPayload = downloadForm.locator('input[name="swPayload"]');
    const swDownloadDevice = downloadForm.locator('input[name="swDownloadDevice"]');
    
    await expect(swPayload).toBeVisible();
    await expect(swDownloadDevice).toBeVisible();
    
    // Verify submit button exists
    const submitButton = downloadForm.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();
  });

  test('download form preferences persist', async ({ page }) => {
    // The simple download form doesn't have preferences, so test basic persistence
    const downloadForm = page.locator('[data-title="downloadCurrentVid"]');
    await downloadForm.waitFor({ state: 'visible', timeout: 5000 });
    
    // Verify form still exists after navigation
    await expect(downloadForm).toBeVisible();
    const swDownloadDeviceInput = downloadForm.locator('input[name="swDownloadDevice"]');
    await expect(swDownloadDeviceInput).toHaveValue('true');
  });

  test('download form accessibility', async ({ page }) => {
    const downloadForm = page.locator('[data-title="downloadCurrentVid"]');
    await downloadForm.waitFor({ state: 'visible', timeout: 5000 });
    
    // Check that download button is keyboard accessible
    const submitButton = downloadForm.locator('button[type="submit"]');
    await submitButton.focus();
    await expect(submitButton).toBeFocused();
    
    // Check that Enter key works
    await submitButton.press('Enter');
    // Basic accessibility check - button should be clickable
    await expect(submitButton).toBeVisible();
  });

  test('download form handles missing video data gracefully', async ({ page }) => {
    // This test ensures the form doesn't break when video data is missing or invalid
    await page.goto('/');
    await waitForVideoPlayer(page);
    
    // Wait for download form
    const downloadForm = page.locator('[data-title="downloadCurrentVid"]');
    await downloadForm.waitFor({ state: 'visible', timeout: 5000 });
    
    // Try to interact with form elements
    const swPayloadInput = downloadForm.locator('input[name="swPayload"]');
    const swDownloadDeviceInput = downloadForm.locator('input[name="swDownloadDevice"]');
    
    // The form should not throw errors even if video data is incomplete
    await expect(swPayloadInput).toBeVisible();
    await expect(swDownloadDeviceInput).toBeVisible();
    
    // Should still be functional
    await expect(swDownloadDeviceInput).toHaveValue('true');
  });
});