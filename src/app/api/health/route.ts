import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/** GET /api/health — up, and the database answers. */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, service: 'conquer-files' });
  } catch {
    return NextResponse.json({ ok: false, service: 'conquer-files' }, { status: 503 });
  }
}
