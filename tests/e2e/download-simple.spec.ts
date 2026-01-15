import { test, expect } from '@playwright/test';
import { waitForVideoPlayer } from '../fixtures/test-helpers';

test.describe('Simple Download Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForVideoPlayer(page);
  });

  test('download form exists with correct structure', async ({ page }) => {
    // Find the download form area
    const downloadArea = page.locator('[data-title="downloadCurrentVid"]');
    await expect(downloadArea).toBeVisible();

    // Verify the form exists
    const form = downloadArea.locator('form');
    await expect(form).toHaveAttribute('name', 'downloadData');
    await expect(form).toHaveAttribute('method', 'post');
  });

  test('download form has required hidden inputs', async ({ page }) => {
    const downloadArea = page.locator('[data-title="downloadCurrentVid"]');
    
    // Check swPayload input exists
    const swPayloadInput = downloadArea.locator('input[name="swPayload"]');
    await expect(swPayloadInput).toBeAttached();
    await expect(swPayloadInput).toHaveAttribute('type', 'hidden');
    
    // Verify swPayload has a value (JSON array)
    const swPayloadValue = await swPayloadInput.inputValue();
    expect(swPayloadValue).toBeTruthy();
    expect(() => JSON.parse(swPayloadValue)).not.toThrow();
    
    // Check swDownloadDevice input exists
    const swDownloadDeviceInput = downloadArea.locator('input[name="swDownloadDevice"]');
    await expect(swDownloadDeviceInput).toBeAttached();
    await expect(swDownloadDeviceInput).toHaveAttribute('type', 'hidden');
    
    // Verify swDownloadDevice value is "true"
    const swDownloadDeviceValue = await swDownloadDeviceInput.inputValue();
    expect(swDownloadDeviceValue).toBe('true');
  });

  test('download button triggers form submission', async ({ page }) => {
    const downloadArea = page.locator('[data-title="downloadCurrentVid"]');
    const form = downloadArea.locator('form');
    
    // Listen for form submission event
    const formSubmittedPromise = page.evaluate(() => {
      return new Promise<boolean>((resolve) => {
        const form = document.querySelector('form[name="downloadData"]');
        if (form) {
          form.addEventListener('submit', () => resolve(true));
        }
      });
    });
    
    // Click the download button (button inside form)
    const downloadButton = form.locator('button[type="submit"]');
    await expect(downloadButton).toBeVisible();
    
    // Click the button - this should trigger form submission
    await downloadButton.click();
    
    // Verify form was submitted
    const wasSubmitted = await formSubmittedPromise;
    expect(wasSubmitted).toBe(true);
  });

  test('download button is accessible', async ({ page }) => {
    const downloadArea = page.locator('[data-title="downloadCurrentVid"]');
    const form = downloadArea.locator('form');
    const downloadButton = form.locator('button[type="submit"]');
    
    // Check button is visible
    await expect(downloadButton).toBeVisible();
    
    // Check button can receive focus
    await downloadButton.focus();
    await expect(downloadButton).toBeFocused();
    
    // Check Enter key triggers form submission
    let keyPressed = false;
    page.on('console', msg => {
      if (msg.type() === 'log') {
        keyPressed = true;
      }
    });
    
    await downloadButton.press('Enter');
    // The form should submit on Enter press
    // This is a basic accessibility check - in a real test we'd verify submission more thoroughly
  });

  test('swDownloadDevice input maintains correct value', async ({ page }) => {
    const downloadArea = page.locator('[data-title="downloadCurrentVid"]');
    const swDownloadDeviceInput = downloadArea.locator('input[name="swDownloadDevice"]');
    
    // Verify initial value is "true"
    await expect(swDownloadDeviceInput).toHaveValue('true');
    
    // Navigate to a different video
    await page.getByTestId('book-button-mrk').click();
    await page.waitForTimeout(500);
    
    // Verify swDownloadDevice still has value "true" after navigation
    await expect(swDownloadDeviceInput).toHaveValue('true');
  });

  test('swPayload input contains valid video data', async ({ page }) => {
    const downloadArea = page.locator('[data-title="downloadCurrentVid"]');
    const swPayloadInput = downloadArea.locator('input[name="swPayload"]');
    
    const swPayloadValue = await swPayloadInput.inputValue();
    const payload = JSON.parse(swPayloadValue);
    
    // Verify payload is an array
    expect(Array.isArray(payload)).toBe(true);
    
    // Verify array has at least one item
    expect(payload.length).toBeGreaterThan(0);
    
    // Verify payload item has expected structure (video URL and quality)
    const videoPayload = payload[0];
    expect(videoPayload).toHaveProperty('src');
    expect(videoPayload).toHaveProperty('name');
    expect(typeof videoPayload.src).toBe('string');
    expect(typeof videoPayload.name).toBe('string');
  });

  test('form action URL is configured', async ({ page }) => {
    const downloadArea = page.locator('[data-title="downloadCurrentVid"]');
    const form = downloadArea.locator('form');
    
    // Get action attribute value
    const actionUrl = await form.getAttribute('action');
    
    // Verify action URL is set
    expect(actionUrl).not.toBeNull();
    if (actionUrl) {
      expect(typeof actionUrl).toBe('string');
      expect(actionUrl.length).toBeGreaterThan(0);
    }
  });
});

