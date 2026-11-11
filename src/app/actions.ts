'use server';

import bcrypt from 'bcryptjs';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { currentAdmin } from '@/lib/auth';
import { createSessionToken, SESSION_COOKIE, SESSION_HOURS } from '@/lib/session';

const text = (form: FormData, key: string) => String(form.get(key) ?? '');

async function cameOverHttps(): Promise<boolean> {
  const h = await headers();
  const proto = h.get('x-forwarded-proto')?.split(',')[0]?.trim();
  if (proto) return proto === 'https';
  return (h.get('origin') ?? '').startsWith('https://');
}

export async function login(form: FormData) {
  const email = text(form, 'email').trim().toLowerCase();
  const password = text(form, 'password');
  const admin = await prisma.admin.findUnique({ where: { email } });
  // Same answer for an unknown email and a wrong password.
  const ok = admin && admin.active && (await bcrypt.compare(password, admin.passwordHash));
  if (!ok) redirect(`/login?err=${encodeURIComponent('Email or password is wrong')}`);
  await prisma.admin.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });
  const store = await cookies();
  store.set(SESSION_COOKIE, await createSessionToken(admin.id), {
    httpOnly: true, sameSite: 'lax', secure: await cameOverHttps(), path: '/', maxAge: SESSION_HOURS * 3600,
  });
  redirect(admin.mustChangePassword ? '/password' : '/');
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect('/login');
}

/** A new password: 10+ characters, letters and a digit, not the one given out. */
export async function changePassword(form: FormData) {
  const admin = await currentAdmin();
  if (!admin) redirect('/login');
  const current = text(form, 'current');
  const next = text(form, 'next');
  const again = text(form, 'again');
  const row = await prisma.admin.findUnique({ where: { id: admin.id } });
  const fail = (msg: string) => redirect(`/password?err=${encodeURIComponent(msg)}`);
  if (!row || !(await bcrypt.compare(current, row.passwordHash))) fail('The current password is wrong.');
  if (next !== again) fail('The new passwords do not match.');
  if (next.length < 10 || !/[A-Za-z]/.test(next) || !/\d/.test(next)) fail('Use at least 10 characters, with letters and a digit.');
  if (await bcrypt.compare(next, row!.passwordHash)) fail('Choose a password different from the current one.');
  await prisma.admin.update({ where: { id: admin.id }, data: { passwordHash: await bcrypt.hash(next, 12), mustChangePassword: false } });
  redirect('/');
}
