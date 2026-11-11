/**
 * Adds an admin who can sign in to the home page (or resets one's password). The password is
 * given here, never stored in the code, and must be changed at the first sign-in.
 *
 *   ADMIN_EMAIL=admin@conquer.com ADMIN_PASSWORD='…' [ADMIN_NAME='Admin'] npm run admin:create
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/db';

async function main() {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';
  const name = (process.env.ADMIN_NAME || 'Admin').trim();
  if (!email || !password) throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD.');
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.admin.upsert({
    where: { email },
    create: { email, name, passwordHash, mustChangePassword: true },
    update: { passwordHash, mustChangePassword: true, active: true },
  });
  console.log(`Admin ${email} is ready; the password must be changed at the first sign-in.`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e.message); process.exit(1); });
