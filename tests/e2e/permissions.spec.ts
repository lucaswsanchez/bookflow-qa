import { expect, test } from '../fixtures';
import { ADMIN_ONLY_NAV, SHARED_NAV } from '../pages/admin-shell.page';

test.describe('Role-based access: ADMIN', () => {
  test.use({ role: 'admin' });

  test(
    'TC-RB-01 admin sees every section of the panel',
    { tag: ['@cross-browser'] },
    async ({ shell }) => {
      await shell.goto();
      await shell.openNavIfCollapsed();
      for (const item of [...SHARED_NAV, ...ADMIN_ONLY_NAV])
        await expect(shell.nav(item)).toBeVisible();
    },
  );

  test('TC-RB-02 admin can filter appointments by any professional', async ({
    appointmentsPage,
  }) => {
    await appointmentsPage.goto();
    await expect(appointmentsPage.staffFilter).toBeVisible();
    await expect(appointmentsPage.staffFilter.locator('option')).toHaveCount(4); // "All" + 3 staff
  });
});

test.describe('Role-based access: STAFF', () => {
  test.use({ role: 'staff' });

  test(
    'TC-RB-03 staff only sees the shared sections in the navigation',
    { tag: ['@cross-browser'] },
    async ({ shell }) => {
      await shell.goto();
      await shell.openNavIfCollapsed();
      for (const item of SHARED_NAV) await expect(shell.nav(item)).toBeVisible();
      for (const item of ADMIN_ONLY_NAV) await expect(shell.nav(item)).toHaveCount(0);
    },
  );

  test('TC-RB-04 staff opening an admin-only URL is sent back to the overview', async ({
    page,
    shell,
  }) => {
    for (const path of ['/app/services', '/app/reports', '/app/clients']) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/app$/);
    }
    await expect(shell.userRole).toHaveText(/staff/i);
  });

  test('TC-RB-05 staff only sees their own appointments', async ({
    appointmentsPage,
    bookings,
  }) => {
    // Arrange: one appointment for another professional and one for the logged-in staff member.
    const other = await bookings.create({ daysAhead: 21, staffName: 'Diego Ramírez' });
    const own = await bookings.create({ daysAhead: 21, staffName: 'Martín Acosta' });

    await appointmentsPage.goto();
    await expect(appointmentsPage.staffFilter).toBeHidden();
    await appointmentsPage.showRange(own.date);
    await appointmentsPage.search.fill(own.code);
    await expect(appointmentsPage.rows).toHaveCount(1);
    await appointmentsPage.showRange(other.date);
    await appointmentsPage.search.fill(other.code);
    await expect(appointmentsPage.rows).toHaveCount(0);
  });
});
