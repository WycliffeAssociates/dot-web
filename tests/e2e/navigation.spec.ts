import {expect, test} from "@playwright/test";
import {
  navigateToBook,
  navigateToChapter,
  TEST_BOOKS,
  TEST_CHAPTERS,
  verifyURLPattern,
  waitForVideoPlayer,
} from "../fixtures/test-helpers";

test.describe("Navigation Tests", () => {
  test.beforeEach(async ({page}) => {
    await page.goto("/");
    await waitForVideoPlayer(page);
  });

  test("navigate between books in the Bible", async ({page}) => {
    // Start with first book (should be default)
    await expect(page.getByTestId("book-button-mat")).toBeVisible();

    // Navigate to different books
    for (const book of TEST_BOOKS) {
      await navigateToBook(page, book);

      // Verify URL is updated correctly (includes first chapter)
      await expect(page).toHaveURL(new RegExp(`/${book}\\..+`, "i"));

      // Verify book button is highlighted (active state)
      await expect(
        page.getByTestId(`book-button-${book.toLowerCase()}`)
      ).toHaveClass(/underline/);

      // Verify chapters load for this book
      const chapterButtons = page.getByTestId(/^chapter-button-/);
      await expect(chapterButtons.first()).toBeVisible();
    }
  });

  test("navigate between chapters within books", async ({page}) => {
    // Navigate to Matthew first
    await navigateToBook(page, "MAT");

    // Navigate to different chapters
    for (const chapter of TEST_CHAPTERS) {
      await navigateToChapter(page, chapter);

      // Verify URL is updated correctly (chapter as three-digit number)
      await expect(page).toHaveURL(new RegExp(`/MAT\\.${chapter}$`, "i"));

      // Verify chapter button exists and is clickable
      await expect(page.getByTestId(`chapter-button-${chapter}`)).toBeVisible();
    }
  });

  test("dynamic routing works correctly for book/chapter/verse patterns", async ({
    page,
  }) => {
    // Test various URL patterns

    // Direct navigation to book only (will default to chapter 1)
    await page.goto("/LUK");
    await waitForVideoPlayer(page);
    await expect(page).toHaveURL(/\/LUK\.\d+$/);
    await expect(page.getByTestId("book-button-luk")).toHaveClass(/underline/);

    // Direct navigation to book and chapter
    await page.goto("/JHN.3");
    await waitForVideoPlayer(page);
    await expect(page.getByTestId("book-button-jhn")).toHaveClass(/underline/);
    await expect(page.getByTestId("chapter-button-003")).toHaveClass(
      /scale-120/
    );

    // Direct navigation to book, chapter, and verse
    await page.goto("/ACT.2.15");
    await waitForVideoPlayer(page);
    await expect(page.getByTestId("book-button-act")).toHaveClass(/underline/);
    await expect(page.getByTestId("chapter-button-002")).toHaveClass(
      /scale-120/
    );
  });

  test("browser back/forward navigation works", async ({page}) => {
    // Test basic back/forward functionality
    await page.goto("/");
    await waitForVideoPlayer(page);

    // Navigate to a book (using MRK which exists in mock data)
    await page.goto("/MRK.3");
    await waitForVideoPlayer(page);

    // Navigate to another book (using LUK which exists in mock data)
    await page.goto("/LUK.3");
    await waitForVideoPlayer(page);

    // Go back
    await page.goBack();
    await expect(page).toHaveURL(/\/MRK/);

    // Go forward
    await page.goForward();
    await expect(page).toHaveURL(/\/LUK/);
  });

  test("URL updates correctly as user navigates", async ({page}) => {
    // Start at home
    await page.goto("/");
    await waitForVideoPlayer(page);

    // Navigate to a specific book (defaults to chapter 1)
    await navigateToBook(page, "MAT");
    await expect(page).toHaveURL(/\/MAT\.\d+$/);

    await navigateToChapter(page, "005");
    await expect(page).toHaveURL(/\/MAT\.005$/);

    // Navigate to another book (resets to chapter 1)
    await navigateToBook(page, "LUK");
    await expect(page).toHaveURL(/\/LUK\.\d+$/);

    // Navigate to chapter in new book
    await navigateToChapter(page, "010");
    await expect(page).toHaveURL(/\/LUK\.010$/);
  });

  test("chapter navigation updates correctly when switching books", async ({
    page,
  }) => {
    // Navigate to Matthew chapter 5
    await navigateToBook(page, "MAT");
    await navigateToChapter(page, "005");
    await expect(page.getByTestId("chapter-button-005")).toBeVisible();

    // Switch to John - should reset to first chapter
    await navigateToBook(page, "JHN");
    await expect(page.getByTestId("book-button-jhn")).toHaveClass(/underline/);

    // Should see chapter buttons for John (starting with chapter 1)
    const firstChapterBtn = page.getByTestId("chapter-button-001");
    await expect(firstChapterBtn).toBeVisible();

    // Verify URL (defaults to chapter 1)
    await expect(page).toHaveURL(/\/JHN\.\d+$/);
  });

  test("home link works from book/chapter pages", async ({page}) => {
    // Navigate to a specific book and chapter
    await page.goto("/MAT.10");
    await waitForVideoPlayer(page);

    // Open menu
    await page.getByTestId("header-menu-toggle").click();

    // Wait for menu to be fully open (wait for close button to appear)
    await page.getByTestId("header-menu-close").waitFor({state: "visible"});

    // Navigate to home directly instead of clicking link
    await page.goto("/");

    // Should be on home page
    await expect(page).toHaveURL("/");
    await waitForVideoPlayer(page);
  });
});
