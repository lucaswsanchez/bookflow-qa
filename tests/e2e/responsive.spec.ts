import { expect, test } from '../fixtures';

/** Runs only in the Mobile Chrome project (Pixel 7 viewport, touch). */
test.describe('Responsive layout on a phone', { tag: '@mobile-only' }, () => {
  test('TC-RS-01 booking page fits the screen and shows the compact summary', async ({
    bookingPage,
    page,
  }) => {
    await bookingPage.goto();
    await bookingPage.chooseService('Classic Haircut');
    await expect(bookingPage.mobileSummary).toBeVisible();
    await expect(bookingPage.mobileSummary).toContainText('Classic Haircut');
    await expect(page.getByRole('complementary', { name: 'Your booking' })).toBeHidden();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, 'no horizontal scroll').toBeLessThanOrEqual(0);
  });

  test.describe('admin panel', () => {
    test.use({ role: 'admin' });

    test('TC-RS-02 navigation collapses into a menu button', async ({ shell, page }) => {
      await shell.goto();
      await expect(shell.menuButton).toBeVisible();
      await shell.openNavIfCollapsed();
      await shell.nav('services').click();
      await expect(page).toHaveURL(/\/app\/services$/);
    });
  });
});
