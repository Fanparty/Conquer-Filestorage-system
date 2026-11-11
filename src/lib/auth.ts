import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from './db';
import { readSessionToken, SESSION_COOKIE } from './session';

export type CurrentAdmin = { id: string; email: string; name: string; mustChangePassword: boolean };

export async function currentAdmin(): Promise<CurrentAdmin | null> {
  const store = await cookies();
  const id = await readSessionToken(store.get(SESSION_COOKIE)?.value);
  if (!id) return null;
  const a = await prisma.admin.findUnique({ where: { id }, select: { id: true, email: true, name: true, active: true, mustChangePassword: true } });
  return a && a.active ? { id: a.id, email: a.email, name: a.name, mustChangePassword: a.mustChangePassword } : null;
}

/** For pages: signed in, and the first password already changed. */
export async function requireAdmin(): Promise<CurrentAdmin> {
  const admin = await currentAdmin();
  if (!admin) redirect('/login');
  if (admin.mustChangePassword) redirect('/password');
  return admin;
}
