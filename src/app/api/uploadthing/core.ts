import { createUploadthing, type FileRouter } from 'uploadthing/next';
import { UploadThingError } from 'uploadthing/server';
import { prisma } from '@/lib/db';
import { ALLOWED_TYPES, MAX_FILES, checkBatch, looksLike } from '@/domain/limits';
import { readPermit } from '@/domain/permits';
import { STORAGE, firstBytes, remove } from '@/domain/storage';

const f = createUploadthing();

// UploadThing takes powers of two; 16 MB here, and the real 10 MB limit is checked in the
// middleware before anything is uploaded.
const each = { maxFileSize: '16MB', maxFileCount: MAX_FILES } as const;

/**
 * One route for every document (owner, 2026-11-11). The browser sends the permit its app's
 * server got from us; the files go straight to storage, private, download only.
 */
export const fileRouter = {
  document: f(
    Object.fromEntries(Object.keys(ALLOWED_TYPES).map((type) => [type, each])) as Record<keyof typeof ALLOWED_TYPES, typeof each>,
    // Download only. Not private: UploadThing's free plan has no private ACL (owner, 2026-11-11);
    // set FILES_PRIVATE=true (and private files on the dashboard) once on a paid plan.
    { awaitServerData: true, contentDisposition: 'attachment', ...(process.env.FILES_PRIVATE === 'true' ? { acl: 'private' } : {}) } as const,
  )
    .middleware(async ({ req, files }) => {
      const permit = await readPermit(req.headers.get('x-conquer-file-permit'));
      if (!permit) throw new UploadThingError({ code: 'FORBIDDEN', message: 'This upload link has expired. Reload the page and try again.' });
      const problems = checkBatch(files);
      if (problems.length) throw new UploadThingError({ code: 'BAD_REQUEST', message: problems.join(' ') });
      return { permit };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      const { permit } = metadata;
      const by = { byApp: permit.via, byName: permit.uploader.name };
      // A renamed file (say, an .exe called .pdf) is deleted again and never listed.
      let genuine = false;
      try {
        genuine = looksLike(file.type, await firstBytes(file.key, file.ufsUrl));
      } catch (error) {
        console.error('[files] could not read the first bytes of', file.key, error);
      }
      if (!genuine) {
        await remove(file.key).catch(() => {});
        await prisma.fileEvent.create({ data: { action: 'REJECTED', detail: `${file.name}: not what its type says${permit.ownerLabel ? ` (${permit.ownerLabel})` : ''}`, ...by } });
        return { fileId: null, rejected: `${file.name} is not a real ${ALLOWED_TYPES[file.type]?.label || 'file'} and was not kept.` };
      }
      const saved = await prisma.storedFile.create({
        data: {
          ownerApp: permit.ownerApp, ownerType: permit.ownerType, ownerId: permit.ownerId, ownerLabel: permit.ownerLabel ?? null,
          // What the client sees (owner, 2026-11-11): their own uploads, and staff files shared with them.
          sharedWithClient: permit.uploader.kind === 'CLIENT' || Boolean(permit.share),
          name: file.name, contentType: file.type, size: file.size,
          storage: STORAGE, storageKey: file.key, url: file.ufsUrl,
          uploadedByKind: permit.uploader.kind, uploadedById: permit.uploader.id, uploadedByName: permit.uploader.name,
          uploadedVia: permit.via,
          events: { create: { action: 'UPLOADED', ...by } },
        },
      });
      return { fileId: saved.id, rejected: null };
    }),
} satisfies FileRouter;

export type ConquerFileRouter = typeof fileRouter;
