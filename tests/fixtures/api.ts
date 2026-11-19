import { test as base, expect } from '@playwright/test';
import { BookFlowApi } from '../support/api-client';
import { authenticatedApi } from './index';

/** Fixtures for API-only specs: no browser is started. */
export const test = base.extend<{
  publicApi: BookFlowApi;
  adminApi: BookFlowApi;
  staffApi: BookFlowApi;
}>({
  publicApi: async ({ request }, use) => use(new BookFlowApi(request)),
  adminApi: async ({ request }, use) => use(await authenticatedApi(request, 'admin')),
  staffApi: async ({ request }, use) => use(await authenticatedApi(request, 'staff')),
});

export { expect };

/** Every error response shares this shape (BookFlow's global exception filter). */
export async function expectError(res: import('@playwright/test').APIResponse, status: number) {
  expect(res.status()).toBe(status);
  const body = await res.json();
  expect(body).toEqual(
    expect.objectContaining({
      statusCode: status,
      error: expect.any(String),
      message: expect.anything(),
      path: expect.stringMatching(/^\//),
      timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    }),
  );
  return body as { message: string | string[] };
}
