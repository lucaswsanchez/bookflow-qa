import { expect, test as setup } from '@playwright/test';
import { BookFlowApi, Role } from '../support/api-client';
import { env } from '../support/env';
import { POOL_SIZE, resetPool, saveToken } from '../support/session-pool';

setup('log in the demo users once and fill the session pool', async ({ request }) => {
  resetPool();
  const api = new BookFlowApi(request);
  for (const role of Object.keys(POOL_SIZE) as Role[]) {
    for (let slot = 0; slot < POOL_SIZE[role]; slot++) {
      const tokens = await api.login(env[role].email, env[role].password);
      expect(tokens.user.role).toBe(role.toUpperCase());
      saveToken(role, slot, tokens.refreshToken);
    }
  }
});
