import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { callerOf, mayTouch, noteUse } from '@/domain/callers';

/** GET /api/v1/files?ownerApp=CRM&ownerType=PURCHASE_ORDER&ownerId=123 — a record's files, newest first. */
export async function GET(req: Request) {
  const caller = callerOf(req);
  if (!caller) return NextResponse.json({ success: false, error: 'Not authorised' }, { status: 401 });
  const q = new URL(req.url).searchParams;
  const ownerApp = q.get('ownerApp') || '';
  const ownerType = q.get('ownerType') || '';
  const ownerIds = (q.get('ownerId') || '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 200);
  if (!ownerIds.length || !mayTouch(caller, ownerApp, ownerType)) return NextResponse.json({ success: false, error: 'Not allowed for this record' }, { status: 403 });
  await noteUse(caller);
  // forClient=1: only what the client may see (their own uploads and files shared with them).
  const forClient = q.get('forClient') === '1' || caller === 'PORTAL';
  const files = await prisma.storedFile.findMany({
    where: { ownerApp, ownerType, ownerId: { in: ownerIds }, deletedAt: null, ...(forClient ? { sharedWithClient: true } : {}) },
    orderBy: { createdAt: 'desc' },
    select: { id: true, ownerId: true, name: true, contentType: true, size: true, uploadedByKind: true, uploadedByName: true, uploadedVia: true, sharedWithClient: true, createdAt: true },
  });
  return NextResponse.json({ success: true, data: files });
}
