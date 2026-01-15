import { test, expect, type Page } from '@playwright/test';

// Common test constants
export const TEST_BOOKS = ['MAT', 'MRK', 'LUK', 'JHN'];
export const TEST_CHAPTERS = ['001', '002', '003'];

// Helper functions
export async function waitForVideoPlayer(page: Page) {
  await page.getByTestId('video-player-container').waitFor({ state: 'visible' });
}

export async function navigateToBook(page: Page, book: string) {
  await page.getByTestId(`book-button-${book.toLowerCase()}`).click();
  await waitForVideoPlayer(page);
  // Wait for URL to update
  await page.waitForTimeout(200);
}

export async function navigateToChapter(page: Page, chapter: string) {
  await page.getByTestId(`chapter-button-${chapter}`).click();
  await waitForVideoPlayer(page);
  // Wait for URL to update and component state to reflect
  await page.waitForTimeout(200);
}

export async function toggleTheme(page: Page) {
  await page.getByTestId('header-theme-toggle').click();
  // Wait for theme transition to complete
  await page.waitForTimeout(500);
}

export async function verifyTheme(page: Page, isDark: boolean) {
  const themeToggle = page.getByTestId('header-theme-toggle');
  // Verify theme by checking the aria-pressed attribute of the toggle button
  // When isDark is true, aria-pressed should be "true"
  if (isDark) {
    await expect(themeToggle).toHaveAttribute('aria-pressed', 'true');
  } else {
    await expect(themeToggle).toHaveAttribute('aria-pressed', 'false');
  }
}

export async function openMenu(page: Page) {
  await page.getByTestId('header-menu-toggle').click();
  await page.waitForSelector('[data-testid="header-menu-close"]');
}

export async function closeMenu(page: Page) {
  await page.getByTestId('header-menu-close').click();
  await page.waitForSelector('[data-testid="header-menu-close"]', { state: 'hidden' });
}

export async function waitForVideoLoad(page: Page) {
  // Wait for video player to be ready
  await waitForVideoPlayer(page);
  // Wait a bit for Video.js to initialize
  await page.waitForTimeout(2000);
}

export async function verifyURLPattern(page: Page, expectedPath: string) {
  await expect(page).toHaveURL(new RegExp(`${expectedPath}$`));
}

export async function checkNoConsoleErrors(page: Page) {
  const logs: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      logs.push(msg.text());
    }
  });
  
  // Wait a bit to collect any errors
  await page.waitForTimeout(1000);
  
  if (logs.length > 0) {
    console.error('Console errors found:', logs);
    throw new Error(`Console errors detected: ${logs.join(', ')}`);
  }
}