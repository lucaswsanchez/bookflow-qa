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
 * A browser test checks out a free slot (an atomic mkdir works as a cross-process lock), hands the
 * token to the browser and, on teardown, writes back the newest token from the chain.
 *
 * API clients don't need a slot: access tokens are not rotated, so one short-lived access token per
 * role is shared by every worker (see readAccess/saveAccess). Holding a slot only in browser tests
 * also avoids a deadlock where every test holds a slot and waits for a second one.
 */
export const POOL_DIR = path.join(__dirname, '..', '..', 'playwright', '.auth', 'pool');
export const POOL_SIZE: Record<Role, number> = { admin: 2, staff: 1 };

const tokenFile = (role: Role, slot: number) => path.join(POOL_DIR, `${role}-${slot}.token`);
const lockDir = (role: Role, slot: number) => path.join(POOL_DIR, `${role}-${slot}.lock`);
const accessFile = (role: Role) => path.join(POOL_DIR, `${role}.access.json`);
/** A lock older than this belongs to a crashed worker (tests time out after 60-90 s). */
const STALE_LOCK_MS = 150_000;

export function saveAccess(role: Role, accessToken: string, expiresInSeconds: number) {
  const data = { accessToken, expiresAt: Date.now() + expiresInSeconds * 1000 };
  const tmp = `${accessFile(role)}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data));
  fs.renameSync(tmp, accessFile(role)); // atomic replace: readers never see a partial file
}

/** Shared access token for API clients, or null when missing or about to expire. */
export function readAccess(role: Role): string | null {
  try {
    const { accessToken, expiresAt } = JSON.parse(fs.readFileSync(accessFile(role), 'utf8'));
    return expiresAt - Date.now() > 60_000 ? accessToken : null;
  } catch {
    return null;
  }
}

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
        try {
          if (Date.now() - fs.statSync(lockDir(role, slot)).mtimeMs > STALE_LOCK_MS)
            fs.rmSync(lockDir(role, slot), { recursive: true, force: true });
        } catch {
          // lock released meanwhile
        }
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
