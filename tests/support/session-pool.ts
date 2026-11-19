import fs from 'node:fs';
import path from 'node:path';
import type { Role } from './api-client';

/**
 * Why a session pool?
 * - The API allows only 10 login attempts per minute per IP, so tests must not log in one by one.
 * - Refresh tokens rotate: once a token is used it is revoked, so a classic shared storageState
 *   file would be invalid after the first test.
 *
 * The auth setup project logs in a few times per role and stores one refresh token per slot.
 * A test checks out a free slot (an atomic mkdir works as a cross-process lock), hands the token
 * to the browser or API client and, on teardown, writes back the newest token from the chain.
 */
export const POOL_DIR = path.join(__dirname, '..', '..', 'playwright', '.auth', 'pool');
export const POOL_SIZE: Record<Role, number> = { admin: 2, staff: 1 };

const tokenFile = (role: Role, slot: number) => path.join(POOL_DIR, `${role}-${slot}.token`);
const lockDir = (role: Role, slot: number) => path.join(POOL_DIR, `${role}-${slot}.lock`);

export function resetPool() {
  fs.rmSync(POOL_DIR, { recursive: true, force: true });
  fs.mkdirSync(POOL_DIR, { recursive: true });
}

export function saveToken(role: Role, slot: number, refreshToken: string | null) {
  if (refreshToken) fs.writeFileSync(tokenFile(role, slot), refreshToken);
  else fs.rmSync(tokenFile(role, slot), { force: true });
}

export interface Lease {
  role: Role;
  slot: number;
  /** null when the slot's token was consumed (e.g. by a logout) and a fresh login is needed. */
  refreshToken: string | null;
  release(newestRefreshToken: string | null): void;
}

export async function checkout(role: Role, timeoutMs = 120_000): Promise<Lease> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    for (let slot = 0; slot < POOL_SIZE[role]; slot++) {
      try {
        fs.mkdirSync(lockDir(role, slot));
      } catch {
        continue; // slot busy
      }
      const file = tokenFile(role, slot);
      return {
        role,
        slot,
        refreshToken: fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null,
        release(newest) {
          saveToken(role, slot, newest);
          fs.rmSync(lockDir(role, slot), { recursive: true, force: true });
        },
      };
    }
    // All slots busy: back off briefly (Node-side polling, not a hard wait inside a test).
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`No free ${role} session in the pool after ${timeoutMs} ms`);
}
