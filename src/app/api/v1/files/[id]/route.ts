import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { callerOf, mayTouch, noteUse, onRecord } from '@/domain/callers';
import { remove } from '@/domain/storage';

/**
 * DELETE /api/v1/files/:id { by, reason } — remove a file. Staff only (owner, 2026-11-11: a client
 * cannot take back a PO once sent), with a reason for the change log.
 */
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const caller = callerOf(req);
  if (!caller) return NextResponse.json({ success: false, error: 'Not authorised' }, { status: 401 });
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { by?: string; reason?: string };
  const by = String(body.by || '').slice(0, 160) || null;
  const reason = String(body.reason || '').trim().slice(0, 500);
  if (!reason) return NextResponse.json({ success: false, error: 'Give a reason' }, { status: 422 });
  await noteUse(caller);
  const file = await prisma.storedFile.findUnique({ where: { id } });
  if (!file || file.deletedAt || !mayTouch(caller, file.ownerApp, file.ownerType) || !onRecord(req, file)) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  // The client removes only what is still waiting in a form they have not sent (owner, 2026-11-13);
  // a sent document stays.
  if (caller === 'PORTAL' && file.ownerType !== 'PENDING') return NextResponse.json({ success: false, error: 'A sent document cannot be removed by the client' }, { status: 403 });
  await remove(file.storageKey).catch((e) => console.error('[files] storage delete failed', file.storageKey, e));
  await prisma.storedFile.update({
    where: { id },
    data: { deletedAt: new Date(), deletedByName: by, events: { create: { action: 'DELETED', byApp: caller, byName: by, detail: reason } } },
  });
  return NextResponse.json({ success: true });
}

/** PATCH /api/v1/files/:id { sharedWithClient, by } — show a staff file to the client, or stop. */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const caller = callerOf(req);
  if (!caller || caller === 'PORTAL') return NextResponse.json({ success: false, error: 'Not authorised' }, { status: 401 });
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { sharedWithClient?: boolean; by?: string };
  if (typeof body.sharedWithClient !== 'boolean') return NextResponse.json({ success: false, error: 'sharedWithClient is required' }, { status: 422 });
  const file = await prisma.storedFile.findUnique({ where: { id } });
  if (!file || file.deletedAt || !mayTouch(caller, file.ownerApp, file.ownerType) || !onRecord(req, file)) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  if (file.uploadedByKind === 'CLIENT') return NextResponse.json({ success: false, error: 'The client\'s own files are always theirs to see' }, { status: 409 });
  await noteUse(caller);
  await prisma.storedFile.update({
    where: { id },
    data: { sharedWithClient: body.sharedWithClient, events: { create: { action: body.sharedWithClient ? 'SHARED' : 'UNSHARED', byApp: caller, byName: String(body.by || '').slice(0, 160) || null } } },
  });
  return NextResponse.json({ success: true });
}
