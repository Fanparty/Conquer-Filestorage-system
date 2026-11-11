import { NextResponse } from 'next/server';
import { z } from 'zod';
import { callerOf, mayTouch } from '@/domain/callers';
import { issuePermit } from '@/domain/permits';
import { MAX_FILE_BYTES, MAX_FILES, TYPE_WORDS } from '@/domain/limits';

const schema = z.object({
  ownerApp: z.enum(['CRM', 'CSP']),
  ownerType: z.string().min(1).max(40),
  ownerId: z.string().min(1).max(64),
  uploader: z.object({ kind: z.enum(['STAFF', 'CLIENT']), id: z.string().max(64).nullable().optional(), name: z.string().max(160).nullable().optional() }),
});

/**
 * POST /api/v1/permits — an app's server asks for an upload permit for one of its records, after
 * checking the person may attach files to it. Answers the permit and the limits to show.
 */
export async function POST(req: Request) {
  const caller = callerOf(req);
  if (!caller) return NextResponse.json({ success: false, error: 'Not authorised' }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Owner and uploader are required' }, { status: 422 });
  const b = parsed.data;
  if (!mayTouch(caller, b.ownerApp, b.ownerType)) return NextResponse.json({ success: false, error: 'Not allowed for this record' }, { status: 403 });
  const { permit, expiresAt } = await issuePermit({
    ownerApp: b.ownerApp, ownerType: b.ownerType, ownerId: b.ownerId, via: caller,
    uploader: { kind: b.uploader.kind, id: b.uploader.id ?? null, name: b.uploader.name ?? null },
  });
  return NextResponse.json({
    success: true,
    data: { permit, expiresAt, limits: { maxBytes: MAX_FILE_BYTES, maxFiles: MAX_FILES, types: TYPE_WORDS } },
  });
}
