import 'server-only';
import { prisma } from '@/lib/db';
import { CALLERS, tokenIsSet } from './callers';
import { usage } from './storage';

/** What the home page shows (owner, 2026-11-11, from the agreed mockup). */
export async function overview() {
  const now = Date.now();
  const week = new Date(now - 7 * 864e5);
  const today = new Date(new Date().setHours(0, 0, 0, 0));
  const live = { deletedAt: null };
  const [files, filesThisWeek, uploadsToday, todayByType, refusedWeek, refusedReasons, byRecord, byVia, uses, store] = await Promise.all([
    prisma.storedFile.count({ where: live }),
    prisma.storedFile.count({ where: { ...live, createdAt: { gte: week } } }),
    prisma.fileEvent.count({ where: { action: 'UPLOADED', createdAt: { gte: today } } }),
    prisma.storedFile.groupBy({ by: ['ownerType'], where: { createdAt: { gte: today } }, _count: { _all: true } }),
    prisma.fileEvent.count({ where: { action: 'REJECTED', createdAt: { gte: week } } }),
    prisma.fileEvent.findMany({ where: { action: 'REJECTED', createdAt: { gte: week } }, select: { detail: true } }),
    prisma.storedFile.groupBy({ by: ['ownerApp', 'ownerType'], where: live, _count: { _all: true }, _sum: { size: true } }),
    prisma.storedFile.groupBy({ by: ['uploadedVia'], where: live, _count: { _all: true } }),
    prisma.callerUse.findMany(),
    usage().catch(() => null),
  ]);
  const tooBig = refusedReasons.filter((r) => /10 MB/.test(r.detail || '')).length;
  return {
    files, filesThisWeek, uploadsToday,
    todayByType: todayByType.map((t) => ({ type: t.ownerType, count: t._count._all })),
    refusedWeek, refusedTooBig: tooBig, refusedFake: refusedWeek - tooBig,
    byRecord: byRecord.map((r) => ({ app: r.ownerApp, type: r.ownerType, count: r._count._all, bytes: r._sum.size || 0 })).sort((a, b) => b.count - a.count),
    byVia: byVia.map((v) => ({ via: v.uploadedVia, count: v._count._all })),
    callers: CALLERS.map((c) => ({ caller: c, set: tokenIsSet(c), lastAt: uses.find((u) => u.caller === c)?.lastAt || null })),
    store,
  };
}

const ACTIONS = ['UPLOADED', 'LINK', 'DELETED', 'REJECTED', 'SHARED', 'UNSHARED'];

/** The latest happenings, newest first, optionally one kind and a search. */
export async function activity({ action, q }: { action?: string; q?: string }) {
  const term = (q || '').trim();
  return prisma.fileEvent.findMany({
    where: {
      ...(action && ACTIONS.includes(action) ? { action } : {}),
      ...(term ? { OR: [
        { byName: { contains: term, mode: 'insensitive' } },
        { detail: { contains: term, mode: 'insensitive' } },
        { file: { name: { contains: term, mode: 'insensitive' } } },
        { file: { ownerLabel: { contains: term, mode: 'insensitive' } } },
      ] } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: { id: true, action: true, byApp: true, byName: true, detail: true, createdAt: true, file: { select: { name: true, ownerApp: true, ownerType: true, ownerId: true, ownerLabel: true } } },
  });
}
