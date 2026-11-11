import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { callerOf, mayTouch } from '@/domain/callers';
import { remove } from '@/domain/storage';

/** DELETE /api/v1/files/:id { by } — remove a file (the calling app decides who may). */
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const caller = callerOf(req);
  if (!caller) return NextResponse.json({ success: false, error: 'Not authorised' }, { status: 401 });
  const { id } = await ctx.params;
  const by = String(((await req.json().catch(() => ({}))) as { by?: string }).by || '').slice(0, 160) || null;
  const file = await prisma.storedFile.findUnique({ where: { id } });
  if (!file || file.deletedAt || !mayTouch(caller, file.ownerApp, file.ownerType)) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  await remove(file.storageKey).catch((e) => console.error('[files] storage delete failed', file.storageKey, e));
  await prisma.storedFile.update({
    where: { id },
    data: { deletedAt: new Date(), deletedByName: by, events: { create: { action: 'DELETED', byApp: caller, byName: by } } },
  });
  return NextResponse.json({ success: true });
}
