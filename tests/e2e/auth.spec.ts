import { expect, test } from '../fixtures';
import { env } from '../support/env';

/*
 * The API allows 10 login attempts per minute per IP. Only the tests below perform a real login
 * (the rest of the suite reuses pooled sessions) and they run on Chromium only.
 */
test.describe('Authentication', () => {
  test('TC-AU-01 admin logs in with valid credentials and lands on the overview', async ({
    loginPage,
    shell,
    page,
  }) => {
    await loginPage.goto();
    await loginPage.login(env.admin.email, env.admin.password);
    await expect(page).toHaveURL(/\/app$/);
    await expect(shell.userRole).toHaveText(/admin/i);
    await expect(shell.userName).toHaveText('Admin Demo');
  });

  test('TC-AU-02 wrong password shows an error and keeps the user on the login page', async ({
    loginPage,
    page,
  }) => {
    await loginPage.goto();
    await loginPage.login(env.admin.email, 'WrongPassword1!');
    await expect(loginPage.error).toBeVisible();
    await expect(loginPage.error).toContainText(/invalid email or password/i);
    await expect(page).toHaveURL(/\/login/);
  });

  test('TC-AU-03 invalid email format and short password are caught on the client', async ({
    loginPage,
    page,
  }) => {
    let loginRequests = 0;
    page.on('request', (r) => {
      if (r.url().endsWith('/auth/login')) loginRequests++;
    });
    await loginPage.goto();
    await loginPage.login('admin@', '12345'); // 5 chars: just below the 6-char minimum
    await expect(loginPage.fieldError('email')).toHaveText('Enter a valid email');
    await expect(loginPage.fieldError('password')).toHaveText(
      'Password must be at least 6 characters',
    );
    expect(loginRequests, 'invalid input never reaches the API').toBe(0);
  });

  test('TC-AU-04 staff logs in, sees the STAFF role and can log out', async ({
    loginPage,
    shell,
    page,
  }) => {
    await loginPage.goto();
    await loginPage.login(env.staff.email, env.staff.password);
    await expect(shell.userRole).toHaveText(/staff/i);
    await expect(shell.userName).toHaveText('Martín Acosta');

    await shell.logout();
    await expect(page).toHaveURL(/\/login/);
    await page.goto('/app');
    await expect(page).toHaveURL(/\/login/);
  });

  test('TC-AU-05 anonymous visitors are redirected from the admin panel to login', async ({
    page,
    loginPage,
  }) => {
    await page.goto('/app/appointments');
    await expect(page).toHaveURL(/\/login/);
    await expect(loginPage.email).toBeVisible();
  });
});
