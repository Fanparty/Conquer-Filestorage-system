import { SignJWT, jwtVerify } from 'jose';
import { requireEnv } from '@/lib/env';
import type { Caller } from './callers';

/**
 * An upload permit (owner, 2026-11-11): the calling app's server has checked that this person may
 * attach files to this record, and asks for a permit; the browser sends it with the upload. It
 * lasts 10 minutes and says exactly where the files go and who is uploading.
 */
export type Permit = {
  ownerApp: string;
  ownerType: string;
  ownerId: string;
  via: Caller;
  uploader: { kind: 'STAFF' | 'CLIENT'; id: string | null; name: string | null };
};

const key = () => new TextEncoder().encode(requireEnv('FILES_PERMIT_SECRET', 32));
export const PERMIT_MINUTES = 10;

export async function issuePermit(p: Permit): Promise<{ permit: string; expiresAt: string }> {
  const exp = Math.floor(Date.now() / 1000) + PERMIT_MINUTES * 60;
  const permit = await new SignJWT({ p }).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime(exp).setAudience('conquer-files-upload').sign(key());
  return { permit, expiresAt: new Date(exp * 1000).toISOString() };
}

/** The permit's contents, or null if it is missing, forged or expired. */
export async function readPermit(token: string | null | undefined): Promise<Permit | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { audience: 'conquer-files-upload', algorithms: ['HS256'] });
    return (payload as { p?: Permit }).p ?? null;
  } catch {
    return null;
  }
}
