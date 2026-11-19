import { expect, expectError, test } from '../fixtures/api';
import { BookFlowApi, type Appointment } from '../support/api-client';
import { businessDate } from '../support/dates';
import { env } from '../support/env';
import { checkout } from '../support/session-pool';

test.describe('API: authentication and authorization', () => {
  test('TC-API-01 login returns a token pair and the user profile', async ({ publicApi }) => {
    const res = await publicApi.post('/auth/login', env.admin);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      accessToken: expect.stringMatching(/^[\w-]+\.[\w-]+\.[\w-]+$/),
      refreshToken: expect.any(String),
      expiresIn: expect.any(Number),
      user: {
        id: expect.any(String),
        email: env.admin.email,
        name: 'Admin Demo',
        role: 'ADMIN',
        staffId: null,
      },
    });
    expect(body.expiresIn).toBeLessThanOrEqual(3600); // short-lived access token
  });

  test('TC-API-02 wrong password is rejected with 401 and the standard error body', async ({
    publicApi,
  }) => {
    const body = await expectError(
      await publicApi.post('/auth/login', { email: env.admin.email, password: 'WrongPass1!' }),
      401,
    );
    expect(body.message).toBe('Invalid email or password');
  });

  test('TC-API-03 protected endpoints require a valid access token', async ({
    publicApi,
    request,
  }) => {
    await expectError(await publicApi.get('/appointments'), 401);
    const forged = new BookFlowApi(request, 'abc.def.ghi');
    await expectError(await forged.get('/appointments'), 401);
  });

  test('TC-API-04 refresh tokens rotate: a used refresh token cannot be reused', async ({
    request,
  }) => {
    const lease = await checkout('staff');
    const api = new BookFlowApi(request);
    let newest: string | null = null;
    try {
      const first = await api.refresh(lease.refreshToken!);
      newest = first.refreshToken;
      await expectError(await api.post('/auth/refresh', { refreshToken: lease.refreshToken }), 401);
      const second = await api.refresh(first.refreshToken);
      newest = second.refreshToken;
      expect(second.refreshToken).not.toBe(first.refreshToken);
    } finally {
      lease.release(newest);
    }
  });

  test('TC-API-05 STAFF gets 403 on admin-only endpoints', async ({ staffApi }) => {
    await expectError(
      await staffApi.post('/services', { name: 'QA Forbidden', durationMinutes: 30, price: 1 }),
      403,
    );
    await expectError(await staffApi.get('/clients'), 403);
  });

  test("TC-API-06 STAFF cannot read or update another professional's appointment", async ({
    adminApi,
    staffApi,
  }) => {
    const me = await (await staffApi.get('/auth/me')).json();
    // Look for another professional's appointment in the demo data (today first, then the week).
    let other: Appointment | undefined;
    for (let d = 0; d < 7 && !other; d++)
      other = (await adminApi.appointments(businessDate(d))).find((a) => a.staffId !== me.staffId);
    // eslint-disable-next-line playwright/no-skipped-test -- skip only when the demo has no data
    test.skip(!other, 'no appointment of another professional in the next 7 days');

    await expectError(await staffApi.get(`/appointments/${other!.id}`), 404);
    await expectError(
      await staffApi.patch(`/appointments/${other!.id}/status`, { status: 'CANCELLED' }),
      404,
    );
    // The staffId filter is ignored for STAFF users: they always get their own agenda.
    const list = await (
      await staffApi.get(`/appointments?from=${businessDate(0)}&staffId=${other!.staffId}`)
    ).json();
    expect(list.every((a: Appointment) => a.staffId === me.staffId)).toBe(true);
  });
});
