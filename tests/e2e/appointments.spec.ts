import { expect, test } from '../fixtures';

test.describe('Appointment status (ADMIN)', () => {
  test.use({ role: 'admin' });

  test(
    'TC-AP-01 admin marks an appointment as completed',
    { tag: ['@smoke', '@cross-browser'] },
    async ({ appointmentsPage, bookings, adminApi, page }, testInfo) => {
      // Each browser project uses its own day so parallel runs don't collide.
      const offset =
        { chromium: 24, firefox: 25, 'mobile-chrome': 26 }[testInfo.project.name] ?? 24;
      const booking = await bookings.create({ daysAhead: offset });

      await appointmentsPage.goto();
      await appointmentsPage.showRange(booking.date);
      await appointmentsPage.open(booking.code);
      await expect(appointmentsPage.statusButton('CONFIRMED')).toHaveAttribute(
        'aria-pressed',
        'true',
      );

      await appointmentsPage.setStatus('COMPLETED');
      await expect(appointmentsPage.statusButton('COMPLETED')).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      await expect(page.getByTestId('toast')).toBeVisible();

      // The change is persisted on the server, not only in the UI.
      const saved = (await adminApi.appointments(booking.date)).find(
        (a) => a.code === booking.code,
      );
      expect(saved?.status).toBe('COMPLETED');
    },
  );

  test('TC-AP-02 cancelling an appointment frees its slot for new bookings', async ({
    appointmentsPage,
    bookings,
    publicApi,
  }) => {
    const booking = await bookings.create({ daysAhead: 27 });
    const [service] = (await publicApi.publicServices()).filter(
      (s) => s.name === booking.serviceName,
    );
    const [staff] = (await publicApi.publicStaff(service.id)).filter(
      (s) => s.name === booking.staffName,
    );
    const isFree = async () =>
      (await publicApi.availability(service.id, staff.id, booking.date)).some(
        (s) => s.start === booking.startsAt,
      );
    expect(await isFree()).toBe(false);

    await appointmentsPage.goto();
    await appointmentsPage.showRange(booking.date);
    await appointmentsPage.open(booking.code);
    await appointmentsPage.setStatus('CANCELLED');
    await expect(appointmentsPage.statusButton('CANCELLED')).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await expect.poll(isFree, { message: 'slot is offered again after cancelling' }).toBe(true);
  });

  test('TC-AP-03 status filter only lists appointments with that status', async ({
    appointmentsPage,
  }) => {
    await appointmentsPage.goto();
    await appointmentsPage.period.selectOption('week');
    await appointmentsPage.filterByStatus('COMPLETED');
    await expect(appointmentsPage.rows.first()).toBeVisible();
    const statuses = await appointmentsPage.rows.evaluateAll((rows) =>
      rows.map((r) => r.getAttribute('data-status')),
    );
    expect(new Set(statuses)).toEqual(new Set(['COMPLETED']));
  });
});
