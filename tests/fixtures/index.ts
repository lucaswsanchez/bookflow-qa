import { test as base, expect, type APIRequestContext } from '@playwright/test';
import { AdminShell } from '../pages/admin-shell.page';
import { AppointmentsPage } from '../pages/appointments.page';
import { BookingPage } from '../pages/booking.page';
import { LoginPage } from '../pages/login.page';
import { ServicesPage } from '../pages/services.page';
import { BookFlowApi, Booking, Role, Tokens } from '../support/api-client';
import { businessDate } from '../support/dates';
import { env } from '../support/env';
import { checkout, type Lease } from '../support/session-pool';
import { QA_CLIENT } from '../support/test-data';

const REFRESH_KEY = 'bookflow.refreshToken';

/**
 * Turns a leased slot into a fresh token pair. Refresh is not rate limited; a login is only
 * needed when the slot's token was revoked (for example by a logout or an interrupted test).
 */
async function freshTokens(request: APIRequestContext, lease: Lease) {
  const api = new BookFlowApi(request);
  if (lease.refreshToken) {
    const res = await api.post('/auth/refresh', { refreshToken: lease.refreshToken });
    if (res.ok()) return (await res.json()) as Tokens;
  }
  return api.login(env[lease.role].email, env[lease.role].password);
}

/** Gets an authenticated API client from the session pool. */
async function authenticatedApi(request: APIRequestContext, role: Role) {
  const lease = await checkout(role);
  try {
    const tokens = await freshTokens(request, lease);
    lease.release(tokens.refreshToken);
    return new BookFlowApi(request, tokens.accessToken);
  } catch (e) {
    lease.release(null);
    throw e;
  }
}

export interface CreatedBooking extends Booking {
  date: string;
  staffName: string;
  serviceName: string;
}

interface Fixtures {
  /** Log the browser in as this role before the test (via the session pool). */
  role: Role | null;
  _session: void;
  publicApi: BookFlowApi;
  adminApi: BookFlowApi;
  staffApi: BookFlowApi;
  bookings: {
    /** Books the first free slot on (or after) the given day through the public API. */
    create(opts: {
      daysAhead: number;
      staffName?: string;
      serviceName?: string;
    }): Promise<CreatedBooking>;
    /** Registers a booking made through the UI so it gets cancelled after the test. */
    track(code: string, date: string): void;
  };
  bookingPage: BookingPage;
  loginPage: LoginPage;
  shell: AdminShell;
  servicesPage: ServicesPage;
  appointmentsPage: AppointmentsPage;
}

export const test = base.extend<Fixtures>({
  role: [null, { option: true }],

  _session: [
    async ({ page, role, request }, use) => {
      if (!role) return use();
      const lease = await checkout(role);
      let token: string;
      try {
        token = (await freshTokens(request, lease)).refreshToken;
      } catch (e) {
        lease.release(null);
        throw e;
      }
      // Seed the refresh token once per tab; later reloads must keep the rotated token the app stored.
      await page.addInitScript(
        ([key, value]) => {
          if (!sessionStorage.getItem('qa-seeded')) {
            localStorage.setItem(key, value);
            sessionStorage.setItem('qa-seeded', '1');
          }
        },
        [REFRESH_KEY, token],
      );
      try {
        await use();
      } finally {
        // Hand the newest token in the rotation chain back to the pool.
        let newest: string | null = null;
        try {
          if (!page.isClosed() && page.url().startsWith(env.webUrl))
            newest = await page.evaluate((key) => localStorage.getItem(key), REFRESH_KEY);
        } catch {
          newest = null;
        }
        // If the app never loaded, the injected token was not used and is still valid.
        lease.release(newest ?? (page.url().startsWith(env.webUrl) ? null : token));
      }
    },
    { auto: true },
  ],

  publicApi: async ({ request }, use) => use(new BookFlowApi(request)),
  adminApi: async ({ request }, use) => use(await authenticatedApi(request, 'admin')),
  staffApi: async ({ request }, use) => use(await authenticatedApi(request, 'staff')),

  bookings: async ({ publicApi, adminApi }, use) => {
    const created: { code: string; date: string }[] = [];
    await use({
      async create({ daysAhead, staffName = 'Martín Acosta', serviceName = 'Classic Haircut' }) {
        const service = (await publicApi.publicServices()).find((s) => s.name === serviceName);
        const staff = (await publicApi.publicStaff(service?.id)).find((s) => s.name === staffName);
        expect(service && staff, `${serviceName} by ${staffName} exists in the demo`).toBeTruthy();
        for (let d = daysAhead; d < daysAhead + 7; d++) {
          const date = businessDate(d);
          for (const slot of await publicApi.availability(service!.id, staff!.id, date)) {
            const res = await publicApi.post(`/public/businesses/${env.slug}/bookings`, {
              serviceId: service!.id,
              staffId: staff!.id,
              startsAt: slot.start,
              client: QA_CLIENT,
              notes: 'Created by the bookflow-qa automated suite',
            });
            if (res.status() === 409) continue; // taken by a parallel test: try the next slot
            expect(res.status()).toBe(201);
            const booking = (await res.json()) as Booking;
            created.push({ code: booking.code, date });
            return { ...booking, date, staffName, serviceName };
          }
        }
        throw new Error(`No free slot for ${serviceName} with ${staffName}`);
      },
      track(code, date) {
        created.push({ code, date });
      },
    });
    // Cleanup: cancel everything this test booked, so the slot is free again.
    for (const { code, date } of created) {
      const appt = (await adminApi.appointments(date)).find((a) => a.code === code);
      if (appt && appt.status !== 'CANCELLED') await adminApi.setStatus(appt.id, 'CANCELLED');
    }
  },

  bookingPage: async ({ page }, use) => use(new BookingPage(page)),
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  shell: async ({ page }, use) => use(new AdminShell(page)),
  servicesPage: async ({ page }, use) => use(new ServicesPage(page)),
  appointmentsPage: async ({ page }, use) => use(new AppointmentsPage(page)),
});

export { expect };
