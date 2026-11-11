import { SignJWT, jwtVerify } from 'jose';
import { requireEnv } from './env';

export const SESSION_COOKIE = 'files_session';
export const SESSION_HOURS = 12;

const secret = () => new TextEncoder().encode(requireEnv('FILES_SESSION_SECRET', 32));

export async function createSessionToken(adminId: string): Promise<string> {
  return new SignJWT({}).setProtectedHeader({ alg: 'HS256' }).setSubject(adminId).setIssuedAt().setExpirationTime(`${SESSION_HOURS}h`).sign(secret());
}

export async function readSessionToken(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ['HS256'] });
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}
