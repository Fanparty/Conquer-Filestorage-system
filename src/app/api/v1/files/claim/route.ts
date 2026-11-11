import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { callerOf, mayTouch, noteUse } from '@/domain/callers';

const schema = z.object({
  pendingId: z.string().min(8).max(64),
  ownerType: z.string().min(1).max(40),
  ownerId: z.string().min(1).max(64),
  ownerLabel: z.string().max(120).nullable().optional(),
  by: z.string().max(160).nullable().optional(),
});

/**
 * POST /api/v1/files/claim — the record a form was for now exists (a PO saved): its files, uploaded
 * under a PENDING reference, move onto it. The CRM only. Answers how many moved.
 */
export async function POST(req: Request) {
  const caller = callerOf(req);
  if (caller !== 'CRM') return NextResponse.json({ success: false, error: 'Not authorised' }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !mayTouch(caller, 'CRM', parsed.data.ownerType)) return NextResponse.json({ success: false, error: 'A pending reference and a record are required' }, { status: 422 });
  const b = parsed.data;
  await noteUse(caller);
  const moved = await prisma.storedFile.updateMany({
    where: { ownerApp: 'CRM', ownerType: 'PENDING', ownerId: b.pendingId, deletedAt: null },
    data: { ownerType: b.ownerType, ownerId: b.ownerId, ownerLabel: b.ownerLabel ?? null },
  });
  return NextResponse.json({ success: true, data: { moved: moved.count } });
}
