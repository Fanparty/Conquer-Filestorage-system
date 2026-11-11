import { timingSafeEqual } from 'node:crypto';

/**
 * The apps that call this service, each with its own token (owner, 2026-11-11). An app may only
 * touch records it owns, and the Customer Portal only the CRM records a client attaches files to.
 */
export type Caller = 'CRM' | 'PORTAL' | 'CSP';
export type OwnerApp = 'CRM' | 'CSP';

const TOKEN_ENV: Record<Caller, string> = {
  CRM: 'FILES_TOKEN_CRM',
  PORTAL: 'FILES_TOKEN_PORTAL',
  CSP: 'FILES_TOKEN_CSP',
};

/** Which records each caller may attach to or read: owner app → record types. */
export const ALLOWED: Record<Caller, Partial<Record<OwnerApp, string[]>>> = {
  CRM: { CRM: ['PURCHASE_ORDER', 'CLIENT_REQUEST', 'QUOTATION', 'OPPORTUNITY', 'TICKET'] },
  PORTAL: { CRM: ['PURCHASE_ORDER', 'CLIENT_REQUEST'], CSP: ['TICKET'] },
  CSP: { CSP: ['TICKET'] },
};

export const mayTouch = (caller: Caller, ownerApp: string, ownerType: string) =>
  Boolean(ALLOWED[caller]?.[ownerApp as OwnerApp]?.includes(ownerType));

function same(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    timingSafeEqual(b, b);
    return false;
  }
  return timingSafeEqual(a, b);
}

/** Notes that a caller used its token now (the home page shows when). Never fails a call. */
export async function noteUse(caller: Caller): Promise<void> {
  const { prisma } = await import('@/lib/db');
  await prisma.callerUse.upsert({ where: { caller }, create: { caller, lastAt: new Date() }, update: { lastAt: new Date() } }).catch(() => {});
}

export const CALLERS = Object.keys(TOKEN_ENV) as Caller[];
export const tokenIsSet = (caller: Caller) => (process.env[TOKEN_ENV[caller]] || '').length >= 32;

/** The caller a request's bearer token belongs to, or null. A token not set never matches. */
export function callerOf(req: Request): Caller | null {
  const header = req.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) return null;
  for (const caller of Object.keys(TOKEN_ENV) as Caller[]) {
    const expected = process.env[TOKEN_ENV[caller]];
    if (expected && expected.length >= 32 && same(token, expected)) return caller;
  }
  return null;
}
