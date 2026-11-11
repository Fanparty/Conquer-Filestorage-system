import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { callerOf, mayTouch } from '@/domain/callers';
import { downloadLink } from '@/domain/storage';

/**
 * GET /api/v1/files/:id/link?by=<name> — a download link that works for 5 minutes. The calling app
 * has checked that its user may see the record; the browser is sent to the link.
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const caller = callerOf(req);
  if (!caller) return NextResponse.json({ success: false, error: 'Not authorised' }, { status: 401 });
  const { id } = await ctx.params;
  const file = await prisma.storedFile.findUnique({ where: { id } });
  if (!file || file.deletedAt || !mayTouch(caller, file.ownerApp, file.ownerType)) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  const url = await downloadLink(file.storageKey, 300);
  const by = new URL(req.url).searchParams.get('by')?.slice(0, 160) || null;
  await prisma.fileEvent.create({ data: { fileId: file.id, action: 'LINK', byApp: caller, byName: by } });
  return NextResponse.json({ success: true, data: { url, name: file.name, expiresInSeconds: 300 } });
}
