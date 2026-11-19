import { expect, expectError, test } from '../fixtures/api';
import type { Booking } from '../support/api-client';
import { businessDate } from '../support/dates';
import { env } from '../support/env';
import { QA_CLIENT } from '../support/test-data';

const PUB = `/public/businesses/${env.slug}`;

test.describe('API: public booking', () => {
  let serviceId: string;
  let staffId: string;

  test.beforeEach(async ({ publicApi }) => {
    serviceId = (await publicApi.publicServices()).find((s) => s.name === 'Classic Haircut')!.id;
    staffId = (await publicApi.publicStaff(serviceId)).find((s) => s.name === 'Diego Ramírez')!.id;
  });

  test('TC-API-07 availability horizon: day 60 is bookable, day 61 is rejected', async ({
    publicApi,
  }) => {
    const q = (days: number) =>
      `${PUB}/availability?serviceId=${serviceId}&staffId=${staffId}&date=${businessDate(days)}`;
    const day60 = await publicApi.get(q(60));
    expect(day60.status()).toBe(200);
    expect(await day60.json()).toEqual(
      expect.objectContaining({ date: businessDate(60), slots: expect.any(Array) }),
    );
    const body = await expectError(await publicApi.get(q(61)), 400);
    expect(body.message).toBe('Bookings can be made up to 60 days in advance');
  });

  test('TC-API-08 booking payload is validated (400) and unknown resources return 404', async ({
    publicApi,
  }) => {
    const valid = {
      serviceId,
      staffId,
      startsAt: '2030-01-01T12:00:00.000Z',
      client: QA_CLIENT,
    };
    const badPhone = await expectError(
      await publicApi.post(`${PUB}/bookings`, { ...valid, client: { ...QA_CLIENT, phone: 'abc' } }),
      400,
    );
    expect(badPhone.message).toContain('client.phone must be a valid phone number');

    const extra = await expectError(
      await publicApi.post(`${PUB}/bookings`, { ...valid, price: 0 }),
      400,
    );
    expect(extra.message).toContain('property price should not exist');

    await expectError(await publicApi.get('/public/businesses/does-not-exist'), 404);
    await expectError(await publicApi.get('/public/bookings/BF-000000'), 404);
  });

  test('TC-API-09 the same slot cannot be booked twice, even by concurrent requests', async ({
    publicApi,
    adminApi,
  }) => {
    // Find a free slot ~30 days ahead and fire two bookings for it at the same time.
    let date = '';
    let start = '';
    for (let d = 30; d < 37 && !start; d++) {
      date = businessDate(d);
      start = (await publicApi.availability(serviceId, staffId, date))[0]?.start ?? '';
    }
    expect(start, 'a free slot exists').not.toBe('');

    const body = { serviceId, staffId, startsAt: start, client: QA_CLIENT };
    const results = await Promise.all([
      publicApi.post(`${PUB}/bookings`, body),
      publicApi.post(`${PUB}/bookings`, body),
    ]);
    const statuses = results.map((r) => r.status()).sort();
    const created = results.find((r) => r.status() === 201);
    try {
      expect(statuses).toEqual([201, 409]);
      const conflict = await results.find((r) => r.status() === 409)!.json();
      expect(conflict.message).toBe('The selected time slot is no longer available');
    } finally {
      // Cleanup: cancel the booking that went through.
      if (created) {
        const { code } = (await created.json()) as Booking;
        const appt = (await adminApi.appointments(date)).find((a) => a.code === code);
        if (appt) await adminApi.setStatus(appt.id, 'CANCELLED');
      }
    }
  });
});

/*
 * Regression checks for defects found during exploratory testing (see docs/bug-reports.md).
 * They are marked with test.fail(): they pass while the bug exists and will turn red once the
 * bug is fixed, as a reminder to remove the annotation.
 */
test.describe('API: known defects', () => {
  test('TC-API-10 impossible calendar dates in /appointments return 400', async ({ adminApi }) => {
    test.info().annotations.push({
      type: 'issue',
      description: 'https://github.com/lucaswsanchez/bookflow/issues/57',
    });
    test.fail(true, 'Known bug lucaswsanchez/bookflow#57: returns 500 instead of 400');
    await expectError(await adminApi.get('/appointments?from=2026-02-30'), 400);
  });

  test('TC-API-11 a service price above the 32-bit integer limit returns 400', async ({
    adminApi,
  }) => {
    test.info().annotations.push({
      type: 'issue',
      description: 'https://github.com/lucaswsanchez/bookflow/issues/58',
    });
    test.fail(true, 'Known bug lucaswsanchez/bookflow#58: returns 500 instead of 400');
    const res = await adminApi.post('/services', {
      name: 'QA Price Overflow',
      durationMinutes: 30,
      price: 2_147_483_648,
      active: false,
    });
    if (res.status() === 201) await adminApi.deleteService((await res.json()).id);
    await expectError(res, 400);
  });
});
